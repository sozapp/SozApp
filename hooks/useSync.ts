import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { supabase } from '@/constants/supabase';
import {
  buildFavoriteItemFromVerseId,
  parseFavoritesRaw,
  type FavoriteItem,
} from '@/hooks/useFavorites';

const STORAGE_NOTES = '@soz/notes';
const STORAGE_NOTE_TIMESTAMPS = '@soz/noteTimestamps';
const STORAGE_NOTES_SNAPSHOT = '@soz/notesSyncSnapshot';

const STORAGE_HIGHLIGHTS = '@soz/highlights';
const STORAGE_HIGHLIGHT_TIMESTAMPS = '@soz/highlightTimestamps';
const STORAGE_HIGHLIGHTS_SNAPSHOT = '@soz/highlightsSyncSnapshot';

const STORAGE_FAVORITES = '@soz/favorites';
const STORAGE_FAVORITES_SNAPSHOT = '@soz/favoritesSyncSnapshot';

const UPSERT_CONFLICT = 'user_id,verse_id';

export type TimestampMap = Record<string, string>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function timeOf(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Yeni/silinmiş yerel kayıtlar için zaman damgası haritasını günceller
 * (eksik olanlara "şimdi" atanır, artık var olmayanlar temizlenir). */
function backfillTimestamps(values: Record<string, unknown>, ts: TimestampMap): TimestampMap {
  const next = { ...ts };
  const now = new Date().toISOString();
  for (const id of Object.keys(values)) {
    if (!next[id]) next[id] = now;
  }
  for (const id of Object.keys(next)) {
    if (!(id in values)) delete next[id];
  }
  return next;
}

export type MergePlan = {
  push: string[];
  pull: string[];
  deleteRemote: string[];
  deleteLocal: string[];
};

/**
 * Yerel, uzak ve son başarılı senkronun anlık görüntüsünü (snapshot)
 * karşılaştırarak her kayıt için hangi yönde işlem yapılacağına karar verir.
 *
 * Snapshot olmadan "yerelde yok" durumu hem "hiç senkron olmadı" hem de
 * "daha önce senkron oldu ama sonradan silindi" anlamına gelebilirdi — bu
 * belirsizlik yüzünden silinen not/vurgu/favori bir sonraki senkronda uzaktan
 * geri geliyordu (resurrection). Ayrıca iki tarafta da değişen bir kayıtta
 * her zaman yerel veri kazanıyordu; artık daha yeni zaman damgası kazanıyor.
 */
export function planMerge(localTs: TimestampMap, remoteTs: TimestampMap, snapshot: TimestampMap): MergePlan {
  const plan: MergePlan = { push: [], pull: [], deleteRemote: [], deleteLocal: [] };
  const allIds = new Set([...Object.keys(localTs), ...Object.keys(remoteTs), ...Object.keys(snapshot)]);

  for (const id of allIds) {
    const localHas = id in localTs;
    const remoteHas = id in remoteTs;
    const snapAt = snapshot[id];

    if (localHas && remoteHas) {
      if (timeOf(localTs[id]) > timeOf(remoteTs[id])) plan.push.push(id);
      else if (timeOf(remoteTs[id]) > timeOf(localTs[id])) plan.pull.push(id);
      continue;
    }

    if (localHas && !remoteHas) {
      if (snapAt && timeOf(localTs[id]) <= timeOf(snapAt)) {
        // Uzakta silinmiş, yerelde bu sürümden sonra değişiklik yok → yerelden de sil
        plan.deleteLocal.push(id);
      } else {
        // Yeni kayıt ya da uzaktan silindikten sonra yerelde yeniden düzenlenmiş → gönder
        plan.push.push(id);
      }
      continue;
    }

    if (!localHas && remoteHas) {
      if (snapAt && timeOf(remoteTs[id]) <= timeOf(snapAt)) {
        // Yerelde silinmiş, uzakta bu sürümden sonra değişiklik yok → uzaktan da sil
        plan.deleteRemote.push(id);
      } else {
        // Uzaktan yeni ya da yerel silmeden sonra başka cihazda yeniden oluşturulmuş → al
        plan.pull.push(id);
      }
    }
  }

  return plan;
}

async function resolveUserId(uid?: string): Promise<string | null> {
  if (uid) return uid;
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function useSync() {
  const syncNotes = useCallback(async (userId?: string) => {
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    const uid = await resolveUserId(userId);
    if (!uid) return;

    try {
      const localNotes = await readJson<Record<string, string>>(STORAGE_NOTES, {});
      let localTs = await readJson<TimestampMap>(STORAGE_NOTE_TIMESTAMPS, {});
      localTs = backfillTimestamps(localNotes, localTs);
      const snapshot = await readJson<TimestampMap>(STORAGE_NOTES_SNAPSHOT, {});

      const { data, error } = await supabase
        .from('notes')
        .select('verse_id, text, updated_at')
        .eq('user_id', uid);
      if (error) throw error;

      const remoteRows = new Map<string, { text: string; updated_at: string }>();
      const remoteTs: TimestampMap = {};
      (data ?? []).forEach((row: { verse_id: string; text: string; updated_at: string }) => {
        remoteRows.set(row.verse_id, row);
        remoteTs[row.verse_id] = row.updated_at;
      });

      const plan = planMerge(localTs, remoteTs, snapshot);
      const newSnapshot: TimestampMap = { ...snapshot };

      if (plan.deleteRemote.length > 0) {
        const { error: delErr } = await supabase
          .from('notes')
          .delete()
          .eq('user_id', uid)
          .in('verse_id', plan.deleteRemote);
        if (delErr) {
          console.log('[Sync] notes remote delete error:', delErr.message);
        } else {
          plan.deleteRemote.forEach((id) => delete newSnapshot[id]);
        }
      }

      if (plan.push.length > 0) {
        const rows = plan.push.map((id) => ({
          user_id: uid,
          verse_id: id,
          text: localNotes[id],
          updated_at: localTs[id],
        }));
        const { error: upErr } = await supabase.from('notes').upsert(rows, { onConflict: UPSERT_CONFLICT });
        if (upErr) {
          console.log('[Sync] notes push error:', upErr.message);
        } else {
          plan.push.forEach((id) => (newSnapshot[id] = localTs[id]));
        }
      }

      for (const id of plan.pull) {
        const row = remoteRows.get(id);
        if (!row) continue;
        localNotes[id] = row.text;
        localTs[id] = row.updated_at;
        newSnapshot[id] = row.updated_at;
      }

      for (const id of plan.deleteLocal) {
        delete localNotes[id];
        delete localTs[id];
        delete newSnapshot[id];
      }

      // Zaten iki tarafta da aynı olup hiç işlem gerekmeyen kayıtları da
      // anlık görüntüye yaz — yoksa ileride bu kayıt tek taraflı silindiğinde
      // "hiç görülmemiş" sanılıp yanlışlıkla geri getirilebilir/silinebilir.
      for (const id of Object.keys(remoteTs)) {
        if (id in localTs && !plan.push.includes(id) && !plan.pull.includes(id)) {
          newSnapshot[id] = localTs[id];
        }
      }

      await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(localNotes));
      await AsyncStorage.setItem(STORAGE_NOTE_TIMESTAMPS, JSON.stringify(localTs));
      await AsyncStorage.setItem(STORAGE_NOTES_SNAPSHOT, JSON.stringify(newSnapshot));
    } catch (e) {
      console.log('[Sync] notes error:', e);
    }
  }, []);

  const syncHighlights = useCallback(async (userId?: string) => {
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    const uid = await resolveUserId(userId);
    if (!uid) return;

    try {
      const localHighlights = await readJson<Record<string, string>>(STORAGE_HIGHLIGHTS, {});
      let localTs = await readJson<TimestampMap>(STORAGE_HIGHLIGHT_TIMESTAMPS, {});
      localTs = backfillTimestamps(localHighlights, localTs);
      const snapshot = await readJson<TimestampMap>(STORAGE_HIGHLIGHTS_SNAPSHOT, {});

      const { data, error } = await supabase
        .from('highlights')
        .select('verse_id, color, updated_at')
        .eq('user_id', uid);
      if (error) throw error;

      const remoteRows = new Map<string, { color: string; updated_at: string }>();
      const remoteTs: TimestampMap = {};
      (data ?? []).forEach((row: { verse_id: string; color: string; updated_at: string | null }) => {
        const updatedAt = row.updated_at ?? new Date(0).toISOString();
        remoteRows.set(row.verse_id, { color: row.color, updated_at: updatedAt });
        remoteTs[row.verse_id] = updatedAt;
      });

      const plan = planMerge(localTs, remoteTs, snapshot);
      const newSnapshot: TimestampMap = { ...snapshot };

      if (plan.deleteRemote.length > 0) {
        const { error: delErr } = await supabase
          .from('highlights')
          .delete()
          .eq('user_id', uid)
          .in('verse_id', plan.deleteRemote);
        if (delErr) {
          console.log('[Sync] highlights remote delete error:', delErr.message);
        } else {
          plan.deleteRemote.forEach((id) => delete newSnapshot[id]);
        }
      }

      if (plan.push.length > 0) {
        const rows = plan.push.map((id) => ({
          user_id: uid,
          verse_id: id,
          color: localHighlights[id],
          updated_at: localTs[id],
        }));
        const { error: upErr } = await supabase
          .from('highlights')
          .upsert(rows, { onConflict: UPSERT_CONFLICT });
        if (upErr) {
          console.log('[Sync] highlights push error:', upErr.message);
        } else {
          plan.push.forEach((id) => (newSnapshot[id] = localTs[id]));
        }
      }

      for (const id of plan.pull) {
        const row = remoteRows.get(id);
        if (!row) continue;
        localHighlights[id] = row.color;
        localTs[id] = row.updated_at;
        newSnapshot[id] = row.updated_at;
      }

      for (const id of plan.deleteLocal) {
        delete localHighlights[id];
        delete localTs[id];
        delete newSnapshot[id];
      }

      for (const id of Object.keys(remoteTs)) {
        if (id in localTs && !plan.push.includes(id) && !plan.pull.includes(id)) {
          newSnapshot[id] = localTs[id];
        }
      }

      await AsyncStorage.setItem(STORAGE_HIGHLIGHTS, JSON.stringify(localHighlights));
      await AsyncStorage.setItem(STORAGE_HIGHLIGHT_TIMESTAMPS, JSON.stringify(localTs));
      await AsyncStorage.setItem(STORAGE_HIGHLIGHTS_SNAPSHOT, JSON.stringify(newSnapshot));
    } catch (e) {
      console.log('[Sync] highlights error:', e);
    }
  }, []);

  const syncFavorites = useCallback(async (userId?: string) => {
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    const uid = await resolveUserId(userId);
    if (!uid) return;

    try {
      const localRaw = await AsyncStorage.getItem(STORAGE_FAVORITES);
      const localItems = parseFavoritesRaw(localRaw);
      const byId = new Map<string, FavoriteItem>(localItems.map((item) => [item.id, item]));
      const localTs: TimestampMap = {};
      localItems.forEach((item) => (localTs[item.id] = item.addedAt));
      const snapshot = await readJson<TimestampMap>(STORAGE_FAVORITES_SNAPSHOT, {});

      const { data, error } = await supabase
        .from('favorites')
        .select('verse_id, updated_at')
        .eq('user_id', uid);
      if (error) throw error;

      const remoteTs: TimestampMap = {};
      (data ?? []).forEach((row: { verse_id: string; updated_at: string | null }) => {
        remoteTs[row.verse_id] = row.updated_at ?? new Date(0).toISOString();
      });

      const plan = planMerge(localTs, remoteTs, snapshot);
      const newSnapshot: TimestampMap = { ...snapshot };

      if (plan.deleteRemote.length > 0) {
        const { error: delErr } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', uid)
          .in('verse_id', plan.deleteRemote);
        if (delErr) {
          console.log('[Sync] favorites remote delete error:', delErr.message);
        } else {
          plan.deleteRemote.forEach((id) => delete newSnapshot[id]);
        }
      }

      if (plan.push.length > 0) {
        const rows = plan.push.map((id) => ({
          user_id: uid,
          verse_id: id,
          updated_at: localTs[id],
        }));
        const { error: upErr } = await supabase
          .from('favorites')
          .upsert(rows, { onConflict: UPSERT_CONFLICT });
        if (upErr) {
          console.log('[Sync] favorites push error:', upErr.message);
        } else {
          plan.push.forEach((id) => (newSnapshot[id] = localTs[id]));
        }
      }

      for (const id of plan.pull) {
        const updatedAt = remoteTs[id];
        const built = buildFavoriteItemFromVerseId(id);
        if (!built) continue;
        byId.set(id, { ...built, addedAt: updatedAt });
        newSnapshot[id] = updatedAt;
      }

      for (const id of plan.deleteLocal) {
        byId.delete(id);
        delete newSnapshot[id];
      }

      for (const id of Object.keys(remoteTs)) {
        if (byId.has(id) && !plan.push.includes(id) && !plan.pull.includes(id)) {
          newSnapshot[id] = localTs[id];
        }
      }

      const mergedItems = Array.from(byId.values()).sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );

      await AsyncStorage.setItem(STORAGE_FAVORITES, JSON.stringify(mergedItems));
      await AsyncStorage.setItem(STORAGE_FAVORITES_SNAPSHOT, JSON.stringify(newSnapshot));
    } catch (e) {
      console.log('[Sync] favorites error:', e);
    }
  }, []);

  const syncAll = useCallback(
    async (onComplete?: () => void) => {
      if (!supabase) {
        console.log('Supabase not available, using local storage');
        onComplete?.();
        return;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          onComplete?.();
          return;
        }
        await Promise.all([
          syncNotes(user.id),
          syncHighlights(user.id),
          syncFavorites(user.id),
        ]);
      } catch (e) {
        console.log('[Sync] syncAll error:', e);
      } finally {
        onComplete?.();
      }
    },
    [syncNotes, syncHighlights, syncFavorites]
  );

  return { syncAll, syncNotes, syncHighlights, syncFavorites };
}

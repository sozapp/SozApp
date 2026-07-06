import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { supabase } from '@/constants/supabase';
import {
  buildFavoriteItemFromVerseId,
  parseFavoritesRaw,
  type FavoriteItem,
} from '@/hooks/useFavorites';

const STORAGE_NOTES = '@soz/notes';
const STORAGE_HIGHLIGHTS = '@soz/highlights';
const STORAGE_FAVORITES = '@soz/favorites';

const UPSERT_CONFLICT = 'user_id,verse_id';

export function useSync() {
  const syncNotes = useCallback(async (userId?: string) => {
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    let uid = userId;
    if (uid == null) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
    }
    try {
      const localRaw = await AsyncStorage.getItem(STORAGE_NOTES);
      const localNotes: Record<string, string> = localRaw ? JSON.parse(localRaw) : {};

      const rows = Object.entries(localNotes).map(([verse_id, text]) => ({
        user_id: uid,
        verse_id,
        text,
        updated_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('notes')
          .upsert(rows, { onConflict: UPSERT_CONFLICT });
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('verse_id, text')
        .eq('user_id', uid);

      if (error) throw error;
      const merged: Record<string, string> = {};
      (data ?? []).forEach((row: { verse_id: string; text: string }) => {
        merged[row.verse_id] = row.text;
      });
      await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(merged));
    } catch (e) {
      console.log('[Sync] notes error:', e);
    }
  }, []);

  const syncHighlights = useCallback(async (userId?: string) => {
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    let uid = userId;
    if (uid == null) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
    }
    try {
      const localRaw = await AsyncStorage.getItem(STORAGE_HIGHLIGHTS);
      const localHighlights: Record<string, string> = localRaw ? JSON.parse(localRaw) : {};

      const rows = Object.entries(localHighlights).map(([verse_id, color]) => ({
        user_id: uid,
        verse_id,
        color,
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('highlights')
          .upsert(rows, { onConflict: UPSERT_CONFLICT });
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from('highlights')
        .select('verse_id, color')
        .eq('user_id', uid);

      if (error) throw error;
      const merged: Record<string, string> = {};
      (data ?? []).forEach((row: { verse_id: string; color: string }) => {
        merged[row.verse_id] = row.color;
      });
      await AsyncStorage.setItem(STORAGE_HIGHLIGHTS, JSON.stringify(merged));
    } catch (e) {
      console.log('[Sync] highlights error:', e);
    }
  }, []);

  const syncFavorites = useCallback(async (userId?: string) => {
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    let uid = userId;
    if (uid == null) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
    }
    try {
      const localRaw = await AsyncStorage.getItem(STORAGE_FAVORITES);
      const localItems = parseFavoritesRaw(localRaw);

      await supabase.from('favorites').delete().eq('user_id', uid);

      if (localItems.length > 0) {
        const rows = localItems.map((item) => ({
          user_id: uid,
          verse_id: item.id,
        }));
        const { error } = await supabase.from('favorites').insert(rows);
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('verse_id')
        .eq('user_id', uid);

      if (error) throw error;
      const ids = (data ?? []).map((r: { verse_id: string }) => r.verse_id);
      const byId = new Map<string, FavoriteItem>();
      for (const item of localItems) {
        byId.set(item.id, item);
      }
      const mergedItems: FavoriteItem[] = [];
      for (const verse_id of ids) {
        const existing = byId.get(verse_id);
        if (existing) {
          mergedItems.push(existing);
          continue;
        }
        const built = buildFavoriteItemFromVerseId(verse_id);
        if (built) mergedItems.push(built);
      }
      await AsyncStorage.setItem(STORAGE_FAVORITES, JSON.stringify(mergedItems));
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

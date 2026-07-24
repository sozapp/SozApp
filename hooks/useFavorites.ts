import {
  getVerseRefFromVerseId,
  getVerseTextByVerseId,
  parseVerseIdComponents,
  resolveCanonicalVerseId,
} from '@/constants/bible-index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

const STORAGE_KEY = '@soz/favorites';

export type FavoriteItem = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  ref: string;
  addedAt: string;
};

function sameVerseId(a: string, b: string): boolean {
  const ca = resolveCanonicalVerseId(a) ?? a;
  const cb = resolveCanonicalVerseId(b) ?? b;
  return ca === cb;
}

export function buildFavoriteItemFromVerseId(verseId: string): FavoriteItem | null {
  const c = resolveCanonicalVerseId(verseId) ?? verseId;
  const text = getVerseTextByVerseId(c) ?? '';
  if (!text.trim()) return null;
  const p = parseVerseIdComponents(c);
  if (!p) return null;
  return {
    id: c,
    book: p.book,
    chapter: p.chapter,
    verse: p.verse,
    text: text.trim(),
    ref: getVerseRefFromVerseId(c),
    addedAt: new Date().toISOString(),
  };
}

function itemFromCanonical(
  canonicalId: string,
  verseText: string,
  addedAt: string
): FavoriteItem | null {
  const p = parseVerseIdComponents(canonicalId);
  if (!p) return null;
  return {
    id: canonicalId,
    book: p.book,
    chapter: p.chapter,
    verse: p.verse,
    text: verseText.trim(),
    ref: getVerseRefFromVerseId(canonicalId),
    addedAt,
  };
}

/** AsyncStorage içeriğini FavoriteItem[] olarak okur (string / eski format migrasyonu). */
export function parseFavoritesRaw(raw: string | null): FavoriteItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const byId = new Map<string, FavoriteItem>();

  for (const el of parsed) {
    if (typeof el === 'string') {
      const c = resolveCanonicalVerseId(el) ?? el;
      const text = getVerseTextByVerseId(c) ?? '';
      if (!text.trim()) continue;
      const item = itemFromCanonical(c, text, new Date().toISOString());
      if (item) byId.set(c, item);
      continue;
    }
    if (el && typeof el === 'object') {
      const o = el as Record<string, unknown>;
      const book = typeof o.book === 'string' ? o.book : '';
      const chapter = Number(o.chapter);
      const verse = Number(o.verse ?? o.verseNum);
      let text = typeof o.text === 'string' ? o.text : '';
      const ref = typeof o.ref === 'string' ? o.ref : '';
      const addedAt =
        typeof o.addedAt === 'string' ? o.addedAt : new Date().toISOString();
      let id = typeof o.id === 'string' ? o.id : '';
      if (!id && book && !Number.isNaN(chapter) && !Number.isNaN(verse)) {
        id = `${book}-${chapter}-${verse}`;
      }
      const c = resolveCanonicalVerseId(id) ?? id;
      const p = parseVerseIdComponents(c);
      if (!p) continue;
      if (!text.trim()) {
        text = getVerseTextByVerseId(c) ?? '';
      }
      if (!text.trim()) continue;
      const item: FavoriteItem = {
        id: c,
        book: p.book,
        chapter: p.chapter,
        verse: p.verse,
        text: text.trim(),
        ref: ref || getVerseRefFromVerseId(c),
        addedAt,
      };
      byId.set(c, item);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
}

async function persistFavorites(items: FavoriteItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Nasılsın? sonuç ayetleri — çift ekleme yok; mevcutsa çıkış. */
export async function addMoodVerseToFavorites(verse: {
  ref: string;
  book: string;
  chapter: number;
  verseNum: number;
  text: string;
}): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const list = parseFavoritesRaw(raw);
  const rawId = `${verse.book}-${verse.chapter}-${verse.verseNum}`;
  const id = resolveCanonicalVerseId(rawId) ?? rawId;
  if (list.some((f) => sameVerseId(f.id, id))) return;
  const p = parseVerseIdComponents(id);
  if (!p) return;
  const newFav: FavoriteItem = {
    id,
    book: p.book,
    chapter: p.chapter,
    verse: p.verse,
    text: verse.text.trim(),
    ref: verse.ref,
    addedAt: new Date().toISOString(),
  };
  await persistFavorites([newFav, ...list]);
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const loadFavorites = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setFavorites([]);
        return;
      }
      const valid = parseFavoritesRaw(raw);
      setFavorites(valid);
      const normalized = JSON.stringify(valid);
      if (normalized !== raw) {
        await AsyncStorage.setItem(STORAGE_KEY, normalized);
      }
    } catch (e) {
      console.warn('Load favorites error:', e);
      setFavorites([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites])
  );

  const toggleFavorite = useCallback(
    async (verseId: string, verseText?: string) => {
      const canonical = resolveCanonicalVerseId(verseId) ?? verseId;
      const present = favorites.find((f) => sameVerseId(f.id, canonical));
      if (present) {
        const updated = favorites.filter((f) => !sameVerseId(f.id, canonical));
        setFavorites(updated);
        await persistFavorites(updated);
        return false;
      }
      const text = (verseText ?? getVerseTextByVerseId(canonical) ?? '').trim();
      if (!text) {
        return false;
      }
      const item = itemFromCanonical(canonical, text, new Date().toISOString());
      if (!item) return false;
      const updated = [item, ...favorites.filter((f) => f.id !== item.id)];
      setFavorites(updated);
      await persistFavorites(updated);
      return true;
    },
    [favorites]
  );

  const isFavorite = useCallback(
    (verseId: string) => {
      const canonical = resolveCanonicalVerseId(verseId) ?? verseId;
      return favorites.some((f) => sameVerseId(f.id, canonical));
    },
    [favorites]
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      try {
        const updated = favorites.filter((f) => f.id !== id);
        setFavorites(updated);
        await persistFavorites(updated);
      } catch (e) {
        console.warn('Remove favorite error:', e);
      }
    },
    [favorites]
  );

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    refreshFavorites: loadFavorites,
    removeFavorite,
  };
}

/**
 * Bugünün ay/günüyle eşleşen ve en az ~1 yıl önce eklenmiş favoriler.
 * En son eklenen önce (birden fazla yıl geriye gidebilir).
 */
export function getOnThisDayFavorites(
  favorites: FavoriteItem[],
  now: Date = new Date()
): FavoriteItem[] {
  const month = now.getMonth();
  const day = now.getDate();
  const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  return favorites
    .filter((f) => {
      const added = new Date(f.addedAt);
      if (Number.isNaN(added.getTime())) return false;
      if (added.getMonth() !== month || added.getDate() !== day) return false;
      return nowMs - added.getTime() >= MS_PER_YEAR;
    })
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
}

/** On This Day başlığı için yıl farkı (en az 1). */
export function yearsSinceFavorite(addedAt: string, now: Date = new Date()): number {
  const added = new Date(addedAt);
  if (Number.isNaN(added.getTime())) return 1;
  const years = now.getFullYear() - added.getFullYear();
  return Math.max(1, years);
}

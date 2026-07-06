import AsyncStorage from '@react-native-async-storage/async-storage';
import { newTestament } from './new-testament';

const KEY = '@soz/readHistory';
const MAX_ITEMS = 10;
export const NT_CHAPTER_KEYS_STORAGE = '@soz/readNtChapters';
export const LAST_READ_KEY = '@soz/lastRead';

export type LastReadPayload = {
  book: string;
  chapter: number;
  verse?: number;
  readAt: string;
};

export async function loadLastRead(): Promise<LastReadPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_READ_KEY);
    if (!raw?.trim()) return null;
    const o = JSON.parse(raw) as Partial<LastReadPayload>;
    if (typeof o.book !== 'string' || !o.book.trim()) return null;
    if (typeof o.chapter !== 'number' || !Number.isFinite(o.chapter) || o.chapter < 1) return null;
    const readAt =
      typeof o.readAt === 'string' && o.readAt.trim() ? o.readAt.trim() : new Date().toISOString();
    const verse =
      typeof o.verse === 'number' && Number.isFinite(o.verse) && o.verse >= 1 ? o.verse : undefined;
    return { book: o.book.trim(), chapter: o.chapter, verse, readAt };
  } catch {
    return null;
  }
}

export async function saveLastRead(payload: LastReadPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

const NT_BOOK_IDS = new Set(newTestament.map((b) => b.id));

export function getNewTestamentChapterTotal(): number {
  return newTestament.reduce((sum, b) => sum + b.chapters.length, 0);
}

export async function getNtChaptersReadCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(NT_CHAPTER_KEYS_STORAGE);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

export type ReadHistoryItem = {
  bookId: string;
  bookName: string;
  chapter: number;
  timestamp: number;
};

export async function loadReadHistory(): Promise<ReadHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addToReadHistory(item: ReadHistoryItem): Promise<void> {
  try {
    const list = await loadReadHistory();
    const next = [
      item,
      ...list.filter((x) => !(x.bookId === item.bookId && x.chapter === item.chapter)),
    ].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    if (NT_BOOK_IDS.has(item.bookId)) {
      try {
        const rawNt = await AsyncStorage.getItem(NT_CHAPTER_KEYS_STORAGE);
        const arr = rawNt ? (JSON.parse(rawNt) as string[]) : [];
        const k = `${item.bookId}:${item.chapter}`;
        if (!Array.isArray(arr) || !arr.includes(k)) {
          const nextNt = Array.isArray(arr) ? [...arr, k] : [k];
          await AsyncStorage.setItem(NT_CHAPTER_KEYS_STORAGE, JSON.stringify(nextNt));
        }
      } catch {
        /* ignore */
      }
    }
  } catch (_) {}
}

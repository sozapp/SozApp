import { getBookIdByBookName, getVerseRefFromVerseId } from '@/constants/bible-index';
import { pickRandomExploreVerse } from '@/constants/explore-random-verses';
import type { VerseDeepLinkParams } from '@/constants/share-verse';

export type BibleVersion = 'TR' | 'TR_1878' | 'WEB' | 'KJV';

export const VERSION_LABELS: Record<BibleVersion, string> = {
  TR: 'Türkçe 2001',
  TR_1878: 'Türkçe 1878',
  WEB: 'English (WEB)',
  KJV: 'English (KJV)',
};

export const VERSION_LANG: Record<BibleVersion, 'tr' | 'en'> = {
  TR: 'tr',
  TR_1878: 'tr',
  WEB: 'en',
  KJV: 'en',
};

/** expo-speech locale for the selected Bible version */
export function getTTSLanguage(version: string): string {
  switch (version) {
    case 'TR':
    case 'TR_1878':
    case 'TR2001':
    case 'TR1878':
      return 'tr-TR';
    case 'WEB':
    case 'KJV':
      return 'en-US';
    default:
      return 'tr-TR';
  }
}

export const STORAGE_BIBLE_VERSION = '@soz/bibleVersion';
export const STORAGE_PARALLEL_EN = '@soz/bibleParallelEn';

/** Keşfet / paylaşım için NT havuzundan rastgele ayet (mevcut çeviri metni). */
export function pickRandomVerseForShare(): {
  verseText: string;
  verseRef: string;
  bookId: string;
  chapter: number;
  verse: number;
} | null {
  const v = pickRandomExploreVerse();
  if (!v?.text) return null;
  const bookId = getBookIdByBookName(v.book) ?? '';
  return {
    verseText: v.text,
    verseRef: getVerseRefFromVerseId(v.verseId),
    bookId,
    chapter: v.chapter,
    verse: v.verse,
  };
}

export function deepLinkParamsFromPick(
  r: { bookId: string; chapter: number; verse: number } | null | undefined
): VerseDeepLinkParams | null {
  if (!r?.bookId) return null;
  return { bookId: r.bookId, chapter: r.chapter, verse: r.verse };
}

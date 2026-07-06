import { getVerseRefFromVerseId } from '@/constants/bible-index';
import { pickRandomExploreVerse } from '@/constants/explore-random-verses';

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

export const STORAGE_BIBLE_VERSION = '@soz/bibleVersion';
export const STORAGE_PARALLEL_EN = '@soz/bibleParallelEn';

/** Keşfet / paylaşım için NT havuzundan rastgele ayet (mevcut çeviri metni). */
export function pickRandomVerseForShare(): { verseText: string; verseRef: string } | null {
  const v = pickRandomExploreVerse();
  if (!v?.text) return null;
  return { verseText: v.text, verseRef: getVerseRefFromVerseId(v.verseId) };
}

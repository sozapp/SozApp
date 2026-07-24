/**
 * assets/bible_web.json = BBE (Basic Bible in English), WEB etiketiyle sunulur
 * assets/bible_kjv.json = KJV
 * Format: { books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }
 */

import kjvData from '@/assets/bible_kjv.json';
import webData from '@/assets/bible_web.json';

export type EnglishVerseItem = { number: number; text: string };

type JsonRoot = {
  books: Array<{
    name: string;
    chapters: Array<{
      chapter: number;
      verses: Array<{ verse: number; text: string }>;
    }>;
  }>;
};

let _webRoot: JsonRoot | null = null;
let _kjvRoot: JsonRoot | null = null;

function getRoot(version: 'WEB' | 'KJV'): JsonRoot {
  if (version === 'WEB') {
    if (!_webRoot) _webRoot = webData as JsonRoot;
    return _webRoot;
  }
  if (!_kjvRoot) _kjvRoot = kjvData as JsonRoot;
  return _kjvRoot;
}

export function getEnglishChapterTexts(
  version: 'WEB' | 'KJV',
  englishBookName: string,
  chapterNum: number
): EnglishVerseItem[] {
  try {
    const root = getRoot(version);
    const book = root.books.find((b) => b.name === englishBookName);
    const ch = book?.chapters.find((c) => c.chapter === chapterNum);
    return (ch?.verses ?? []).map((v) => ({
      number: v.verse,
      text: v.text ?? '—',
    }));
  } catch (e) {
    console.warn('getEnglishChapterTexts:', e);
    return [];
  }
}

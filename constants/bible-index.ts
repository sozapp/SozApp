import { newTestament } from './new-testament';
import type { Book } from './new-testament';

export const bookList = newTestament.map((book) => ({
  id: book.id,
  name: book.name,
  shortName: book.shortName,
  chapterCount: book.chapters.length,
}));

/** verseId format: "BookName-Chapter-Verse" e.g. "Yuhanna-3-16" or "1. Korintliler-5-3" */
export function getVerseTextByVerseId(verseId: string): string | null {
  const parts = verseId.split('-');
  if (parts.length < 3) return null;
  const verseNum = parseInt(parts[parts.length - 1], 10);
  const chapterNum = parseInt(parts[parts.length - 2], 10);
  const bookName = parts.slice(0, -2).join('-');
  if (Number.isNaN(verseNum) || Number.isNaN(chapterNum)) return null;
  const book = newTestament.find((b) => b.name === bookName);
  if (!book) return null;
  const chapter = book.chapters.find((c) => c.chapter === chapterNum);
  if (!chapter) return null;
  const verse = chapter.verses.find((v) => v.verse === verseNum);
  return verse?.text ?? null;
}

/** verseId → "Book Chapter:Verse" e.g. "Yuhanna 3:16" */
export function getVerseRefFromVerseId(verseId: string): string {
  const parts = verseId.split('-');
  if (parts.length < 3) return verseId;
  const verseNum = parts[parts.length - 1];
  const chapterNum = parts[parts.length - 2];
  const bookName = parts.slice(0, -2).join('-');
  return `${bookName} ${chapterNum}:${verseNum}`;
}

export function getBookIndex(bookId: string): number {
  return newTestament.findIndex((b) => b.id === bookId);
}

export function getFlatChapterIndex(bookIndex: number, chapterIndexInBook: number): number {
  let idx = 0;
  for (let b = 0; b < bookIndex; b++) idx += newTestament[b].chapters.length;
  return idx + chapterIndexInBook;
}

export function getBookAndChapterFromFlatIndex(flatIndex: number): { bookIndex: number; chapterIndexInBook: number } | null {
  let remaining = flatIndex;
  for (let b = 0; b < newTestament.length; b++) {
    const count = newTestament[b].chapters.length;
    if (remaining < count) return { bookIndex: b, chapterIndexInBook: remaining };
    remaining -= count;
  }
  return null;
}

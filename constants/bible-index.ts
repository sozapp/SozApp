import { newTestament } from './new-testament';
import type { Book, VerseNT } from './new-testament';
import { psalmNumbers } from './psalms';

/** "BookName-ch-v" veya "1. Korintliler-ch-v" → parçalar */
export function parseVerseIdComponents(verseId: string): { book: string; chapter: number; verse: number } | null {
  const parts = verseId.split('-');
  if (parts.length < 3) return null;
  const v = parseInt(parts[parts.length - 1]!, 10);
  const ch = parseInt(parts[parts.length - 2]!, 10);
  const book = parts.slice(0, -2).join('-');
  if (Number.isNaN(v) || Number.isNaN(ch) || !book.trim()) return null;
  return { book: book.trim(), chapter: ch, verse: v };
}

/** AsyncStorage / slug / küçük harf → newTestament kitap adı */
export function resolveBookNameFromVerseIdSegment(segment: string): string | null {
  const s = segment.trim();
  if (!s) return null;
  const exact = newTestament.find((b) => b.name === s);
  if (exact) return exact.name;
  const ci = newTestament.find((b) => b.name.toLowerCase() === s.toLowerCase());
  if (ci) return ci.name;
  const slug = (x: string) => x.toLowerCase().replace(/\s+/g, '-');
  const slugMatch = newTestament.find((b) => slug(b.name) === slug(s));
  if (slugMatch) return slugMatch.name;
  return null;
}

/** Favori / not anahtarı için tek tip verseId (örn. yuhanna-3-16 → Yuhanna-3-16) */
export function resolveCanonicalVerseId(verseId: string): string | null {
  const p = parseVerseIdComponents(verseId);
  if (!p) return null;
  const resolved = resolveBookNameFromVerseIdSegment(p.book);
  if (!resolved) return null;
  return `${resolved}-${p.chapter}-${p.verse}`;
}

export function getBookIdByBookName(bookName: string): string | null {
  const resolved = resolveBookNameFromVerseIdSegment(bookName);
  if (!resolved) return null;
  return newTestament.find((b) => b.name === resolved)?.id ?? null;
}

export const bookList = newTestament.map((book) => ({
  id: book.id,
  name: book.name,
  shortName: book.shortName,
  chapterCount: book.chapters?.length ?? 0,
}));

/** Eski Ahit — Mezmurlar (en çok okunan 20 mezmur) */
export const oldTestamentBooks = [
  {
    id: 'psalms',
    name: 'Mezmurlar',
    shortName: 'Mez',
    chapterCount: psalmNumbers.length,
  },
];

/** Güvenli bölüm ayetleri — verses undefined/boş ise [] döner */
export function getChapterVerses(bookName: string, chapterNum: number): VerseNT[] {
  try {
    const resolved = resolveBookNameFromVerseIdSegment(bookName) ?? bookName;
    const book = newTestament.find((b) => b.name === resolved);
    const chapter = book?.chapters?.find((c) => c.chapter === chapterNum);
    return chapter?.verses ?? [];
  } catch {
    return [];
  }
}

/** verseId format: "BookName-Chapter-Verse" e.g. "Yuhanna-3-16" or "1. Korintliler-5-3" */
export function getVerseTextByVerseId(verseId: string): string | null {
  const p = parseVerseIdComponents(verseId);
  if (!p) return null;
  const bookName = resolveBookNameFromVerseIdSegment(p.book) ?? p.book;
  const verses = getChapterVerses(bookName, p.chapter);
  const verse = verses.find((v) => v.verse === p.verse);
  return verse?.text ?? null;
}

/** verseId → "Book Chapter:Verse" e.g. "Yuhanna 3:16" */
export function getVerseRefFromVerseId(verseId: string): string {
  const p = parseVerseIdComponents(verseId);
  if (!p) return verseId;
  const bn = resolveBookNameFromVerseIdSegment(p.book) ?? p.book;
  return `${bn} ${p.chapter}:${p.verse}`;
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

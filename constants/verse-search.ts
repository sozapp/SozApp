import { bookList } from '@/constants/bible-index';
import { newTestament } from '@/constants/new-testament';

export type VerseSearchResult = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

const DEFAULT_MAX_RESULTS = 50;

/** Türkçe karakter/case-insensitive normalizasyon — arama karşılaştırmaları için. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c');
}

/** Ayet arama sonucundaki kitap adından `/(tabs)/read` route param'ı için bookId çözer. */
export function getBookIdByVerseBookName(bookName: string): string | null {
  return bookList.find((b) => b.name === bookName)?.id ?? null;
}

/**
 * Yeni Ahit'in tamamında ayet METNİNDE arama yapar (normalize edilmiş "includes" eşleşmesi).
 * app/search.tsx ve app/(tabs)/explore.tsx aynı algoritmayı paylaşır — kod tekrarı yok.
 */
export function searchVerseText(
  query: string,
  maxResults: number = DEFAULT_MAX_RESULTS
): VerseSearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const needle = normalize(trimmed);
  const found: VerseSearchResult[] = [];
  for (const book of newTestament) {
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        if (normalize(verse.text).includes(needle)) {
          found.push({
            book: book.name,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
          });
          if (found.length >= maxResults) break;
        }
      }
      if (found.length >= maxResults) break;
    }
    if (found.length >= maxResults) break;
  }
  return found;
}

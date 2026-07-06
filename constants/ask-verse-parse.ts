import { bookList } from '@/constants/bible-index';

/** "Mattaya" vb. → standart kitap adı */
const BOOK_ALIASES: Record<string, string> = {
  mattaya: 'Matta',
  matthew: 'Matta',
  markos: 'Markos',
  mark: 'Markos',
  luka: 'Luka',
  luk: 'Luka',
  yuhanna: 'Yuhanna',
  john: 'Yuhanna',
  romalılar: 'Romalılar',
  rom: 'Romalılar',
  romans: 'Romalılar',
  mezmur: 'Mezmurlar',
  mezmurlar: 'Mezmurlar',
  vahiy: 'Vahiy',
  revelation: 'Vahiy',
  'elç. işl': 'Elçilerin İşleri',
  'elçilerin işleri': 'Elçilerin İşleri',
  işler: 'Elçilerin İşleri',
  acts: 'Elçilerin İşleri',
};

export type VerseRefParsed = { bookId: string; chapter: number; verse: number };

/**
 * Parantez içi veya düz metin: "Yuhanna 3:16" → okuma ekranı
 */
export function parseVerseRefForRead(refInside: string): VerseRefParsed | null {
  try {
    const cleaned = refInside.replace(/[()]/g, '').trim();
    const match = cleaned.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)/);
    if (!match) return null;
    let bookPart = match[1].trim().replace(/\.$/, '');
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    if (Number.isNaN(chapter) || chapter < 1 || Number.isNaN(verse) || verse < 1) return null;

    const alias = BOOK_ALIASES[bookPart.toLowerCase().replace(/\s+/g, ' ')];
    if (alias) bookPart = alias;

    const book = bookList.find(
      (b) =>
        b.name === bookPart ||
        b.shortName === bookPart ||
        bookPart.startsWith(b.shortName) ||
        b.name.startsWith(bookPart) ||
        bookPart.startsWith(b.name.slice(0, 4))
    );
    if (!book) return null;
    if (chapter > book.chapterCount) return null;
    return { bookId: book.id, chapter, verse };
  } catch {
    return null;
  }
}

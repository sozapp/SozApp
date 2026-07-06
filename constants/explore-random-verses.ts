import { getVerseTextByVerseId } from '@/constants/bible-index';

/** Yeni Ahit — tam metin getVerseTextByVerseId ile çözülen referanslar */
const REFS: readonly [string, number, number][] = [
  ['Yuhanna', 3, 16],
  ['Yuhanna', 14, 6],
  ['Yuhanna', 1, 1],
  ['Matta', 11, 28],
  ['Matta', 5, 9],
  ['Matta', 5, 14],
  ['Matta', 6, 33],
  ['Matta', 22, 37],
  ['Markos', 10, 45],
  ['Markos', 12, 30],
  ['Luka', 6, 31],
  ['Luka', 15, 7],
  ['Romalılar', 8, 28],
  ['Romalılar', 12, 12],
  ['Romalılar', 15, 13],
  ['Elçilerin İşleri', 4, 12],
  ['Elçilerin İşleri', 16, 31],
  ['Filipililere', 4, 13],
  ['Galatyalılar', 5, 22],
  ['Efesliler', 2, 8],
  ['Koloseliler', 3, 14],
  ['1. Korintliler', 13, 4],
  ['2. Korintliler', 5, 17],
  ['İbraniler', 11, 1],
  ['Yakup', 1, 2],
  ['1. Petrus', 5, 7],
  ['Vahiy', 3, 20],
  ['Vahiy', 21, 4],
];

export type ExploreRandomVerse = {
  verseId: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

export function pickRandomExploreVerse(): ExploreRandomVerse | null {
  try {
    for (let k = 0; k < 12; k++) {
      const [book, chapter, verse] = REFS[Math.floor(Math.random() * REFS.length)]!;
      const verseId = `${book}-${chapter}-${verse}`;
      const text = getVerseTextByVerseId(verseId);
      if (text && text.length > 2) {
        return { verseId, book, chapter, verse, text };
      }
    }
    return null;
  } catch {
    return null;
  }
}

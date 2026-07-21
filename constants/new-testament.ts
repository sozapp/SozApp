/**
 * Yeni Ahit — Türkçe Kutsal Kitap 2001 / Yeni Çeviri
 * Tüm kitaplar tam metin — istisnalar: Elçilerin İşleri 7-28 ve Romalılar 7-16
 * henüz eklenmedi (bkz. acts-data.ts / romans-data.ts).
 */

import { johnChapters } from './bible';
import { ACTS_CHAPTER_VERSES } from './acts-data';
import { ROMANS_CHAPTER_VERSES } from './romans-data';
import { CORINTHIANS1_CHAPTER_VERSES } from './corinthians1-data';
import { CORINTHIANS2_CHAPTER_VERSES } from './corinthians2-data';
import { GALATIANS_CHAPTER_VERSES } from './galatians-data';
import { EPHESIANS_CHAPTER_VERSES } from './ephesians-data';
import { PHILIPPIANS_CHAPTER_VERSES } from './philippians-data';
import { COLOSSIANS_CHAPTER_VERSES } from './colossians-data';
import { PHILEMON_CHAPTER_VERSES } from './philemon-data';
import { TITUS_CHAPTER_VERSES } from './titus-data';
import { THESSALONIANS1_CHAPTER_VERSES } from './thessalonians1-data';
import { THESSALONIANS2_CHAPTER_VERSES } from './thessalonians2-data';
import { TIMOTHY1_CHAPTER_VERSES } from './timothy1-data';
import { TIMOTHY2_CHAPTER_VERSES } from './timothy2-data';
import { HEBREWS_CHAPTER_VERSES } from './hebrews-data';
import { JAMES_CHAPTER_VERSES } from './james-data';
import { PETER1_CHAPTER_VERSES } from './peter1-data';
import { PETER2_CHAPTER_VERSES } from './peter2-data';
import { JOHN1_CHAPTER_VERSES } from './john1-data';
import { JOHN2_CHAPTER_VERSES } from './john2-data';
import { JOHN3_CHAPTER_VERSES } from './john3-data';
import { JUDE_CHAPTER_VERSES } from './jude-data';
import { REVELATION_CHAPTER_VERSES } from './revelation-data';
import { LUKE_CHAPTER_VERSES } from './luka-data';
import { MATTHEW_CHAPTER_VERSES } from './matthew-data';
import { MARK_CHAPTER_VERSES } from './mark-data';

export type VerseNT = {
  id: string;
  book: string;
  bookShort: string;
  chapter: number;
  verse: number;
  text: string;
};

export type ChapterNT = {
  book: string;
  chapter: number;
  verses: VerseNT[];
};

export type Book = {
  id: string;
  name: string;
  shortName: string;
  testament: 'new';
  chapters: ChapterNT[];
};

function createVerse(
  bookId: string,
  bookName: string,
  bookShort: string,
  chapter: number,
  verse: number,
  text: string
): VerseNT {
  return {
    id: `${bookId}-${chapter}-${verse}`,
    book: bookName,
    bookShort,
    chapter,
    verse,
    text,
  };
}

// Yuhanna — mevcut bible.ts verisinden
const johnBook: Book = {
  id: 'joh',
  name: 'Yuhanna',
  shortName: 'Yuh',
  testament: 'new',
  chapters: johnChapters.map((ch) => ({
    book: 'Yuhanna',
    chapter: ch.chapterNumber,
    verses: (ch.verses ?? []).map((v) =>
      createVerse('joh', 'Yuhanna', 'Yuh', ch.chapterNumber, v.number, v.text ?? '—')
    ),
  })),
};

// Bölüm başına ayet sayıları (standart Yeni Ahit)
const MATTHEW_VERSES = [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20];
const MARK_VERSES = [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20];
const LUKE_VERSES = [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53];
const ACTS_VERSES = [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31];
const ROMANS_VERSES = [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27];
const CORINTHIANS1_VERSES = [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24];
const CORINTHIANS2_VERSES = [24,17,18,18,21,18,16,24,15,18,33,21,14];
const GALATIANS_VERSES = [24,21,29,31,26,18];
const EPHESIANS_VERSES = [23,22,21,32,33,24];
const PHILIPPIANS_VERSES = [30,30,21,23];
const COLOSSIANS_VERSES = [29,23,25,18];
const THESSALONIANS1_VERSES = [10,20,13,18,28];
const THESSALONIANS2_VERSES = [12,17,18];
const TIMOTHY1_VERSES = [20,15,16,16,25,21];
const TIMOTHY2_VERSES = [18,26,17,22];
const TITUS_VERSES = [16,15,15];
const PHILEMON_VERSES = [25];
const HEBREWS_VERSES = [14,18,19,16,14,20,28,13,28,39,40,29,25];
const JAMES_VERSES = [27,26,18,17,20];
const PETER1_VERSES = [25,25,22,19,14];
const PETER2_VERSES = [21,22,18];
const JOHN1_VERSES = [10,29,24,21,21];
const JOHN2_VERSES = [13];
const JOHN3_VERSES = [15];
const JUDE_VERSES = [25];
const REVELATION_VERSES = [20,29,22,11,14,17,17,13,21,11,19,18,18,20,8,21,18,24,21,15,27,21];

export const matthew: Book = {
  id: 'mat',
  name: 'Matta',
  shortName: 'Mat',
  testament: 'new',
  chapters: MATTHEW_CHAPTER_VERSES.map((verseTexts, i) => {
    const ch = i + 1;
    return {
      book: 'Matta',
      chapter: ch,
      verses: verseTexts.map((text, j) =>
        createVerse('mat', 'Matta', 'Mat', ch, j + 1, text)
      ),
    };
  }),
};
export const mark: Book = {
  id: 'mar',
  name: 'Markos',
  shortName: 'Mar',
  testament: 'new',
  chapters: MARK_CHAPTER_VERSES.map((verseTexts, i) => {
    const ch = i + 1;
    return {
      book: 'Markos',
      chapter: ch,
      verses: verseTexts.map((text, j) =>
        createVerse('mar', 'Markos', 'Mar', ch, j + 1, text)
      ),
    };
  }),
};
export const luke: Book = {
  id: 'luk',
  name: 'Luka',
  shortName: 'Luk',
  testament: 'new',
  chapters: LUKE_CHAPTER_VERSES.map((verseTexts, i) => {
    const ch = i + 1;
    const texts = Array.isArray(verseTexts) ? verseTexts : [];
    return {
      book: 'Luka',
      chapter: ch,
      verses: texts.map((text, j) =>
        createVerse('luk', 'Luka', 'Luk', ch, j + 1, text ?? '—')
      ),
    };
  }),
};
export const john = johnBook;
export const acts: Book = {
  id: 'act',
  name: 'Elçilerin İşleri',
  shortName: 'Elç',
  testament: 'new',
  chapters: ACTS_CHAPTER_VERSES.map((verseTexts, i) => {
    const ch = i + 1;
    const texts = Array.isArray(verseTexts) ? verseTexts : [];
    return {
      book: 'Elçilerin İşleri',
      chapter: ch,
      verses: texts.map((text, j) =>
        createVerse('act', 'Elçilerin İşleri', 'Elç', ch, j + 1, text ?? '—')
      ),
    };
  }),
};
function bookFromChapterVerses(
  id: string,
  name: string,
  shortName: string,
  chapterVerses: string[][]
): Book {
  return {
    id,
    name,
    shortName,
    testament: 'new',
    chapters: chapterVerses.map((verseTexts, i) => {
      const ch = i + 1;
      const texts = Array.isArray(verseTexts) ? verseTexts : [];
      return {
        book: name,
        chapter: ch,
        verses: texts.map((text, j) =>
          createVerse(id, name, shortName, ch, j + 1, text ?? '—')
        ),
      };
    }),
  };
}

export const romans = bookFromChapterVerses('rom', 'Romalılar', 'Rom', ROMANS_CHAPTER_VERSES);
export const corinthians1 = bookFromChapterVerses('1co', '1. Korintliler', '1Ko', CORINTHIANS1_CHAPTER_VERSES);
export const corinthians2 = bookFromChapterVerses('2co', '2. Korintliler', '2Ko', CORINTHIANS2_CHAPTER_VERSES);
export const galatians = bookFromChapterVerses('gal', 'Galatyalılar', 'Gal', GALATIANS_CHAPTER_VERSES);
export const ephesians = bookFromChapterVerses('eph', 'Efesliler', 'Ef', EPHESIANS_CHAPTER_VERSES);
export const philippians = bookFromChapterVerses('php', 'Filipililere', 'Flp', PHILIPPIANS_CHAPTER_VERSES);
export const colossians = bookFromChapterVerses('col', 'Koloseliler', 'Kol', COLOSSIANS_CHAPTER_VERSES);
export const thessalonians1 = bookFromChapterVerses('1th', '1. Selanikliler', '1Se', THESSALONIANS1_CHAPTER_VERSES);
export const thessalonians2 = bookFromChapterVerses('2th', '2. Selanikliler', '2Se', THESSALONIANS2_CHAPTER_VERSES);
export const timothy1 = bookFromChapterVerses('1ti', '1. Timoteos', '1Ti', TIMOTHY1_CHAPTER_VERSES);
export const timothy2 = bookFromChapterVerses('2ti', '2. Timoteos', '2Ti', TIMOTHY2_CHAPTER_VERSES);
export const titus = bookFromChapterVerses('tit', 'Titus', 'Tit', TITUS_CHAPTER_VERSES);
export const philemon = bookFromChapterVerses('phm', 'Filimon', 'Flm', PHILEMON_CHAPTER_VERSES);
export const hebrews = bookFromChapterVerses('heb', 'İbraniler', 'İbr', HEBREWS_CHAPTER_VERSES);
export const james = bookFromChapterVerses('jam', 'Yakup', 'Yak', JAMES_CHAPTER_VERSES);
export const peter1 = bookFromChapterVerses('1pe', '1. Petrus', '1Pe', PETER1_CHAPTER_VERSES);
export const peter2 = bookFromChapterVerses('2pe', '2. Petrus', '2Pe', PETER2_CHAPTER_VERSES);
export const john1 = bookFromChapterVerses('1jn', '1. Yuhanna', '1Yu', JOHN1_CHAPTER_VERSES);
export const john2 = bookFromChapterVerses('2jn', '2. Yuhanna', '2Yu', JOHN2_CHAPTER_VERSES);
export const john3 = bookFromChapterVerses('3jn', '3. Yuhanna', '3Yu', JOHN3_CHAPTER_VERSES);
export const jude = bookFromChapterVerses('jud', 'Yahuda', 'Yah', JUDE_CHAPTER_VERSES);
export const revelation = bookFromChapterVerses('rev', 'Vahiy', 'Vah', REVELATION_CHAPTER_VERSES);

export const newTestament: Book[] = [
  matthew,
  mark,
  luke,
  john,
  acts,
  romans,
  corinthians1,
  corinthians2,
  galatians,
  ephesians,
  philippians,
  colossians,
  thessalonians1,
  thessalonians2,
  timothy1,
  timothy2,
  titus,
  philemon,
  hebrews,
  james,
  peter1,
  peter2,
  john1,
  john2,
  john3,
  jude,
  revelation,
];

/**
 * Yeni Ahit — Türkçe Kutsal Kitap 2001
 * Yuhanna mevcut bible.ts'den; diğer kitaplar bölüm/ayet sayılarıyla placeholder.
 * Gerçek metin için lisanslı çeviri eklenebilir.
 */

import { johnChapters } from './bible';

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

function createPlaceholderBook(
  id: string,
  name: string,
  shortName: string,
  verseCounts: number[]
): Book {
  const chapters: ChapterNT[] = verseCounts.map((count, i) => {
    const ch = i + 1;
    const verses: VerseNT[] = [];
    for (let v = 1; v <= count; v++) {
      verses.push(
        createVerse(id, name, shortName, ch, v, `[${name} ${ch}:${v}]`)
      );
    }
    return { book: name, chapter: ch, verses };
  });
  return { id, name, shortName, testament: 'new', chapters };
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
    verses: ch.verses.map((v) =>
      createVerse('joh', 'Yuhanna', 'Yuh', ch.chapterNumber, v.number, v.text)
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

export const matthew = createPlaceholderBook('mat', 'Matta', 'Mat', MATTHEW_VERSES);
export const mark = createPlaceholderBook('mar', 'Markos', 'Mar', MARK_VERSES);
export const luke = createPlaceholderBook('luk', 'Luka', 'Luk', LUKE_VERSES);
export const john = johnBook;
export const acts = createPlaceholderBook('act', 'Elçilerin İşleri', 'Elç', ACTS_VERSES);
export const romans = createPlaceholderBook('rom', 'Romalılar', 'Rom', ROMANS_VERSES);
export const corinthians1 = createPlaceholderBook('1co', '1. Korintliler', '1Ko', CORINTHIANS1_VERSES);
export const corinthians2 = createPlaceholderBook('2co', '2. Korintliler', '2Ko', CORINTHIANS2_VERSES);
export const galatians = createPlaceholderBook('gal', 'Galatyalılar', 'Gal', GALATIANS_VERSES);
export const ephesians = createPlaceholderBook('eph', 'Efesliler', 'Ef', EPHESIANS_VERSES);
export const philippians = createPlaceholderBook('php', 'Filipililere', 'Flp', PHILIPPIANS_VERSES);
export const colossians = createPlaceholderBook('col', 'Koloseliler', 'Kol', COLOSSIANS_VERSES);
export const thessalonians1 = createPlaceholderBook('1th', '1. Selanikliler', '1Se', THESSALONIANS1_VERSES);
export const thessalonians2 = createPlaceholderBook('2th', '2. Selanikliler', '2Se', THESSALONIANS2_VERSES);
export const timothy1 = createPlaceholderBook('1ti', '1. Timoteos', '1Ti', TIMOTHY1_VERSES);
export const timothy2 = createPlaceholderBook('2ti', '2. Timoteos', '2Ti', TIMOTHY2_VERSES);
export const titus = createPlaceholderBook('tit', 'Titus', 'Tit', TITUS_VERSES);
export const philemon = createPlaceholderBook('phm', 'Filimon', 'Flm', PHILEMON_VERSES);
export const hebrews = createPlaceholderBook('heb', 'İbraniler', 'İbr', HEBREWS_VERSES);
export const james = createPlaceholderBook('jam', 'Yakup', 'Yak', JAMES_VERSES);
export const peter1 = createPlaceholderBook('1pe', '1. Petrus', '1Pe', PETER1_VERSES);
export const peter2 = createPlaceholderBook('2pe', '2. Petrus', '2Pe', PETER2_VERSES);
export const john1 = createPlaceholderBook('1jn', '1. Yuhanna', '1Yu', JOHN1_VERSES);
export const john2 = createPlaceholderBook('2jn', '2. Yuhanna', '2Yu', JOHN2_VERSES);
export const john3 = createPlaceholderBook('3jn', '3. Yuhanna', '3Yu', JOHN3_VERSES);
export const jude = createPlaceholderBook('jud', 'Yahuda', 'Yah', JUDE_VERSES);
export const revelation = createPlaceholderBook('rev', 'Vahiy', 'Vah', REVELATION_VERSES);

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

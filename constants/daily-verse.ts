import { bookList, oldTestamentBooks } from '@/constants/bible-index';

export type DailyVerse = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

export const DAILY_VERSES: DailyVerse[] = [
  { book: 'Yuhanna', chapter: 3, verse: 16, text: 'Çünkü Tanrı dünyayı o kadar çok sevdi ki...' },
  { book: 'Mezmur', chapter: 23, verse: 1, text: 'RAB çobanımdır, eksiğim olmaz.' },
  { book: 'Filipililere', chapter: 4, verse: 13, text: 'Her şeye gücüm yeter, beni güçlendiren Mesih sayesinde.' },
  { book: 'Yeremya', chapter: 29, verse: 11, text: 'Size verdiğim gelecek ve umut dolu planlardan vazgeçmeyeceğim.' },
  { book: 'Matta', chapter: 11, verse: 28, text: 'Yorgun ve yüklü olanlar hepiniz bana gelin, size dinlenme vereceğim.' },
  { book: 'Romalılar', chapter: 8, verse: 28, text: "Tanrı'yı sevenlere, O'nun amacı doğrultusunda çağrılmış olanlara her şeyin yararlı olduğunu biliriz." },
  { book: 'Matta', chapter: 5, verse: 9, text: "Barışı sağlayanlar ne mutlu! Onlar Tanrı'nın oğulları olarak anılacak." },
  { book: 'Yuhanna', chapter: 14, verse: 6, text: 'İsa ona, Ben yol, gerçek ve yaşamım dedi.' },
  { book: 'Galatyalılar', chapter: 5, verse: 22, text: "Ruh'un meyvesi sevgi, sevinç, esenlik, sabır, şefkat, iyilik, bağlılık, yumuşaklık ve özdenetimdir." },
  { book: 'Mezmur', chapter: 46, verse: 1, text: 'Tanrı sığınağımız ve gücümüzdür, sıkıntıda her zaman yardım edendir.' },
  { book: 'İbraniler', chapter: 11, verse: 1, text: 'İman, umduklarımızın özü, görmediğimiz gerçeklerin kanıtıdır.' },
  { book: 'Yuhanna', chapter: 1, verse: 1, text: "Başlangıçta Söz vardı. Söz Tanrı'yla birlikteydi ve Söz Tanrı'ydı." },
  { book: '1. Korintliler', chapter: 13, verse: 4, text: 'Sevgi sabırlıdır, sevgi şefkatlidir. Sevgi kıskanmaz, övünmez, böbürlenmez.' },
  { book: 'Mezmur', chapter: 119, verse: 105, text: 'Sözün ayağıma kandil, yoluma ışıktır.' },
];

function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export function getVerseForDay(date: Date): DailyVerse {
  const dayOfYear = getDayOfYear(date);
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

function getBookIdByName(bookName: string): string | null {
  const fromNew = bookList.find((b) => b.name === bookName)?.id ?? null;
  if (fromNew) return fromNew;
  const fromOld = oldTestamentBooks.find((b) => b.name === bookName)?.id ?? null;
  return fromOld;
}

export type WidgetVersePayload = {
  verseText: string;
  verseRef: string;
  bookId: string | null;
  chapter: number;
};

export function getWidgetVersePayload(date: Date): WidgetVersePayload {
  const v = getVerseForDay(date);
  const bookId = getBookIdByName(v.book);
  return {
    verseText: v.text,
    verseRef: `${v.book} ${v.chapter}:${v.verse}`,
    bookId,
    chapter: v.chapter,
  };
}

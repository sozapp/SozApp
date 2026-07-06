/**
 * Çok dilli Yeni Ahit — TR (new-testament), EN (BBE), DE (Schlachter), AR (Van Dyck)
 */

import { newTestament } from './new-testament';

import deNT from './de_nt.json';
import arNT from './ar_nt.json';
import enNT from './en_nt.json';

export type BibleLanguage = 'tr' | 'en' | 'de' | 'ar';

type JsonBook = { name: string; chapters?: Array<{ chapter: number; verses?: Array<{ verse: number; text: string }> }> };

const deNTBooks = deNT as JsonBook[];
const arNTBooks = arNT as JsonBook[];
const enNTBooks = enNT as JsonBook[];

/** Türkçe kitap adı → İngilizce (EN JSON / KJV-WEB assets) kitap adı */
export const TR_TO_EN_NAME: Record<string, string> = {
  Matta: 'Matthew',
  Markos: 'Mark',
  Luka: 'Luke',
  Yuhanna: 'John',
  'Elçilerin İşleri': 'Acts',
  Romalılar: 'Romans',
  '1. Korintliler': '1 Corinthians',
  '2. Korintliler': '2 Corinthians',
  Galatyalılar: 'Galatians',
  Efesliler: 'Ephesians',
  Filipililere: 'Philippians',
  Koloseliler: 'Colossians',
  '1. Selanikliler': '1 Thessalonians',
  '2. Selanikliler': '2 Thessalonians',
  '1. Timoteos': '1 Timothy',
  '2. Timoteos': '2 Timothy',
  Titus: 'Titus',
  Filimon: 'Philemon',
  İbraniler: 'Hebrews',
  Yakup: 'James',
  '1. Petrus': '1 Peter',
  '2. Petrus': '2 Peter',
  '1. Yuhanna': '1 John',
  '2. Yuhanna': '2 John',
  '3. Yuhanna': '3 John',
  Yahuda: 'Jude',
  Vahiy: 'Revelation',
};

/** Türkçe kitap adı → Almanca (DE JSON) kitap adı */
const TR_TO_DE_NAME: Record<string, string> = {
  Matta: 'Matthäus',
  Markos: 'Markus',
  Luka: 'Lukas',
  Yuhanna: 'Johannes',
  'Elçilerin İşleri': 'Apostelgeschichte',
  Romalılar: 'Römer',
  '1. Korintliler': '1. Korinther',
  '2. Korintliler': '2. Korinther',
  Galatyalılar: 'Galater',
  Efesliler: 'Epheser',
  Filipililere: 'Philipper',
  Koloseliler: 'Kolosser',
  '1. Selanikliler': '1. Thessalonicher',
  '2. Selanikliler': '2. Thessalonicher',
  '1. Timoteos': '1. Timotheus',
  '2. Timoteos': '2. Timotheus',
  Titus: 'Titus',
  Filimon: 'Philemon',
  İbraniler: 'Hebräer',
  Yakup: 'Jakobus',
  '1. Petrus': '1. Petrus',
  '2. Petrus': '2. Petrus',
  '1. Yuhanna': '1. Johannes',
  '2. Yuhanna': '2. Johannes',
  '3. Yuhanna': '3. Johannes',
  Yahuda: 'Judas',
  Vahiy: 'Offenbarung',
};

/** Türkçe kitap adı → Arapça (AR JSON) kitap adı */
const TR_TO_AR_NAME: Record<string, string> = {
  Matta: 'متى',
  Markos: 'مرقس',
  Luka: 'لوقا',
  Yuhanna: 'يوحنا',
  'Elçilerin İşleri': 'أعمال الرسل',
  Romalılar: 'رومية',
  '1. Korintliler': '1 كورنثوس',
  '2. Korintliler': '2 كورنثوس',
  Galatyalılar: 'غلاطية',
  Efesliler: 'أفسس',
  Filipililere: 'فيلبي',
  Koloseliler: 'كولوسي',
  '1. Selanikliler': '1 تسالونيكي',
  '2. Selanikliler': '2 تسالونيكي',
  '1. Timoteos': '1 تيموثاوس',
  '2. Timoteos': '2 تيموثاوس',
  Titus: 'تيطس',
  Filimon: 'فليمون',
  İbraniler: 'العبرانيين',
  Yakup: 'يعقوب',
  '1. Petrus': '1 بطرس',
  '2. Petrus': '2 بطرس',
  '1. Yuhanna': '1 يوحنا',
  '2. Yuhanna': '2 يوحنا',
  '3. Yuhanna': '3 يوحنا',
  Yahuda: 'يهوذا',
  Vahiy: 'رؤيا يوحنا',
};

export const multilingualBible: Record<BibleLanguage, JsonBook[]> = {
  tr: newTestament as unknown as JsonBook[],
  en: enNTBooks,
  de: deNTBooks,
  ar: arNTBooks,
};

export const bibleLanguageNames: Record<BibleLanguage, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  ar: 'العربية',
};

function nameForLang(lang: BibleLanguage, turkishBookName: string): string | null {
  if (lang === 'tr') return turkishBookName;
  if (lang === 'en') return TR_TO_EN_NAME[turkishBookName] ?? null;
  if (lang === 'de') return TR_TO_DE_NAME[turkishBookName] ?? null;
  if (lang === 'ar') return TR_TO_AR_NAME[turkishBookName] ?? null;
  return null;
}

/** bookName: Türkçe kitap adı (örn. "Yuhanna") */
export function getBibleBook(lang: BibleLanguage, bookName: string): JsonBook | null {
  try {
    const bible = multilingualBible[lang];
    if (!bible?.length) return null;
    const name = nameForLang(lang, bookName);
    if (!name) return null;
    return bible.find((b) => b.name === name) ?? null;
  } catch {
    return null;
  }
}

export function getBibleChapter(
  lang: BibleLanguage,
  bookName: string,
  chapter: number
): { chapter: number; verses: Array<{ verse: number; text: string }> } | null {
  try {
    const book = getBibleBook(lang, bookName);
    const ch = book?.chapters?.find((c) => c.chapter === chapter);
    return ch && ch.verses ? { chapter: ch.chapter, verses: ch.verses } : null;
  } catch {
    return null;
  }
}

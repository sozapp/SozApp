import type { Denomination } from '@/constants/denominations';
import { bookList } from '@/constants/bible-index';

export type CalendarEvent = {
  id: string;
  name: string;
  nameEn: string;
  date: string;
  moveable?: boolean;
  denominations: Denomination[];
  type: 'feast' | 'fast' | 'saint' | 'sunday';
  description: string;
  bibleRef?: string;
  color: string;
};

export const calendarEvents: CalendarEvent[] = [
  {
    id: 'noel',
    name: 'Noel',
    nameEn: 'Christmas',
    date: '12-25',
    denominations: ['catholic', 'protestant', 'syriac', 'other'],
    type: 'feast',
    description: "İsa Mesih'in doğumunu kutlayan bayram.",
    bibleRef: 'Luka 2:1-20',
    color: '#C4956A',
  },
  {
    id: 'noel-ortodoks',
    name: 'Noel (Ortodoks)',
    nameEn: 'Christmas (Orthodox)',
    date: '01-07',
    denominations: ['orthodox'],
    type: 'feast',
    description: "Ortodoks takviminde İsa'nın doğum bayramı.",
    bibleRef: 'Luka 2:1-20',
    color: '#8B6914',
  },
  {
    id: 'noel-ermeni',
    name: 'Surp Dzınunt (Noel)',
    nameEn: 'Christmas (Armenian)',
    date: '01-06',
    denominations: ['armenian'],
    type: 'feast',
    description: "Ermeni Kilisesi'nde Noel ve Epifani birlikte kutlanır.",
    bibleRef: 'Matta 2:1-12',
    color: '#8B1a1a',
  },
  {
    id: 'epifani',
    name: 'Epifani (Theofania)',
    nameEn: 'Epiphany',
    date: '01-06',
    denominations: ['catholic', 'protestant'],
    type: 'feast',
    description: "Üç Bilge'nin İsa'yı ziyareti.",
    bibleRef: 'Matta 2:1-12',
    color: '#C4956A',
  },
  {
    id: 'theofania',
    name: 'Theofania',
    nameEn: 'Theophany',
    date: '01-06',
    denominations: ['orthodox'],
    type: 'feast',
    description: "İsa'nın vaftizini kutlayan büyük bayram.",
    bibleRef: 'Matta 3:13-17',
    color: '#8B6914',
  },
  {
    id: 'paskalya-2026',
    name: 'Paskalya',
    nameEn: 'Easter',
    date: '04-05',
    denominations: ['catholic', 'protestant', 'other'],
    type: 'feast',
    description: "İsa Mesih'in dirilişini kutlayan en büyük Hristiyan bayramı.",
    bibleRef: 'Yuhanna 20:1-18',
    color: '#C4956A',
    moveable: true,
  },
  {
    id: 'paskalya-ortodoks-2026',
    name: 'Paskalya (Ortodoks)',
    nameEn: 'Easter (Orthodox)',
    date: '04-12',
    denominations: ['orthodox', 'syriac'],
    type: 'feast',
    description: "Ortodoks takviminde İsa'nın dirilişi.",
    bibleRef: 'Yuhanna 20:1-18',
    color: '#8B6914',
    moveable: true,
  },
  {
    id: 'paskalya-ermeni-2026',
    name: 'Zatik (Paskalya)',
    nameEn: 'Easter (Armenian)',
    date: '04-12',
    denominations: ['armenian'],
    type: 'feast',
    description: "Ermeni Apostolik Kilisesi'nde Paskalya.",
    bibleRef: 'Yuhanna 20:1-18',
    color: '#8B1a1a',
    moveable: true,
  },
  {
    id: 'pentekost-2026',
    name: "Pentekost (Paskalya'dan 50 gün sonra)",
    nameEn: 'Pentecost',
    date: '05-24',
    denominations: ['catholic', 'protestant', 'other'],
    type: 'feast',
    description: "Kutsal Ruh'un havarilere inişi.",
    bibleRef: 'Elçilerin İşleri 2:1-13',
    color: '#C4956A',
    moveable: true,
  },
  {
    id: 'meryem-ana',
    name: "Meryem Ana'nın Göğe Alınması",
    nameEn: 'Assumption of Mary',
    date: '08-15',
    denominations: ['catholic', 'orthodox'],
    type: 'feast',
    description: "Meryem Ana'nın göğe alınmasını kutlayan bayram.",
    bibleRef: 'Luka 1:46-55',
    color: '#C4956A',
  },
  {
    id: 'vartavar',
    name: 'Vartavar',
    nameEn: 'Vartavar',
    date: '07-05',
    denominations: ['armenian'],
    type: 'feast',
    description: "Ermeni kilisesinin önemli bayramı. İsa'nın Celali.",
    bibleRef: 'Matta 17:1-9',
    color: '#8B1a1a',
    moveable: true,
  },
  {
    id: 'buyuk-oruç-baslangic',
    name: 'Büyük Oruç Başlangıcı',
    nameEn: 'Beginning of Great Lent',
    date: '02-16',
    denominations: ['orthodox', 'catholic', 'protestant', 'armenian', 'syriac'],
    type: 'fast',
    description: "Paskalya'ya hazırlık oruç dönemi başlıyor. 40 gün sürer.",
    bibleRef: 'Matta 4:1-11',
    color: '#666',
    moveable: true,
  },
  {
    id: 'aziz-pavlus',
    name: "Aziz Pavlus'un Şehit Edilmesi",
    nameEn: 'Feast of Saints Peter and Paul',
    date: '06-29',
    denominations: ['orthodox', 'catholic'],
    type: 'saint',
    description:
      "Elçi Pavlus'un anma günü. Tarsuslu Pavlus İncil'i Anadolu'ya taşıdı.",
    bibleRef: '2. Timoteos 4:6-8',
    color: '#C4956A',
  },
  {
    id: 'aziz-yuhanna',
    name: 'Aziz Yuhanna İlahiyatçı',
    nameEn: 'Saint John the Theologian',
    date: '05-08',
    denominations: ['orthodox'],
    type: 'saint',
    description:
      "Dördüncü İncil'in yazarı. Efes'te yaşadı, Patmos'ta Vahiy'i yazdı.",
    bibleRef: 'Yuhanna 21:20-25',
    color: '#8B6914',
  },
];

const REF_PREFIX_MAP: [string, string][] = [
  ['Elç. İşl.', 'Elçilerin İşleri'],
  ['Elçilerin İşleri', 'Elçilerin İşleri'],
];

export function parseBibleRefToReadParams(
  ref: string
): { bookId: string; chapter: string } | null {
  try {
    let r = ref.trim();
    for (const [a, b] of REF_PREFIX_MAP) {
      if (r.startsWith(a)) {
        r = b + r.slice(a.length);
        break;
      }
    }
    const m = r.match(/^(.+?)\s+(\d+)\s*[:.]/);
    if (!m) return null;
    const bookPart = m[1].trim();
    const chapter = m[2];
    const book = bookList.find(
      (b) =>
        b.name === bookPart ||
        b.shortName === bookPart ||
        bookPart.startsWith(b.shortName) ||
        b.name.startsWith(bookPart)
    );
    if (!book) return null;
    return { bookId: book.id, chapter };
  } catch {
    return null;
  }
}

export function eventMatchesDenomination(
  event: CalendarEvent,
  denomination: Denomination
): boolean {
  return (
    denomination === 'other' || event.denominations.includes(denomination)
  );
}

export function getTodayCalendarEvents(
  denomination: Denomination
): CalendarEvent[] {
  try {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${mm}-${dd}`;
    return calendarEvents.filter(
      (event) =>
        event.date === todayStr &&
        eventMatchesDenomination(event, denomination)
    );
  } catch {
    return [];
  }
}

export type UpcomingCalendarItem = {
  event: CalendarEvent;
  daysUntil: number;
  dateLabel: string;
};

const TR_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

function startOfToday(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Mezhebe göre önümüzdeki bayram/etkinlikler (en yakın tarih sırası). */
export function getUpcomingCalendarEvents(
  denomination: Denomination,
  limit = 3
): UpcomingCalendarItem[] {
  try {
    const now = new Date();
    const t0 = startOfToday(now);
    const eligible = calendarEvents.filter((e) =>
      eventMatchesDenomination(e, denomination)
    );
    const items: UpcomingCalendarItem[] = [];

    for (const event of eligible) {
      const [mm, dd] = event.date.split('-').map((x) => parseInt(x, 10));
      if (Number.isNaN(mm) || Number.isNaN(dd)) continue;
      let y = now.getFullYear();
      let eventDay = new Date(y, mm - 1, dd).getTime();
      if (eventDay < t0) {
        y += 1;
        eventDay = new Date(y, mm - 1, dd).getTime();
      }
      const daysUntil = Math.round((eventDay - t0) / 86400000);
      const d = new Date(y, mm - 1, dd);
      const dateLabel = `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
      items.push({ event, daysUntil, dateLabel });
    }

    items.sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return a.event.name.localeCompare(b.event.name, 'tr');
    });
    return items.slice(0, limit);
  } catch {
    return [];
  }
}

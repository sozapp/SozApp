import { Linking } from 'react-native';

export type VideoCategory = 'bible-project' | 'chosen' | 'devotional';

export type Video = {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  category: VideoCategory;
  bibleRef?: string;
  thumbnail?: string;
  language: 'tr' | 'en';
  /** Kitap ID (Yeni Ahit) — bağlam modalında eşleşme için */
  refBookId?: string;
  refChapter?: number;
};

export const videos: Video[] = [
  {
    id: 'bp-yaratilis',
    title: 'Yaratılış 1-11 — Bible Project Türkçe',
    description: 'Yaratılış kitabının görsel özeti',
    youtubeId: 'K7EGBKBOa1A',
    duration: '7:40',
    category: 'bible-project',
    bibleRef: 'Yaratılış 1-11',
    language: 'tr',
  },
  {
    id: 'bp-yaratilis-12-50',
    title: 'Yaratılış 12-50 — Bible Project Türkçe',
    description: 'Yaratılış 12-50 görsel özeti',
    youtubeId: 'F4IEShBzA7o',
    duration: '8:00',
    category: 'bible-project',
    bibleRef: 'Yaratılış 12',
    language: 'tr',
  },
  {
    id: 'bp-yuhanna',
    title: 'Yuhanna — Bible Project Türkçe',
    description: "Yuhanna İncili'nin görsel özeti",
    youtubeId: 'xOGY4VFiQrU',
    duration: '7:15',
    category: 'bible-project',
    bibleRef: 'Yuhanna 1',
    language: 'tr',
    refBookId: 'joh',
    refChapter: 1,
  },
  {
    id: 'bp-elciisler',
    title: 'Elçilerin İşleri — Bible Project Türkçe',
    description: 'Elçilerin İşleri kitabının özeti',
    youtubeId: 'NdCEiCRXFKA',
    duration: '8:02',
    category: 'bible-project',
    bibleRef: 'Elç. İşl. 1',
    language: 'tr',
    refBookId: 'act',
    refChapter: 1,
  },
  {
    id: 'bp-vahiy',
    title: 'Vahiy — Bible Project Türkçe',
    description: 'Vahiy kitabının görsel özeti',
    youtubeId: 'tybOgVnEgMc',
    duration: '10:01',
    category: 'bible-project',
    bibleRef: 'Vahiy 1',
    language: 'tr',
    refBookId: 'rev',
    refChapter: 1,
  },
  {
    id: 'bp-incil-nedir',
    title: 'İncil Nedir? — Bible Project Türkçe',
    description: "İncil'e giriş videosu",
    youtubeId: 'ak06MSETeo4',
    duration: '4:48',
    category: 'bible-project',
    language: 'tr',
  },
  {
    id: 'bp-dua',
    title: 'Dua — Bible Project Türkçe',
    description: 'Dua nedir? Nasıl yapılır?',
    youtubeId: 'kv9_NjXmd4E',
    duration: '5:22',
    category: 'bible-project',
    bibleRef: 'Matta 6:9-13',
    language: 'tr',
    refBookId: 'mat',
    refChapter: 6,
  },
  {
    id: 'bp-isa',
    title: 'İsa Kimdir? — Bible Project Türkçe',
    description: 'İsa kimdir?',
    youtubeId: 'Kl_iHjuKFlg',
    duration: '7:14',
    category: 'bible-project',
    language: 'tr',
  },
  {
    id: 'bp-mezmurlar',
    title: 'Mezmurlar — Bible Project Türkçe',
    description: 'Mezmurlar kitabının görsel özeti',
    youtubeId: 'j9phNEaPrv8',
    duration: '9:01',
    category: 'bible-project',
    bibleRef: 'Mezmur 1',
    language: 'tr',
  },
  {
    id: 'bp-matta',
    title: 'Matta — Bible Project Türkçe',
    description: "Matta İncili'nin görsel özeti",
    youtubeId: 'LqCQBGAFCm4',
    duration: '7:38',
    category: 'bible-project',
    bibleRef: 'Matta 1',
    language: 'tr',
    refBookId: 'mat',
    refChapter: 1,
  },
  {
    id: 'bp-markos',
    title: 'Markos — Bible Project Türkçe',
    description: "Markos İncili'nin görsel özeti",
    youtubeId: 'HGHqu9-DtXk',
    duration: '5:42',
    category: 'bible-project',
    bibleRef: 'Markos 1',
    language: 'tr',
    refBookId: 'mar',
    refChapter: 1,
  },
  {
    id: 'bp-isa-dogumu-luka',
    title: "İsa'nın Doğumu — Luka Müjdesi 1.-2. Böl. — Bible Project Türkçe",
    description: "İsa'nın doğumu ve Luka Müjdesi 1.-2. bölüm özeti",
    youtubeId: 'Q0wcjM6bqyE',
    duration: '6:00',
    category: 'bible-project',
    bibleRef: 'Luka 1-2',
    language: 'tr',
    refBookId: 'luk',
    refChapter: 1,
  },
  {
    id: 'bp-isa-dogumu-luka-2',
    title: "İsa'nın Doğumu — Luka Müjdesi 1.-2. Böl. — Bible Project Türkçe",
    description: "İsa'nın doğumu ve Luka Müjdesi 1.-2. bölüm özeti",
    youtubeId: 'Q0wcjM6bqyE',
    duration: '6:00',
    category: 'bible-project',
    bibleRef: 'Luka 1-2',
    language: 'tr',
    refBookId: 'luk',
    refChapter: 2,
  },
  {
    id: 'bp-luka',
    title: 'Luka — Bible Project Türkçe',
    description: "Luka İncili'nin görsel özeti (Genel Bakış: Luka 1-9)",
    youtubeId: 'tRRlIelDf_g',
    duration: '7:12',
    category: 'bible-project',
    bibleRef: 'Luka 1',
    language: 'tr',
    refBookId: 'luk',
    refChapter: 3,
  },
  {
    id: 'bp-pavlus',
    title: 'Pavlus Kimdir? — Bible Project Türkçe',
    description: "Elçi Pavlus'un hikayesi",
    youtubeId: 'tNpBGgCKgBo',
    duration: '6:24',
    category: 'bible-project',
    language: 'tr',
  },
  {
    id: 'bp-kutsal-ruh',
    title: 'Kutsal Ruh — Bible Project Türkçe',
    description: 'Kutsal Ruh nedir?',
    youtubeId: 'oNNZO9i1Gjc',
    duration: '5:58',
    category: 'bible-project',
    language: 'tr',
  },
  {
    id: 'bp-eski-ahit',
    title: 'Eski Ahit Nedir? — Bible Project Türkçe',
    description: 'Eski Ahit\'e giriş',
    youtubeId: 'ALsluAKBZ-c',
    duration: '6:00',
    category: 'bible-project',
    language: 'tr',
  },
  {
    id: 'bp-sevgi',
    title: 'Sevgi — Bible Project',
    description: "İncil'de sevgi kavramı",
    youtubeId: 'otKF5WQaEiA',
    duration: '5:20',
    category: 'bible-project',
    language: 'tr',
  },
];

const FREE_VIDEO_COUNT = 3;

export function isVideoFree(index: number): boolean {
  return index < FREE_VIDEO_COUNT;
}

export function getRelatedVideo(bookId: string, chapter: number): Video | null {
  return videos.find(
    (v) => v.refBookId === bookId && v.refChapter === chapter
  ) ?? null;
}

export function getVideoThumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function getYouTubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

/** Opens video in YouTube app if available, otherwise in browser. */
export async function openVideo(youtubeId: string): Promise<void> {
  const appUrl = `youtube://watch?v=${youtubeId}`;
  const webUrl = getYouTubeWatchUrl(youtubeId);
  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    await Linking.openURL(webUrl);
  }
}

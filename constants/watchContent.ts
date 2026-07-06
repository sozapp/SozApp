export type WatchItem = {
  id: string;
  type: 'film' | 'dizi' | 'animasyon' | 'belgesel' | 'kısa';
  title: string;
  originalTitle?: string;
  year: number;
  duration: string;
  description: string;
  tags: string[];
  where: WatchPlatform[];
  lang: string[];
  ageRating: string;
  thumbnail: string;
  /** Varsa kart üstünde poster görseli */
  posterUrl?: string;
  posterColor: string;
  posterIcon: 'film-outline' | 'tv-outline' | 'easel-outline';
  bgColor: string;
  accentColor: string;
  mustWatch: boolean;
};

export function watchTypeLabelTr(type: WatchItem['type']): string {
  const m: Record<WatchItem['type'], string> = {
    film: 'Film',
    dizi: 'Dizi',
    animasyon: 'Animasyon',
    belgesel: 'Belgesel',
    kısa: 'Kısa',
  };
  return m[type];
}

export type WatchPlatform = {
  name: string;
  icon: string;
  url: string;
};

export const WATCH_CONTENT: WatchItem[] = [
  {
    id: 'chosen',
    type: 'dizi',
    title: 'The Chosen',
    year: 2017,
    duration: '45-60 dk / bölüm',
    description:
      "İsa'nın hayatını anlatan çok ödüllü dizi. Gerçekçi karakterler ve derin anlatımıyla şimdiye kadar yapılmış en iyi İncil dizisi.",
    tags: ['İsa', 'Havarileri', 'Mucizeler', 'Gerçekçi'],
    where: [
      { name: 'The Chosen App', icon: '📱', url: 'https://www.angel.com/watch/the-chosen' },
      { name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com/@thechosen' },
    ],
    lang: ['Türkçe', 'İngilizce'],
    ageRating: 'Herkese',
    thumbnail: '🎬',
    posterColor: '#1A2A1A',
    posterIcon: 'tv-outline',
    bgColor: '#1A1208',
    accentColor: '#C4956A',
    mustWatch: true,
  },
  {
    id: 'bible_project',
    type: 'kısa',
    title: 'BibleProject',
    year: 2014,
    duration: '5-10 dk / video',
    description:
      'Animasyonlu kısa videolarla İncil kitaplarını ve teolojik kavramları açıklıyor. Öğrenmek için mükemmel başlangıç.',
    tags: ['Animasyon', 'Öğretici', 'Kısa', 'Kavramlar'],
    where: [
      { name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com/@bibleproject' },
      { name: 'BibleProject.com', icon: '🌐', url: 'https://bibleproject.com' },
    ],
    lang: ['Türkçe', 'İngilizce'],
    ageRating: 'Herkese',
    thumbnail: '🎨',
    posterColor: '#1A1A2A',
    posterIcon: 'easel-outline',
    bgColor: '#0D1A1A',
    accentColor: '#4ECDC4',
    mustWatch: true,
  },
  {
    id: 'jesus_film',
    type: 'film',
    title: 'Jesus Film',
    originalTitle: 'Jesus (1979)',
    year: 1979,
    duration: '1s 57dk',
    description:
      "Luka İncili'ne dayanan bu film 100'den fazla dile çevrildi ve dünyada en çok izlenen filmlerden biri. Türkçe dublajı mevcut.",
    tags: ['Klasik', 'Luka', 'Türkçe Dublaj'],
    where: [
      { name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com/watch?v=0MWMTRf4H6w' },
      { name: 'JesusFilm.org', icon: '🌐', url: 'https://www.jesusfilm.org' },
    ],
    lang: ['Türkçe'],
    ageRating: 'Herkese',
    thumbnail: '🎥',
    posterColor: '#2A1A1A',
    posterIcon: 'film-outline',
    bgColor: '#1A0D08',
    accentColor: '#E8A87C',
    mustWatch: true,
  },
  {
    id: 'passion',
    type: 'film',
    title: 'Çile (The Passion)',
    originalTitle: 'The Passion of the Christ',
    year: 2004,
    duration: '2s 7dk',
    description:
      "Mel Gibson'ın yönettiği İsa'nın son 12 saatini anlatan güçlü film. Çok etkileyici ama bazı sahneler yoğun.",
    tags: ['Çarmıh', 'Son 12 Saat', 'Yoğun'],
    where: [
      { name: 'Netflix', icon: '🎬', url: 'https://netflix.com' },
      { name: 'Amazon', icon: '📦', url: 'https://amazon.com' },
    ],
    lang: ['Türkçe', 'Aramice'],
    ageRating: '16+',
    thumbnail: '✝️',
    posterColor: '#1F1F1A',
    posterIcon: 'film-outline',
    bgColor: '#1A0808',
    accentColor: '#C45A5A',
    mustWatch: false,
  },
  {
    id: 'superbook',
    type: 'animasyon',
    title: 'Superbook',
    year: 2011,
    duration: '25 dk / bölüm',
    description:
      'Çocuklar için harika animasyon dizi. İki çocuk ve robotları tarihin farklı dönemlerine giderek İncil hikayelerini yaşıyor.',
    tags: ['Çocuklar', 'Animasyon', 'Eğlenceli', 'Aile'],
    where: [
      { name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com/@superbookofficial' },
      { name: 'Superbook.tv', icon: '📺', url: 'https://www.superbook.tv' },
    ],
    lang: ['Türkçe', 'İngilizce'],
    ageRating: 'Herkese',
    thumbnail: '🤖',
    posterColor: '#1F1F1A',
    posterIcon: 'easel-outline',
    bgColor: '#0D1A2E',
    accentColor: '#6BA3BE',
    mustWatch: false,
  },
  {
    id: 'nativity',
    type: 'film',
    title: 'Doğuş',
    originalTitle: 'The Nativity Story',
    year: 2006,
    duration: '1s 41dk',
    description:
      "Meryem ve Yusuf'un gözünden İsa'nın doğuşunu anlatan güzel ve saygılı bir film.",
    tags: ['Doğuş', 'Meryem', 'Noel'],
    where: [{ name: 'Amazon', icon: '📦', url: 'https://amazon.com' }],
    lang: ['İngilizce'],
    ageRating: 'Herkese',
    thumbnail: '⭐',
    posterColor: '#1F1F1A',
    posterIcon: 'film-outline',
    bgColor: '#1A1508',
    accentColor: '#F0C060',
    mustWatch: false,
  },
  {
    id: 'acts_apostles',
    type: 'film',
    title: 'Elçiler',
    originalTitle: 'Acts of the Apostles',
    year: 1994,
    duration: '3s',
    description:
      'Pavlus ve diğer elçilerin yolculuklarını anlatan kapsamlı yapım. Elçilerin İşleri kitabını okurken izlemek için ideal.',
    tags: ['Pavlus', 'Elçiler', 'Erken Kilise'],
    where: [{ name: 'YouTube', icon: '▶️', url: 'https://youtube.com' }],
    lang: ['İngilizce'],
    ageRating: 'Herkese',
    thumbnail: '⛵',
    posterColor: '#1F1F1A',
    posterIcon: 'film-outline',
    bgColor: '#081A1A',
    accentColor: '#4ECDC4',
    mustWatch: false,
  },
  {
    id: 'veggie_tales',
    type: 'animasyon',
    title: 'VeggieTales',
    year: 1993,
    duration: '30 dk / bölüm',
    description:
      'Sebze karakterlerin İncil hikayelerini anlattığı klasik animasyon serisi. Çocuklar için mükemmel.',
    tags: ['Çocuklar', 'Komedi', 'Klasik', 'Aile'],
    where: [
      { name: 'YouTube', icon: '▶️', url: 'https://www.youtube.com/@veggietales' },
      { name: 'Netflix', icon: '🎬', url: 'https://netflix.com' },
    ],
    lang: ['İngilizce'],
    ageRating: 'Herkese',
    thumbnail: '🥦',
    posterColor: '#1F1F1A',
    posterIcon: 'easel-outline',
    bgColor: '#0D1A0D',
    accentColor: '#7CB87C',
    mustWatch: false,
  },
  {
    id: 'greatest_story',
    type: 'film',
    title: 'En Büyük Hikaye',
    originalTitle: 'The Greatest Story Ever Told',
    year: 1965,
    duration: '3s 37dk',
    description:
      "Hollywood klasiği. İsa'nın doğumundan dirilişine kadar kapsamlı bir anlatım.",
    tags: ['Klasik', 'Hollywood', 'Kapsamlı'],
    where: [{ name: 'YouTube', icon: '▶️', url: 'https://youtube.com' }],
    lang: ['İngilizce'],
    ageRating: 'Herkese',
    thumbnail: '🌟',
    posterColor: '#1F1F1A',
    posterIcon: 'film-outline',
    bgColor: '#1A1208',
    accentColor: '#C4956A',
    mustWatch: false,
  },
];

export const getByType = (type: WatchItem['type'] | 'all') => {
  if (type === 'all') return WATCH_CONTENT;
  return WATCH_CONTENT.filter((w) => w.type === type);
};

export const getMustWatch = () => WATCH_CONTENT.filter((w) => w.mustWatch);

export const getDailyVerseForWatch = () => {
  const verses = [
    { text: 'Her şeyi bana güç veren Mesih aracılığıyla yapabilirim.', ref: 'Filipililer 4:13' },
    { text: 'RAB benim çobanım, hiçbir şeyim eksik olmaz.', ref: 'Mezmur 23:1' },
    { text: 'Tanrı dünyayı o kadar çok sevdi.', ref: 'Yuhanna 3:16' },
    { text: 'Ben yol, gerçek ve yaşamım.', ref: 'Yuhanna 14:6' },
    { text: 'Sevgi sabırlıdır, sevgi şefkatlidir.', ref: '1.Korintliler 13:4' },
    { text: 'Başlangıçta Söz vardı.', ref: 'Yuhanna 1:1' },
    { text: 'Her şey için şükredin.', ref: '1.Selanikliler 5:18' },
  ];
  const day = new Date().getDay();
  return verses[day % verses.length];
};

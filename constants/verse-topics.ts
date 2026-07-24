/**
 * Konuya göre ayet koleksiyonları — YouVersion tarzı tematik listeler.
 * verseId formatı: "KitapAdı-Bölüm-Ayet" (örn. Yuhanna-3-16); bible-index.ts ile uyumlu.
 * Yalnızca getVerseTextByVerseId ile çözülen gerçek Yeni Ahit referansları.
 */

export type VerseTopic = {
  id: string;
  title: string;
  icon: string;
  description: string;
  verseIds: string[];
};

export const verseTopics: VerseTopic[] = [
  {
    id: 'anxiety',
    title: 'Kaygı',
    icon: 'cloudy-outline',
    description: 'Endişe ve korku anlarında tutunabileceğin ayetler.',
    verseIds: [
      'Filipililere-4-6',
      'Filipililere-4-7',
      '1. Petrus-5-7',
      'Matta-6-34',
      'Yuhanna-14-27',
      'Matta-6-33',
      '2. Timoteos-1-7',
      'Yuhanna-16-33',
    ],
  },
  {
    id: 'hope',
    title: 'Umut',
    icon: 'sunny-outline',
    description: 'Geleceğe dair umut ve güven veren ayetler.',
    verseIds: [
      'İbraniler-11-1',
      'Romalılar-5-1',
      '1. Petrus-1-3',
      'Vahiy-21-4',
      'Vahiy-21-5',
      '2. Korintliler-4-16',
      'Yakup-1-12',
      'Romalılar-5-8',
    ],
  },
  {
    id: 'forgiveness',
    title: 'Bağışlama',
    icon: 'heart-half-outline',
    description: 'Bağışlamak ve bağışlanmak üzerine ayetler.',
    verseIds: [
      'Efesliler-4-32',
      'Matta-18-21',
      'Matta-18-22',
      '1. Yuhanna-1-9',
      'Matta-5-44',
      'Koloseliler-3-13',
      'Luka-6-37',
    ],
  },
  {
    id: 'patience',
    title: 'Sabır',
    icon: 'hourglass-outline',
    description: 'Dayanıklılık ve sabır için güç veren ayetler.',
    verseIds: [
      'Yakup-1-2',
      'Yakup-1-12',
      '1. Korintliler-13-4',
      '1. Korintliler-13-7',
      'Galatyalılar-6-9',
      'İbraniler-12-1',
      'Romalılar-5-3',
      'Romalılar-5-4',
    ],
  },
  {
    id: 'gratitude',
    title: 'Şükür',
    icon: 'gift-outline',
    description: 'Teşekkür ve şükran yüreği için ayetler.',
    verseIds: [
      '1. Selanikliler-5-16',
      '1. Selanikliler-5-17',
      '1. Selanikliler-5-18',
      'Koloseliler-3-15',
      'Filipililere-4-6',
      'Efesliler-5-20',
      '1. Korintliler-15-57',
    ],
  },
  {
    id: 'family',
    title: 'Aile',
    icon: 'home-outline',
    description: 'Aile, birlik ve sevgi bağları için ayetler.',
    verseIds: [
      'Koloseliler-3-14',
      'Efesliler-4-32',
      '1. Korintliler-13-4',
      '1. Petrus-4-8',
      '1. Korintliler-16-14',
      'Efesliler-5-21',
      '1. Yuhanna-4-19',
      'Koloseliler-3-15',
    ],
  },
  {
    id: 'hardship',
    title: 'Zorluklar',
    icon: 'flash-outline',
    description: 'Sıkıntı ve deneme günlerinde cesaret.',
    verseIds: [
      'Yakup-1-2',
      '1. Korintliler-10-13',
      '2. Korintliler-12-9',
      '2. Korintliler-4-16',
      'Yuhanna-16-33',
      'İbraniler-12-1',
      'Filipililere-4-13',
      '1. Petrus-5-8',
    ],
  },
  {
    id: 'love',
    title: 'Sevgi',
    icon: 'heart-outline',
    description: 'Tanrı\'nın ve birbirimize sevgi üzerine ayetler.',
    verseIds: [
      'Yuhanna-3-16',
      '1. Korintliler-13-4',
      '1. Korintliler-13-7',
      '1. Yuhanna-4-8',
      '1. Yuhanna-4-19',
      '1. Korintliler-16-14',
      'Koloseliler-3-14',
      'Romalılar-5-8',
      '1. Petrus-4-8',
    ],
  },
  {
    id: 'faith',
    title: 'İman',
    icon: 'shield-outline',
    description: 'İman, güven ve Tanrı\'ya tutunma.',
    verseIds: [
      'İbraniler-11-1',
      'İbraniler-11-6',
      'Efesliler-2-8',
      'Yuhanna-14-6',
      'Yuhanna-3-16',
      '2. Korintliler-5-17',
      'Elçilerin İşleri-4-12',
      'Romalılar-5-1',
    ],
  },
  {
    id: 'prayer',
    title: 'Dua',
    icon: 'hand-left-outline',
    description: 'Dua etmek ve Tanrı\'yla konuşmak.',
    verseIds: [
      'Matta-7-7',
      'Filipililere-4-6',
      '1. Selanikliler-5-17',
      'Yakup-5-16',
      'Yakup-1-5',
      'İbraniler-4-16',
      'Luka-11-9',
      '1. Yuhanna-1-9',
    ],
  },
  {
    id: 'new-beginnings',
    title: 'Yeni Başlangıçlar',
    icon: 'sparkles-outline',
    description: 'Yenilenme, dönüşüm ve taze başlangıçlar.',
    verseIds: [
      '2. Korintliler-5-17',
      'Vahiy-21-5',
      'Galatyalılar-5-1',
      'Efesliler-2-8',
      'Titus-3-5',
      'Yuhanna-1-1',
      'Vahiy-3-20',
      'Romalılar-5-1',
    ],
  },
  {
    id: 'courage',
    title: 'Cesaret',
    icon: 'rocket-outline',
    description: 'Korkuya karşı cesaret ve güç.',
    verseIds: [
      '2. Timoteos-1-7',
      'Filipililere-4-13',
      'İbraniler-13-5',
      'Matta-28-20',
      'Yuhanna-16-33',
      'Efesliler-6-10',
      '2. Korintliler-12-9',
      'İbraniler-4-16',
    ],
  },
  {
    id: 'peace',
    title: 'Esenlik',
    icon: 'leaf-outline',
    description: 'İç huzur ve Tanrı\'nın esenliği.',
    verseIds: [
      'Yuhanna-14-27',
      'Filipililere-4-7',
      'Matta-11-28',
      'Koloseliler-3-15',
      'Yuhanna-16-33',
      '2. Timoteos-1-7',
      'Filipililere-4-8',
    ],
  },
  {
    id: 'strength',
    title: 'Güç',
    icon: 'fitness-outline',
    description: 'Zayıflıkta güç ve Mesih\'te dayanma.',
    verseIds: [
      'Filipililere-4-13',
      '2. Korintliler-12-9',
      'Efesliler-6-10',
      'İbraniler-12-1',
      '2. Timoteos-1-7',
      'Koloseliler-3-23',
      '2. Korintliler-4-16',
      'Yakup-1-12',
    ],
  },
];

export function getVerseTopicById(id: string): VerseTopic | undefined {
  return verseTopics.find((t) => t.id === id);
}

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  condition: (stats: UserStats) => boolean;
};

export type UserStats = {
  streak: number;
  totalVersesRead: number;
  totalNotes: number;
  totalFavorites: number;
  gamesPlayed: number;
  daysActive: number;
  memorizeCount: number;
  reflectionsCompleted: number;
};

export const ALL_BADGES: Badge[] = [
  {
    id: 'first_step',
    name: 'Ilk Adim',
    description: 'Uygulamayi ilk kez actin',
    icon: 'footsteps-outline',
    color: '#C4956A',
    condition: (s) => s.daysActive >= 1,
  },
  {
    id: 'reader',
    name: 'Okuyucu',
    description: '50 ayet okudun',
    icon: 'book-outline',
    color: '#7C9A8A',
    condition: (s) => s.totalVersesRead >= 50,
  },
  {
    id: 'scholar',
    name: 'Alim',
    description: '500 ayet okudun',
    icon: 'library-outline',
    color: '#9A8A7C',
    condition: (s) => s.totalVersesRead >= 500,
  },
  {
    id: 'streak_3',
    name: '3 Gun',
    description: '3 gunluk seri yaptin',
    icon: 'flame-outline',
    color: '#E8A87C',
    condition: (s) => s.streak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Bir Hafta',
    description: '7 gunluk seri yaptin',
    icon: 'flame',
    color: '#E57373',
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Bir Ay',
    description: '30 gunluk seri yaptin',
    icon: 'trophy-outline',
    color: '#FFD700',
    condition: (s) => s.streak >= 30,
  },
  {
    id: 'note_taker',
    name: 'Not Alan',
    description: 'Ilk notunu aldin',
    icon: 'create-outline',
    color: '#7C8A9A',
    condition: (s) => s.totalNotes >= 1,
  },
  {
    id: 'note_master',
    name: 'Not Ustasi',
    description: '10 not aldin',
    icon: 'journal-outline',
    color: '#5A7A9A',
    condition: (s) => s.totalNotes >= 10,
  },
  {
    id: 'favorite',
    name: 'Sevgili Ayet',
    description: 'Ilk favorini ekledin',
    icon: 'heart-outline',
    color: '#9A7C8A',
    condition: (s) => s.totalFavorites >= 1,
  },
  {
    id: 'gamer',
    name: 'Oyuncu',
    description: '10 oyun oynadin',
    icon: 'game-controller-outline',
    color: '#8A9A7C',
    condition: (s) => s.gamesPlayed >= 10,
  },
  {
    id: 'memorizer',
    name: 'Ezberci',
    description: 'Ilk ayeti ezberledin',
    icon: 'bulb-outline',
    color: '#C4A96A',
    condition: (s) => s.memorizeCount >= 1,
  },
  {
    id: 'reflector',
    name: 'Yansiyan',
    description: '7 gunluk yansima yaptin',
    icon: 'leaf-outline',
    color: '#7C9A7C',
    condition: (s) => s.reflectionsCompleted >= 7,
  },
];

export const checkNewBadges = (
  stats: UserStats,
  earnedBadgeIds: string[]
): Badge[] => {
  return ALL_BADGES.filter(
    (b) => b.condition(stats) && !earnedBadgeIds.includes(b.id)
  );
};

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

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Hangi istatistik takip ediliyor (ilerleme halkası için de kullanılır). */
  statKey: keyof UserStats;
  /** Bu değere ulaşınca rozet kazanılır. */
  target: number;
};

export const ALL_BADGES: Badge[] = [
  // daysActive — sadakat
  {
    id: 'first_step',
    name: 'İlk Adım',
    description: 'Uygulamayı ilk kez açtın',
    icon: 'footsteps-outline',
    color: '#C4956A',
    statKey: 'daysActive',
    target: 1,
  },
  {
    id: 'regular',
    name: 'Düzenli',
    description: '7 gün uygulamayı kullandın',
    icon: 'calendar-outline',
    color: '#B08968',
    statKey: 'daysActive',
    target: 7,
  },
  {
    id: 'devoted',
    name: 'Sadık',
    description: '30 gün uygulamayı kullandın',
    icon: 'ribbon-outline',
    color: '#A67C52',
    statKey: 'daysActive',
    target: 30,
  },
  {
    id: 'veteran',
    name: 'Kıdemli',
    description: '100 gün uygulamayı kullandın',
    icon: 'medal-outline',
    color: '#8B5E34',
    statKey: 'daysActive',
    target: 100,
  },

  // totalVersesRead — okuma
  {
    id: 'reader',
    name: 'Okuyucu',
    description: '50 ayet okudun',
    icon: 'book-outline',
    color: '#7C9A8A',
    statKey: 'totalVersesRead',
    target: 50,
  },
  {
    id: 'devoted_reader',
    name: 'Meraklı Okuyucu',
    description: '200 ayet okudun',
    icon: 'reader-outline',
    color: '#6B8A78',
    statKey: 'totalVersesRead',
    target: 200,
  },
  {
    id: 'scholar',
    name: 'Âlim',
    description: '500 ayet okudun',
    icon: 'library-outline',
    color: '#9A8A7C',
    statKey: 'totalVersesRead',
    target: 500,
  },
  {
    id: 'sage',
    name: 'Bilge',
    description: '1000 ayet okudun',
    icon: 'school-outline',
    color: '#8A7A6A',
    statKey: 'totalVersesRead',
    target: 1000,
  },
  {
    id: 'devotee',
    name: 'Adanmış',
    description: '2500 ayet okudun',
    icon: 'infinite-outline',
    color: '#6A5A4A',
    statKey: 'totalVersesRead',
    target: 2500,
  },

  // streak — seri
  {
    id: 'streak_3',
    name: '3 Gün',
    description: '3 günlük seri yaptın',
    icon: 'flame-outline',
    color: '#E8A87C',
    statKey: 'streak',
    target: 3,
  },
  {
    id: 'streak_7',
    name: 'Bir Hafta',
    description: '7 günlük seri yaptın',
    icon: 'flame',
    color: '#E57373',
    statKey: 'streak',
    target: 7,
  },
  {
    id: 'streak_14',
    name: 'İki Hafta',
    description: '14 günlük seri yaptın',
    icon: 'flame',
    color: '#E06060',
    statKey: 'streak',
    target: 14,
  },
  {
    id: 'streak_30',
    name: 'Bir Ay',
    description: '30 günlük seri yaptın',
    icon: 'trophy-outline',
    color: '#FFD700',
    statKey: 'streak',
    target: 30,
  },
  {
    id: 'streak_100',
    name: 'Demir İrade',
    description: '100 günlük seri yaptın',
    icon: 'shield-checkmark-outline',
    color: '#D4AF37',
    statKey: 'streak',
    target: 100,
  },

  // totalNotes — not alma
  {
    id: 'note_taker',
    name: 'Not Alan',
    description: 'İlk notunu aldın',
    icon: 'create-outline',
    color: '#7C8A9A',
    statKey: 'totalNotes',
    target: 1,
  },
  {
    id: 'note_master',
    name: 'Not Ustası',
    description: '10 not aldın',
    icon: 'journal-outline',
    color: '#5A7A9A',
    statKey: 'totalNotes',
    target: 10,
  },
  {
    id: 'note_chronicler',
    name: 'Vakanüvis',
    description: '50 not aldın',
    icon: 'library',
    color: '#4A6A8A',
    statKey: 'totalNotes',
    target: 50,
  },

  // totalFavorites — favoriler
  {
    id: 'favorite',
    name: 'Sevgili Ayet',
    description: 'İlk favorini ekledin',
    icon: 'heart-outline',
    color: '#9A7C8A',
    statKey: 'totalFavorites',
    target: 1,
  },
  {
    id: 'collector',
    name: 'Koleksiyoncu',
    description: '25 favori ayet topladın',
    icon: 'heart',
    color: '#8A6A7A',
    statKey: 'totalFavorites',
    target: 25,
  },

  // gamesPlayed — oyunlar
  {
    id: 'gamer',
    name: 'Oyuncu',
    description: '10 oyun oynadın',
    icon: 'game-controller-outline',
    color: '#8A9A7C',
    statKey: 'gamesPlayed',
    target: 10,
  },
  {
    id: 'game_master',
    name: 'Oyun Ustası',
    description: '50 oyun oynadın',
    icon: 'game-controller',
    color: '#7A8A6C',
    statKey: 'gamesPlayed',
    target: 50,
  },

  // memorizeCount — ezber
  {
    id: 'memorizer',
    name: 'Ezberci',
    description: 'İlk ayeti ezberledin',
    icon: 'bulb-outline',
    color: '#C4A96A',
    statKey: 'memorizeCount',
    target: 1,
  },
  {
    id: 'memory_keeper',
    name: 'Hafız',
    description: '10 ayet ezberledin',
    icon: 'bulb',
    color: '#B4995A',
    statKey: 'memorizeCount',
    target: 10,
  },

  // reflectionsCompleted — günlük yansıma
  {
    id: 'reflector',
    name: 'Yansıyan',
    description: '7 günlük yansıma yaptın',
    icon: 'leaf-outline',
    color: '#7C9A7C',
    statKey: 'reflectionsCompleted',
    target: 7,
  },
  {
    id: 'contemplative',
    name: 'Derin Düşünür',
    description: '30 günlük yansıma yaptın',
    icon: 'leaf',
    color: '#6C8A6C',
    statKey: 'reflectionsCompleted',
    target: 30,
  },
];

export function isBadgeEarned(badge: Badge, stats: UserStats): boolean {
  return stats[badge.statKey] >= badge.target;
}

/** 0 (hiç ilerleme yok) ile 1 (kazanıldı) arasında ilerleme oranı. */
export function getBadgeProgress(badge: Badge, stats: UserStats): number {
  if (badge.target <= 0) return 1;
  return Math.min(1, Math.max(0, stats[badge.statKey] / badge.target));
}

export const checkNewBadges = (
  stats: UserStats,
  earnedBadgeIds: string[]
): Badge[] => {
  return ALL_BADGES.filter(
    (b) => isBadgeEarned(b, stats) && !earnedBadgeIds.includes(b.id)
  );
};

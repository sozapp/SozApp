import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';

import { ALL_BADGES, checkNewBadges, type UserStats } from '@/constants/badges';

type BadgeItem = (typeof ALL_BADGES)[number];

const EMPTY_STATS: UserStats = {
  streak: 0,
  totalVersesRead: 0,
  totalNotes: 0,
  totalFavorites: 0,
  gamesPlayed: 0,
  daysActive: 1,
  memorizeCount: 0,
  reflectionsCompleted: 0,
};

function parseMaybeArrayLength(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed as Record<string, unknown>).length;
    return 0;
  } catch {
    return 0;
  }
}

export function useBadges() {
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [newBadge, setNewBadge] = useState<BadgeItem | null>(null);
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);

  const loadStats = async (): Promise<UserStats> => {
    try {
      const [streak, notes, favorites, games, days, memorize, reflections] =
        await AsyncStorage.multiGet([
          '@soz/streak',
          '@soz/notes',
          '@soz/favorites',
          '@soz/totalGamesPlayed',
          '@soz/daysActive',
          '@soz/memorizeList',
          '@soz/totalReflections',
        ]);

      return {
        streak: Number(streak[1] ?? 0),
        totalVersesRead: Number(days[1] ?? 0) * 10,
        totalNotes: parseMaybeArrayLength(notes[1]),
        totalFavorites: parseMaybeArrayLength(favorites[1]),
        gamesPlayed: Number(games[1] ?? 0),
        daysActive: Number(days[1] ?? 1),
        memorizeCount: parseMaybeArrayLength(memorize[1]),
        reflectionsCompleted: Number(reflections[1] ?? 0),
      };
    } catch {
      return EMPTY_STATS;
    }
  };

  const checkBadges = async () => {
    const loadedStats = await loadStats();
    setStats(loadedStats);
    const raw = await AsyncStorage.getItem('@soz/earnedBadges');
    const earned: string[] = raw ? JSON.parse(raw) : [];

    const newOnes = checkNewBadges(loadedStats, earned);

    if (newOnes.length > 0) {
      const updated = [...earned, ...newOnes.map((b) => b.id)];
      await AsyncStorage.setItem('@soz/earnedBadges', JSON.stringify(updated));
      setEarnedBadges(updated);
      setNewBadge(newOnes[0]);
    } else {
      setEarnedBadges(earned);
    }
  };

  return { earnedBadges, newBadge, setNewBadge, checkBadges, stats, ALL_BADGES };
}

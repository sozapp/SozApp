import { ALL_BADGES, checkNewBadges, getBadgeProgress, isBadgeEarned, type UserStats } from '@/constants/badges';
import { locations } from '@/constants/map-locations';

const baseStats: UserStats = {
  streak: 0,
  totalVersesRead: 0,
  totalNotes: 0,
  totalFavorites: 0,
  gamesPlayed: 0,
  daysActive: 0,
  memorizeCount: 0,
  reflectionsCompleted: 0,
  mapLocationsVisited: 0,
};

describe('getBadgeProgress / isBadgeEarned', () => {
  const streak3 = ALL_BADGES.find((b) => b.id === 'streak_3')!;

  it('is 0 progress and not earned with no activity', () => {
    expect(getBadgeProgress(streak3, baseStats)).toBe(0);
    expect(isBadgeEarned(streak3, baseStats)).toBe(false);
  });

  it('is fractional progress before the target is reached', () => {
    const stats = { ...baseStats, streak: 1 };
    expect(getBadgeProgress(streak3, stats)).toBeCloseTo(1 / 3);
    expect(isBadgeEarned(streak3, stats)).toBe(false);
  });

  it('is earned and capped at 1 once the target is reached or exceeded', () => {
    const exact = { ...baseStats, streak: 3 };
    const over = { ...baseStats, streak: 30 };
    expect(isBadgeEarned(streak3, exact)).toBe(true);
    expect(getBadgeProgress(streak3, exact)).toBe(1);
    expect(isBadgeEarned(streak3, over)).toBe(true);
    expect(getBadgeProgress(streak3, over)).toBe(1);
  });

  it('never returns a negative or >1 progress value for any badge', () => {
    const stats = { ...baseStats, streak: -5 };
    for (const badge of ALL_BADGES) {
      const p = getBadgeProgress(badge, stats);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe('checkNewBadges', () => {
  it('returns only badges that are newly earned, excluding already-earned ones', () => {
    const stats: UserStats = { ...baseStats, daysActive: 1, streak: 3 };
    const newlyEarned = checkNewBadges(stats, ['first_step']);
    const ids = newlyEarned.map((b) => b.id);
    expect(ids).toContain('streak_3');
    expect(ids).not.toContain('first_step');
  });

  it('returns an empty list when nothing new has been earned', () => {
    const stats: UserStats = { ...baseStats, daysActive: 1 };
    expect(checkNewBadges(stats, ['first_step'])).toEqual([]);
  });

  it('earns anatolia_explorer when all map locations are visited', () => {
    const stats: UserStats = { ...baseStats, mapLocationsVisited: locations.length };
    const newlyEarned = checkNewBadges(stats, []);
    expect(newlyEarned.map((b) => b.id)).toContain('anatolia_explorer');
  });
});

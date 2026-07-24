import {
  dailySeed,
  hashSeed,
  localDateKey,
  mulberry32,
  pickDailyItems,
  seededShuffle,
} from '@/constants/seeded-random';

describe('seeded-random', () => {
  it('hashSeed is stable for the same input', () => {
    expect(hashSeed('2026-07-23:who-said')).toBe(hashSeed('2026-07-23:who-said'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('seededShuffle returns the same order for the same seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(seededShuffle(items, 99)).toEqual(seededShuffle(items, 99));
    expect(seededShuffle(items, 99)).not.toEqual(seededShuffle(items, 100));
  });

  it('pickDailyItems is stable within the same day and salt', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `q${i}`);
    const day = new Date(2026, 6, 23); // local Jul 23, 2026
    const a = pickDailyItems(pool, 10, 'who-said', day);
    const b = pickDailyItems(pool, 10, 'who-said', day);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
    expect(pickDailyItems(pool, 10, 'true-false', day)).not.toEqual(a);
  });

  it('dailySeed changes when the calendar day changes', () => {
    const d1 = new Date(2026, 6, 23);
    const d2 = new Date(2026, 6, 24);
    expect(localDateKey(d1)).toBe('2026-07-23');
    expect(dailySeed('who-said', d1)).not.toBe(dailySeed('who-said', d2));
  });
});

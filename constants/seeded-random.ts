/**
 * Güne göre deterministik karıştırma — günlük oyun sorularının herkese aynı gelmesi için.
 * Harici paket yok; mulberry32 + Fisher–Yates.
 */

/** Yerel takvim günü `YYYY-MM-DD` (gece yarısı yerel saate göre değişir). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** String'i uint32 seed'e çevirir (FNV-1a benzeri). */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Bugünün seed'i; isteğe bağlı salt (örn. oyun id) ile oyunlar birbirinden ayrılır. */
export function dailySeed(salt = '', date: Date = new Date()): number {
  const key = salt ? `${localDateKey(date)}:${salt}` : localDateKey(date);
  return hashSeed(key);
}

/** mulberry32 — tek uint32 seed'den deterministik [0, 1) üretir. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates; orijinal diziyi değiştirmez. Aynı seed → aynı sıra. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Bugünün soru seti: salt ile oyun ayrımı, count kadar dilim. */
export function pickDailyItems<T>(
  items: readonly T[],
  count: number,
  salt: string,
  date: Date = new Date(),
): T[] {
  return seededShuffle(items, dailySeed(salt, date)).slice(0, count);
}

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Örn. `@soz/game/who-said/streak` */
export function gameStreakKey(gameId: string): string {
  return `@soz/game/${gameId}/streak`;
}

/** Tamamlanan gün: `YYYY-MM-DD` (yerel takvim) */
export function gameLastCompletedDayKey(gameId: string): string {
  return `@soz/game/${gameId}/lastCompletedDay`;
}

function gameStreakLegacyKey(gameId: string): string {
  return `@soz/games/${gameId}/streak`;
}

export function localCalendarDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function readGameStreak(gameId: string): Promise<number> {
  const k = gameStreakKey(gameId);
  const leg = gameStreakLegacyKey(gameId);
  let v = await AsyncStorage.getItem(k);
  if (v == null) {
    v = await AsyncStorage.getItem(leg);
    if (v != null) {
      try {
        await AsyncStorage.setItem(k, v);
      } catch {
        /* ignore */
      }
    }
  }
  const n = parseInt(v ?? '0', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function readGameCompletedToday(gameId: string): Promise<boolean> {
  const today = localCalendarDayKey();
  try {
    const day = await AsyncStorage.getItem(gameLastCompletedDayKey(gameId));
    return day === today;
  } catch {
    return false;
  }
}

/** Oyun ekranı günü tamamlayınca çağırın */
export async function markGameCompletedToday(gameId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(gameLastCompletedDayKey(gameId), localCalendarDayKey());
  } catch {
    /* ignore */
  }
}

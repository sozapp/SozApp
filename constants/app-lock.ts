import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_LOCK_ENABLED_KEY = '@soz/appLockEnabled';
export const APP_LOCK_LAST_UNLOCK_KEY = '@soz/appLockLastUnlockAt';

/** Arka plandan dönüşte bu süre içinde tekrar sorma (ms). */
export const APP_LOCK_GRACE_MS = 30_000;

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(APP_LOCK_ENABLED_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
    if (enabled) {
      await AsyncStorage.setItem(APP_LOCK_LAST_UNLOCK_KEY, String(Date.now()));
    }
  } catch {
    /* ignore */
  }
}

export async function markAppUnlocked(): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LOCK_LAST_UNLOCK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export async function shouldPresentAppLock(): Promise<boolean> {
  if (!(await isAppLockEnabled())) return false;
  try {
    const raw = await AsyncStorage.getItem(APP_LOCK_LAST_UNLOCK_KEY);
    const last = raw != null ? parseInt(raw, 10) : 0;
    if (!Number.isFinite(last) || last <= 0) return true;
    return Date.now() - last >= APP_LOCK_GRACE_MS;
  } catch {
    return true;
  }
}

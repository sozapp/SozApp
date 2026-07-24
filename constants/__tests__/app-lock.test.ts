import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_LOCK_ENABLED_KEY,
  APP_LOCK_GRACE_MS,
  APP_LOCK_LAST_UNLOCK_KEY,
  markAppUnlocked,
  shouldPresentAppLock,
} from '@/constants/app-lock';

describe('shouldPresentAppLock', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-07-23T12:00:00.000Z') });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('appLockEnabled false iken her zaman false döner', async () => {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, 'false');
    await AsyncStorage.setItem(APP_LOCK_LAST_UNLOCK_KEY, '0');
    await expect(shouldPresentAppLock()).resolves.toBe(false);
  });

  it('enabled true + hiç unlock kaydı yokken true döner', async () => {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, 'true');
    await expect(shouldPresentAppLock()).resolves.toBe(true);
  });

  it('enabled true + grace period içinde unlock yapılmışsa false döner', async () => {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, 'true');
    await markAppUnlocked();

    jest.advanceTimersByTime(APP_LOCK_GRACE_MS - 1_000);
    await expect(shouldPresentAppLock()).resolves.toBe(false);
  });

  it('enabled true + grace period dışında true döner', async () => {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, 'true');
    await markAppUnlocked();

    jest.advanceTimersByTime(APP_LOCK_GRACE_MS + 1);
    await expect(shouldPresentAppLock()).resolves.toBe(true);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Canonical key — must match `app/index.tsx` routing. */
export const ONBOARDED_STORAGE_KEY = '@soz/onboarded';

/** Set when user finishes onboarding (`app/onboarding.tsx` → "Söz'ü Aç"). */
export const ONBOARDING_SEEN_KEY = '@soz/onboardingSeen';

/** Legacy key from older builds; still read so existing users stay "onboarded". */
const ONBOARDING_COMPLETE_LEGACY_KEY = '@soz/onboardingComplete';

export async function isOnboardingCompleteInStorage(): Promise<boolean> {
  const [canonical, legacy, seen] = await Promise.all([
    AsyncStorage.getItem(ONBOARDED_STORAGE_KEY),
    AsyncStorage.getItem(ONBOARDING_COMPLETE_LEGACY_KEY),
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY),
  ]);
  return (
    canonical === 'true' ||
    legacy === 'true' ||
    seen === 'true'
  );
}

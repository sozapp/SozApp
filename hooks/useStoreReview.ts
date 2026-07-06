import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function requestReviewIfAppropriate() {
  try {
    const hasRequested = await AsyncStorage.getItem('@soz/reviewRequested');
    if (hasRequested) return;

    const openCount = await AsyncStorage.getItem('@soz/openCount');
    const count = openCount ? parseInt(openCount, 10) : 0;

    if (count >= 3) {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
        await AsyncStorage.setItem('@soz/reviewRequested', 'true');
      }
    }
  } catch (_) {}
}

export async function incrementOpenCount() {
  try {
    const current = await AsyncStorage.getItem('@soz/openCount');
    const count = current ? parseInt(current, 10) : 0;
    await AsyncStorage.setItem('@soz/openCount', String(count + 1));
  } catch (_) {}
}

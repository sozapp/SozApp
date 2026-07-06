import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREMIUM = '@soz/isPremium';
const STORAGE_LEGACY = '@soz/premium';

async function readPremiumFlag(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_PREMIUM);
    if (v === 'true') return true;
    if (v === 'false') return false;
    const legacy = await AsyncStorage.getItem(STORAGE_LEGACY);
    if (legacy === 'true') {
      await AsyncStorage.setItem(STORAGE_PREMIUM, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const val = await readPremiumFlag();
      setIsPremium(val);
    } catch {
      setIsPremium(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const activatePremium = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_PREMIUM, 'true');
      await AsyncStorage.setItem(STORAGE_LEGACY, 'true');
      setIsPremium(true);
    } catch {
      /* ignore */
    }
  }, []);

  const deactivatePremium = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_PREMIUM, 'false');
      await AsyncStorage.setItem(STORAGE_LEGACY, 'false');
      setIsPremium(false);
    } catch {
      /* ignore */
    }
  }, []);

  return { isPremium, activatePremium, deactivatePremium };
}

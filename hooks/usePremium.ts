import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

const STORAGE_KEY = '@soz/premium';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);

  const load = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEY);
      setIsPremium(val === 'true');
    } catch (_) {
      setIsPremium(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activatePremium = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setIsPremium(true);
  }, []);

  const deactivatePremium = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'false');
    setIsPremium(false);
  }, []);

  return { isPremium, activatePremium, deactivatePremium };
}

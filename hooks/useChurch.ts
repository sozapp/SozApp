import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@soz/church';

export type ChurchGroup = {
  groupName: string;
  churchName: string;
  code: string;
  role: 'admin' | 'member';
  joinedAt: string;
  members: number;
};

export function useChurch() {
  const [church, setChurchState] = useState<ChurchGroup | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setChurchState(JSON.parse(raw) as ChurchGroup);
        } catch (_) {
          setChurchState(null);
        }
      } else {
        setChurchState(null);
      }
    });
  }, []);

  const setChurch = useCallback(async (value: ChurchGroup | null) => {
    setChurchState(value);
    if (value == null) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  }, []);

  const leaveGroup = useCallback(async () => {
    setChurchState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return { church, setChurch, leaveGroup };
}

export function generateGroupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

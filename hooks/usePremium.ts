import { supabase } from '@/constants/supabase';
import { loginRevenueCat } from '@/constants/purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import Purchases from 'react-native-purchases';

const CACHE_KEY = '@soz/premiumVerifiedCache';

type PremiumCache = {
  isPremium: boolean;
  verifiedAt: string;
};

function isProfilePremium(
  isPremium: boolean | null | undefined,
  expiresAt: string | null | undefined
): boolean {
  if (!isPremium) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt) > new Date();
}

async function readCache(): Promise<PremiumCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PremiumCache;
  } catch {
    return null;
  }
}

async function writeCache(isPremium: boolean): Promise<void> {
  try {
    const payload: PremiumCache = { isPremium, verifiedAt: new Date().toISOString() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

async function checkRevenueCatPremium(): Promise<boolean | null> {
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active.premium !== undefined;
  } catch {
    return null;
  }
}

async function checkSupabasePremium(): Promise<boolean | null> {
  if (!supabase) return null;
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) return null;

    const userId = sessionData.session.user.id;
    const { data, error } = await supabase
      .from('profiles')
      .select('is_premium, premium_expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    const profile = data as { is_premium: boolean | null; premium_expires_at: string | null };
    return isProfilePremium(profile.is_premium, profile.premium_expires_at);
  } catch {
    return null;
  }
}

function mergePremium(rc: boolean | null, db: boolean | null, cache: boolean | null): boolean {
  if (rc === true || db === true) return true;
  if (rc === false && db === false) return false;
  if (rc === false && db === null) return false;
  if (db === false && rc === null) return false;
  return cache === true;
}

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremium = useCallback(async () => {
    setIsLoading(true);
    try {
      const cache = await readCache();
      const [rc, db] = await Promise.all([checkRevenueCatPremium(), checkSupabasePremium()]);
      const merged = mergePremium(rc, db, cache?.isPremium ?? null);

      if (rc !== null || db !== null) {
        await writeCache(merged);
        setIsPremium(merged);
      } else if (cache) {
        setIsPremium(cache.isPremium);
      } else {
        setIsPremium(false);
      }
    } catch {
      const cache = await readCache();
      setIsPremium(cache?.isPremium ?? false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPremium();
  }, [refreshPremium]);

  useFocusEffect(
    useCallback(() => {
      void refreshPremium();
    }, [refreshPremium])
  );

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void refreshPremium();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [refreshPremium]);

  return { isPremium, isLoading, refreshPremium };
}

/** RevenueCat app_user_id = Supabase auth user id (anonim dahil). */
export async function syncRevenueCatWithSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user?.id) return;
    await loginRevenueCat(data.session.user.id);
  } catch (e) {
    console.warn('syncRevenueCatWithSupabase:', e);
  }
}

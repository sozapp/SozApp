import { AppLockScreen } from '@/components/AppLockScreen';
import {
  markAppUnlocked,
  shouldPresentAppLock,
} from '@/constants/app-lock';
import { useTranslation } from '@/context/LanguageContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Arka plandan dönüşte (veya soğuk açılışta) opsiyonel Face ID kilidi.
 * Varsayılan kapalı — @soz/appLockEnabled flag'i gerekir.
 */
export function AppLockGate() {
  const { t } = useTranslation();
  const [locked, setLocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const checkingRef = useRef(false);

  const evaluateLock = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const need = await shouldPresentAppLock();
      setLocked(need);
    } catch (e) {
      console.warn('[AppLock] evaluate failed:', e);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void evaluateLock();
  }, [evaluateLock]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        void evaluateLock();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [evaluateLock]);

  const handleUnlocked = useCallback(() => {
    void markAppUnlocked();
    setLocked(false);
  }, []);

  return (
    <AppLockScreen
      visible={locked}
      unlockLabel={t('appLockUnlock')}
      hintLabel={t('appLockHint')}
      onUnlocked={handleUnlocked}
    />
  );
}

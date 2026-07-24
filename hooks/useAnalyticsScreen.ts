import { trackScreen } from '@/constants/analytics';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

/** Bir ekran her odaklandığında PostHog'a 'screen' event'i gönderir. */
export function useAnalyticsScreen(screenName: string): void {
  useFocusEffect(
    useCallback(() => {
      trackScreen(screenName);
    }, [screenName])
  );
}

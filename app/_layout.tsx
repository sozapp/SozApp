import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/cormorant-garamond';
import * as SplashScreen from 'expo-splash-screen';
import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerForPushNotifications } from '@/hooks/useNotifications';
import { incrementOpenCount, requestReviewIfAppropriate } from '@/hooks/useStoreReview';
import { AmbientMusicProvider } from '@/context/AmbientMusicContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { SpeechProvider } from '@/context/SpeechContext';
import { TabPulseProvider } from '@/context/TabPulseContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RootLayoutContent } from '@/components/RootLayoutContent';
import SozSplashScreen from '@/components/SplashScreen';
import { isOnboardingCompleteInStorage } from '@/constants/onboarding-storage';
import { setupNotificationHandler } from '@/constants/notifications';
import { initSentry } from '@/constants/sentry';
import { initAnalytics } from '@/constants/analytics';

// Crash/error reporting en erken noktada başlamalı — splash screen'i bile
// gizlemeden önce, ki uygulama açılışında olan crash'ler de yakalanabilsin.
initSentry();
void initAnalytics();
SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

export default function RootLayout() {
  const pathname = usePathname();
  const postOnboardingInitDone = useRef(false);
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_400Regular_Italic,
  });
  const [showSplash, setShowSplash] = useState(true);
  const splashHiddenRef = useRef(false);

  const hideNativeSplash = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      hideNativeSplash();
    }
  }, [fontsLoaded, fontError, hideNativeSplash]);

  // Fonts asla gelmezse native splash'te kalmamak için
  useEffect(() => {
    const t = setTimeout(hideNativeSplash, 4000);
    return () => clearTimeout(t);
  }, [hideNativeSplash]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!(await isOnboardingCompleteInStorage())) return;
      if (postOnboardingInitDone.current || cancelled) return;
      postOnboardingInitDone.current = true;
      try {
        await registerForPushNotifications();
      } catch (e) {
        console.warn('Push notifications init:', e);
      }

      try {
        await incrementOpenCount();
      } catch (e) {
        console.warn('Open count:', e);
      }

      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 3000));
        if (cancelled) return;
        await requestReviewIfAppropriate();
      } catch (e) {
        console.warn('Store review:', e);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const fontsReady = fontsLoaded || !!fontError;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A0A08' }}>
      <ErrorBoundary>
        {fontsReady ? (
          <ThemeProvider>
            <AmbientMusicProvider>
              <SpeechProvider>
                <LanguageProvider>
                  <NetworkProvider>
                    <TabPulseProvider>
                      <RootLayoutContent />
                    </TabPulseProvider>
                  </NetworkProvider>
                </LanguageProvider>
              </SpeechProvider>
            </AmbientMusicProvider>
          </ThemeProvider>
        ) : null}

        {showSplash && (
          <SozSplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

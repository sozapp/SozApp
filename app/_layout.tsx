import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/cormorant-garamond';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerForPushNotifications } from '@/hooks/useNotifications';
import { incrementOpenCount, requestReviewIfAppropriate } from '@/hooks/useStoreReview';
import { AmbientMusicProvider } from '@/context/AmbientMusicContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { RootLayoutContent } from '@/components/RootLayoutContent';
import SozSplashScreen from '@/components/SplashScreen';
import { isOnboardingCompleteInStorage } from '@/constants/onboarding-storage';
import { setupNotificationHandler } from '@/constants/notifications';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const postOnboardingInitDone = useRef(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_400Regular_Italic,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

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

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const type = response.notification.request.content.data?.type;
        if (type === 'daily_verse') router.push('/(tabs)/read');
        if (type === 'streak_reminder') router.push('/(tabs)/index');
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AmbientMusicProvider>
          <LanguageProvider>
            <NetworkProvider>
              <RootLayoutContent />
            </NetworkProvider>
          </LanguageProvider>
        </AmbientMusicProvider>
      </ThemeProvider>

      {showSplash && (
        <SozSplashScreen onFinish={() => setShowSplash(false)} />
      )}
    </GestureHandlerRootView>
  );
}

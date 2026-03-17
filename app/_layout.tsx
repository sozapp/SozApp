import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/cormorant-garamond';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { registerForPushNotifications } from '@/hooks/useNotifications';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    function redirectToRead() {
      router.push('/(tabs)/read');
    }

    const last = Notifications.getLastNotificationResponseAsync();
    last.then((response) => {
      if (response?.notification) redirectToRead();
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification) redirectToRead();
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

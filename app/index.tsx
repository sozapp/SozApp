import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

const ONBOARDED_KEY = '@soz/onboarded';

export default function Index() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDED_KEY).then((value) => {
      if (!cancelled) setOnboarded(value === 'true');
    });
    return () => { cancelled = true; };
  }, []);

  if (onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: '#0A0A08' }} />;
  }

  return onboarded ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding" />;
}

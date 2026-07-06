import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isOnboardingCompleteInStorage } from '@/constants/onboarding-storage';
import { supabase } from '@/constants/supabase';

export default function Index() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doneOnboarding = await isOnboardingCompleteInStorage();
        if (!cancelled) {
          setOnboarded(doneOnboarding);
        }
        // İlk kurulum / onboarding sırasında Supabase çağrısı yok (tamamen çevrimdışı akış).
        if (!doneOnboarding) {
          if (!cancelled) setHasSession(false);
          return;
        }
        if (!supabase) {
          console.log('Supabase not available, using local storage');
          if (!cancelled) setHasSession(false);
          return;
        }
        const sessionRes = await supabase.auth
          .getSession()
          .catch(() => ({ data: { session: null } }));
        const session = sessionRes.data.session;
        const isRealUser = session?.user && !session.user.is_anonymous && session.user.email;
        if (!cancelled) setHasSession(!!isRealUser);
      } catch (_) {
        if (!cancelled) {
          setHasSession(false);
          setOnboarded(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (hasSession === null || onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: '#0A0A08' }} />;
  }

  if (hasSession) return <Redirect href="/(tabs)" />;

  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

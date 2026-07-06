import { OfflineBanner } from '@/components/OfflineBanner';
import { isOnlineFromNetInfo, useNetwork } from '@/context/NetworkContext';
import { useTheme } from '@/hooks/useTheme';
import { useBadges } from '@/hooks/useBadges';
import { SozAlert } from '@/components/SozAlert';
import { useSync } from '@/hooks/useSync';
import { router, Stack, useFocusEffect, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { isOnboardingCompleteInStorage } from '@/constants/onboarding-storage';
import { initPurchases } from '@/constants/purchases';
import { supabase } from '@/constants/supabase';
import { syncRevenueCatWithSupabase } from '@/hooks/usePremium';
import { useSozAlert } from '@/hooks/useSozAlert';
import { BlurView } from 'expo-blur';
import { Animated, StyleSheet } from 'react-native';

const LAST_SYNC_KEY = '@soz/lastSyncTime';
const ACCENT = '#C4956A';
const CONFETTI_COLORS = [ACCENT, '#7C9A8A', '#9A7C8A', '#FFF8EE'] as const;

export function RootLayoutContent() {
  const pathname = usePathname();
  const { colors, fonts } = useTheme();
  const { syncAll } = useSync();
  const { isOffline, isOnline } = useNetwork();
  const { newBadge, setNewBadge, checkBadges } = useBadges();
  const wasOfflineRef = useRef(false);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(1)).current;
  const confettiAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const confettiLoopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useFocusEffect(
    useCallback(() => {
      void checkBadges();
    }, [checkBadges])
  );

  useEffect(() => {
    if (isOffline) wasOfflineRef.current = true;
    if (isOnline && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      void isOnboardingCompleteInStorage().then((done) => {
        if (!done) return;
        if (!supabase) {
          console.log('Supabase not available, using local storage');
          return;
        }
        try {
          syncAll(() => {
            AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()).catch(() => {});
          });
          showAlert('Söz', 'Veriler senkronize edildi.');
        } catch {
          /* ignore */
        }
      });
    }
  }, [isOnline, isOffline, syncAll, showAlert]);

  useEffect(() => {
    let cancelled = false;
    async function ensureSessionAndSync() {
      try {
        if (!(await isOnboardingCompleteInStorage()) || cancelled) return;
        if (!supabase) {
          console.log('Supabase not available, using local storage');
          return;
        }
        const net = await NetInfo.fetch();
        if (!isOnlineFromNetInfo(net) || cancelled) return;
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Supabase session:', error.message);
            return;
          }
          if (!data.session && !cancelled) {
            const { error: signErr } = await supabase.auth.signInAnonymously();
            if (signErr) console.warn('Supabase anon sign-in:', signErr.message);
          }
          initPurchases();
          await syncRevenueCatWithSupabase();
        } catch (e) {
          console.warn('Supabase bağlantı:', e);
          return;
        }
        if (!cancelled) {
          syncAll(() => {
            AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()).catch(() => {});
          });
        }
      } catch (e) {
        console.warn('Session / sync init:', e);
      }
    }
    ensureSessionAndSync();
    return () => {
      cancelled = true;
    };
  }, [pathname, syncAll]);

  useEffect(() => {
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          void syncRevenueCatWithSupabase();
          void isOnboardingCompleteInStorage().then((done) => {
            if (!done) return;
            NetInfo.fetch()
              .then((net) => {
                if (!isOnlineFromNetInfo(net)) return;
                syncAll(() => {
                  AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()).catch(() => {});
                });
              })
              .catch((e) => {
                console.warn('NetInfo (auth sync):', e);
              });
          });
        }
      } catch (e) {
        console.log('[Sync] onAuthStateChange error:', e);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncAll]);

  useEffect(() => {
    function redirectToRead() {
      router.push('/(tabs)/read');
    }
    (async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification) redirectToRead();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('Notification last response:', msg);
      }
    })();
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        if (response.notification) redirectToRead();
      } catch (e: unknown) {
        console.warn('Notification listener:', e);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!newBadge) return;

    slideAnim.setValue(300);
    pulseAnim.setValue(1);
    modalOpacityAnim.setValue(1);
    modalScaleAnim.setValue(1);
    confettiAnims.forEach((anim) => anim.setValue(0));

    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();

    pulseLoopRef.current?.stop();
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();

    confettiLoopsRef.current.forEach((anim) => anim.stop());
    confettiLoopsRef.current = confettiAnims.map((anim, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(idx * 70),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1700 + (idx % 3) * 180,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );
    confettiLoopsRef.current.forEach((anim) => anim.start());

    return () => {
      pulseLoopRef.current?.stop();
      confettiLoopsRef.current.forEach((anim) => anim.stop());
    };
  }, [newBadge, slideAnim, pulseAnim, modalOpacityAnim, modalScaleAnim, confettiAnims]);

  const dismissBadgeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(modalScaleAnim, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNewBadge(null);
      modalOpacityAnim.setValue(1);
      modalScaleAnim.setValue(1);
      slideAnim.setValue(300);
    });
  }, [modalOpacityAnim, modalScaleAnim, setNewBadge, slideAnim]);

  return (
    <View style={{ flex: 1 }}>
      {isOffline ? <OfflineBanner /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 250,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      />
      {newBadge ? (
        <Modal transparent animationType="fade">
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.75)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: modalOpacityAnim,
            }}
          >
            <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
            {confettiAnims.map((anim, idx) => {
              const startX = 12 + idx * 30;
              const drift = (idx % 2 === 0 ? 1 : -1) * (8 + (idx % 4) * 4);
              return (
                <Animated.View
                  key={`confetti-${idx}`}
                  style={{
                    position: 'absolute',
                    top: -20,
                    left: startX,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-40, 720],
                        }),
                      },
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, drift],
                        }),
                      },
                    ],
                    opacity: anim.interpolate({
                      inputRange: [0, 0.85, 1],
                      outputRange: [0, 1, 0],
                    }),
                  }}
                />
              );
            })}
            <Animated.View
              style={{
                backgroundColor: colors.card,
                borderRadius: 24,
                padding: 32,
                alignItems: 'center',
                gap: 16,
                marginHorizontal: 32,
                borderWidth: 1,
                borderColor: `${newBadge.color}60`,
                transform: [{ translateY: slideAnim }, { scale: modalScaleAnim }],
              }}
            >
              <View style={{ width: 130, height: 130, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    position: 'absolute',
                    width: 130,
                    height: 130,
                    borderRadius: 65,
                    backgroundColor: `${ACCENT}15`,
                  }}
                />
                <Animated.View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: `${ACCENT}25`,
                    borderWidth: 3,
                    borderColor: ACCENT,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <Ionicons name={newBadge.icon as keyof typeof Ionicons.glyphMap} size={40} color={newBadge.color} />
                </Animated.View>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: ACCENT,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontFamily: fonts.regular,
                }}
              >
                YENI ROZET
              </Text>
              <Text style={{ fontSize: 28, fontFamily: fonts.regular, color: colors.text }}>
                {newBadge.name}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontFamily: fonts.regular,
                  lineHeight: 22,
                  paddingHorizontal: 20,
                }}
              >
                {newBadge.description}
              </Text>
              <TouchableOpacity
                onPress={dismissBadgeModal}
                style={{
                  backgroundColor: ACCENT,
                  borderRadius: 16,
                  paddingVertical: 14,
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF8EE', fontSize: 16, fontFamily: fonts.regular }}>Harika!</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
      ) : null}
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </View>
  );
}

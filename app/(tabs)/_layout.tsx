import { fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useTabPulse } from '@/context/TabPulseContext';
import {
  ScrollToTopProvider,
  useScrollToTopRegistry,
  type TabScrollKey,
} from '@/context/ScrollToTopContext';
import { useTheme } from '@/hooks/useTheme';
import { useWidgetUpdate } from '@/hooks/useWidgetUpdate';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Tabs, router, usePathname } from 'expo-router';
import { forwardRef, useCallback, useEffect, useRef, useState, type Ref } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// ─── Tab sırası ───────────────────────────────────────────────────────────────
const TAB_ROUTES = [
  '/(tabs)/index',
  '/(tabs)/read',
  '/(tabs)/explore',
  '/(tabs)/notes',
  '/(tabs)/profile',
] as const;

const TAB_NAMES = ['index', 'read', 'explore', 'notes', 'profile'] as const;

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_SWIPE_ENABLED = false;

const getTabIndex = (path: string): number => {
  if (path === '/(tabs)' || path === '/(tabs)/' || path.endsWith('/index')) return 0;
  if (path.includes('/read')) return 1;
  if (path.includes('/explore')) return 2;
  if (path.includes('/notes')) return 3;
  if (path.includes('/profile')) return 4;
  return 0;
};

function tabKeyForIndex(index: number): TabScrollKey | null {
  const name = TAB_NAMES[index];
  if (name === 'index' || name === 'read' || name === 'explore' || name === 'notes' || name === 'profile') {
    return name;
  }
  return null;
}

// ─── BouncingTabBarButton ─────────────────────────────────────────────────────
const BouncingTabBarButton = forwardRef<View, BottomTabBarButtonProps>(
  function BouncingTabBarButton(
    { children, onPress, style, accessibilityState, accessibilityLabel, testID, href },
    ref
  ) {
    const reduceMotion = useReduceMotion();
    const scale = useRef(new Animated.Value(1)).current;
    return (
      <Pressable
        ref={ref as React.Ref<View>}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        {...(href != null ? ({ href } as { href: string }) : {})}
        onPress={(e) => {
          if (!reduceMotion) {
            Animated.sequence([
              Animated.timing(scale, { toValue: 1.3, duration: 100, useNativeDriver: false }),
              Animated.spring(scale, { toValue: 1, useNativeDriver: false, friction: 5, tension: 200 }),
            ]).start();
          }
          onPress?.(e);
        }}
        style={style}
      >
        <Animated.View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}
        >
          {children}
        </Animated.View>
      </Pressable>
    );
  }
);

// ─── NotesTabIcon ─────────────────────────────────────────────────────────────
// Diğer ekranlardan (Oku, Odaklan vb.) TabPulseContext üzerinden tetiklenen
// "kaydedildi" zıplama animasyonu — BouncingTabBarButton'daki basma animasyonundan
// bağımsız, dışarıdan sinyal ile çalışır.
function NotesTabIcon({ color, size }: { color: string; size: number }) {
  const { notesPulseSignal } = useTabPulse();
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 0 = henüz hiç pulse tetiklenmedi (mount anında zıplama olmasın)
    if (notesPulseSignal === 0) return;
    pulseScale.setValue(1);
    pulseTranslateY.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.3, duration: 120, useNativeDriver: false }),
        Animated.spring(pulseScale, { toValue: 1, useNativeDriver: false, friction: 5, tension: 200 }),
      ]),
      Animated.sequence([
        Animated.timing(pulseTranslateY, { toValue: -6, duration: 120, useNativeDriver: false }),
        Animated.spring(pulseTranslateY, { toValue: 0, useNativeDriver: false, friction: 5, tension: 200 }),
      ]),
    ]).start();
  }, [notesPulseSignal, pulseScale, pulseTranslateY]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseScale }, { translateY: pulseTranslateY }] }}>
      <Ionicons name="bookmark-outline" size={size} color={color} />
    </Animated.View>
  );
}

// ─── TabLabel ─────────────────────────────────────────────────────────────────
const ACCENT = '#C4956A';
const INACTIVE = 'rgba(196, 149, 106, 0.42)';

function TabLabel({ children, color }: { children: string; color: string }) {
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={{ fontSize: 11, color, fontFamily: fonts.medium, textAlign: 'center', maxWidth: '100%' }}
    >
      {children}
    </Text>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <ScrollToTopProvider>
      <TabsLayoutInner />
    </ScrollToTopProvider>
  );
}

function TabsLayoutInner() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { scrollToTop } = useScrollToTopRegistry();
  useWidgetUpdate();

  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Swipe navigasyon devre dışı bırakılacak ekranlar
  const swipeDisabled = pathname.includes('read');

  // Güncel tab indeksi (stale closure için ref)
  const currentTabIndex = getTabIndex(pathname);
  const currentTabIndexRef = useRef(currentTabIndex);
  const swipeDisabledRef = useRef(swipeDisabled);
  useEffect(() => {
    currentTabIndexRef.current = currentTabIndex;
    swipeDisabledRef.current = swipeDisabled;
  }, [currentTabIndex, swipeDisabled]);

  /** Zaten aktif tab'a tekrar basınca scroll-to-top (navigasyonu engellemeden). */
  const tabPressListeners = useCallback(
    (tabIndex: number) => ({
      tabPress: () => {
        if (getTabIndex(pathnameRef.current) !== tabIndex) return;
        const key = tabKeyForIndex(tabIndex);
        if (key) scrollToTop(key);
      },
    }),
    [scrollToTop]
  );

  // ─── Animasyon değerleri ─────────────────────────────────────────────────
  const tabIndicatorX = useRef(new Animated.Value(currentTabIndex * (SCREEN_WIDTH / 5))).current;
  const swipeTranslateX = useRef(new Animated.Value(0)).current;
  const navigationFlash = useRef(new Animated.Value(0)).current;

  // ─── Swipe ipucu ─────────────────────────────────────────────────────────
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeHintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('@soz/swipeHintSeen').then((seen) => {
      if (!seen) {
        setShowSwipeHint(true);
        Animated.timing(swipeHintOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
        setTimeout(() => {
          Animated.timing(swipeHintOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }).start(() => setShowSwipeHint(false));
          AsyncStorage.setItem('@soz/swipeHintSeen', 'true');
        }, 2800);
      }
    });
  }, [swipeHintOpacity]);

  // Pathname değişince tab indicator'ı güncelle
  useEffect(() => {
    const idx = getTabIndex(pathname);
    Animated.spring(tabIndicatorX, {
      toValue: idx * (SCREEN_WIDTH / 5),
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [pathname, tabIndicatorX]);

  // ─── Navigasyon fonksiyonu ────────────────────────────────────────────────
  const isNavigatingRef = useRef(false);

  const navigateToTab = useCallback(
    (index: number) => {
      if (index < 0 || index >= TAB_NAMES.length) return;
      if (index === currentTabIndexRef.current) return;
      if (isNavigatingRef.current) return;

      isNavigatingRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Kısa flash efekti
      Animated.sequence([
        Animated.timing(navigationFlash, {
          toValue: 0.07,
          duration: 70,
          useNativeDriver: false,
        }),
        Animated.timing(navigationFlash, {
          toValue: 0,
          duration: 120,
          useNativeDriver: false,
        }),
      ]).start();

      // Tab indicator animasyonu
      Animated.spring(tabIndicatorX, {
        toValue: index * (SCREEN_WIDTH / 5),
        tension: 100,
        friction: 14,
        useNativeDriver: false,
      }).start();

      router.push(TAB_ROUTES[index] as string);

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 300);
    },
    [navigationFlash, tabIndicatorX]
  );

  // ─── PanResponder ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Alt component'ler önce yakalasın (ScrollView, FlatList vs.)
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!TAB_SWIPE_ENABLED) return false;
        // Read ekranında asla yakala
        if (swipeDisabledRef.current) return false;

        const { dx, dy } = gestureState;

        // Güçlü yatay hareket eşiği — scroll ile çakışmasın
        const isStronglyHorizontal =
          Math.abs(dx) > Math.abs(dy) * 2.5 && Math.abs(dx) > 15;

        return isStronglyHorizontal;
      },

      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;
        const idx = currentTabIndexRef.current;

        // Kenar direnci: ilk/son tab'dayken fazla çekmeye izin verme
        let adjustedDx = dx;
        if (idx === 0 && dx > 0) adjustedDx = dx * 0.12;
        if (idx === TAB_NAMES.length - 1 && dx < 0) adjustedDx = dx * 0.12;

        // Genel direnç (tab geçişi çok hızlı olmasın)
        adjustedDx *= 0.35;

        Animated.timing(swipeTranslateX, {
          toValue: adjustedDx,
          duration: 0,
          useNativeDriver: false,
        }).start();
      },

      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;

        const swipedEnough = Math.abs(dx) > SWIPE_THRESHOLD;
        const fastEnough = Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD;

        if (swipedEnough || fastEnough) {
          if (dx < 0) {
            // Sola → sonraki tab
            const next = currentTabIndexRef.current + 1;
            if (next < TAB_NAMES.length) navigateToTab(next);
          } else {
            // Sağa → önceki tab
            const prev = currentTabIndexRef.current - 1;
            if (prev >= 0) navigateToTab(prev);
          }
        }

        // Pozisyona geri döndür
        Animated.spring(swipeTranslateX, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: false,
        }).start();
      },

      onPanResponderTerminate: () => {
        Animated.spring(swipeTranslateX, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const barBg = theme.surface;

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      {/* İçerik alanı — hafif swipe hissi */}
      <Animated.View style={[styles.content, { transform: [{ translateX: swipeTranslateX }] }]}>
        <Tabs
          screenOptions={{
            swipeEnabled: false,
            headerShown: false,
            tabBarButton: ({ ref, ...rest }) => (
              <BouncingTabBarButton ref={ref as Ref<View>} {...rest} />
            ),
            tabBarActiveTintColor: ACCENT,
            tabBarInactiveTintColor: INACTIVE,
            tabBarStyle: {
              backgroundColor: barBg,
              borderTopColor: 'rgba(196,149,80,0.12)',
            },
            tabBarItemStyle: { flex: 1, paddingVertical: 4 },
            tabBarLabel: ({ color, children }) => (
              <TabLabel color={color}>{String(children)}</TabLabel>
            ),
          }}
        >
          <Tabs.Screen
            name="index"
            listeners={tabPressListeners(0)}
            options={{
              title: t('tabHome'),
              tabBarAccessibilityLabel: t('tabHome'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="read"
            listeners={tabPressListeners(1)}
            options={{
              title: t('tabRead'),
              tabBarAccessibilityLabel: t('tabRead'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="book-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="explore"
            listeners={tabPressListeners(2)}
            options={{
              title: t('tabExplore'),
              tabBarAccessibilityLabel: t('tabExplore'),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? 'compass' : 'compass-outline'}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="notes"
            listeners={tabPressListeners(3)}
            options={{
              title: t('tabNotes'),
              tabBarAccessibilityLabel: t('tabNotes'),
              tabBarIcon: ({ color, size }) => (
                <NotesTabIcon color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            listeners={tabPressListeners(4)}
            options={{
              title: t('tabProfile'),
              tabBarAccessibilityLabel: t('tabProfile'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen name="plans" options={{ href: null }} />
          <Tabs.Screen name="calendar" options={{ href: null }} />
          <Tabs.Screen name="map" options={{ href: null }} />
          <Tabs.Screen name="ask" options={{ href: null }} />
          <Tabs.Screen name="share-card" options={{ href: null }} />
        </Tabs>
      </Animated.View>

      {/* Tab indicator çizgisi — tab bar'ın üstünde */}
      <View style={styles.tabIndicatorTrack} pointerEvents="none">
        <Animated.View
          style={[styles.tabIndicatorBar, { transform: [{ translateX: tabIndicatorX }] }]}
        />
      </View>

      {/* Geçiş flash overlay */}
      <Animated.View
        style={[styles.flashOverlay, { opacity: navigationFlash }]}
        pointerEvents="none"
      />

      {/* Swipe ipucu banner (ilk kullanımda) */}
      {showSwipeHint && (
        <Animated.View style={[styles.swipeHintBanner, { opacity: swipeHintOpacity }]}>
          <Text style={styles.swipeHintText}>{t('swipeTabHint')}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabIndicatorTrack: {
    position: 'absolute',
    bottom: 83,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'transparent',
  },
  tabIndicatorBar: {
    width: SCREEN_WIDTH / 5,
    height: 1.5,
    backgroundColor: ACCENT,
    borderRadius: 1,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ACCENT,
    zIndex: 999,
  },
  swipeHintBanner: {
    position: 'absolute',
    bottom: 96,
    left: 40,
    right: 40,
    backgroundColor: 'rgba(196,149,80,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.4)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: ACCENT,
    fontStyle: 'italic',
    fontFamily: fonts.italic,
    letterSpacing: 0.05,
  },
});

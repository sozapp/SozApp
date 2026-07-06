import { useHaptics } from '@/hooks/useHaptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Dimensions, PanResponder } from 'react-native';

const TAB_ORDER = ['index', 'read', 'explore', 'notes', 'profile'] as const;
export type TabName = (typeof TAB_ORDER)[number];

const EDGE_THRESHOLD = 32;
const SWIPE_THRESHOLD = 60;
const VERTICAL_THRESHOLD = 50;

function getPrevTab(current: TabName): TabName | null {
  const i = TAB_ORDER.indexOf(current);
  return i > 0 ? TAB_ORDER[i - 1]! : null;
}

function getNextTab(current: TabName): TabName | null {
  const i = TAB_ORDER.indexOf(current);
  return i >= 0 && i < TAB_ORDER.length - 1 ? TAB_ORDER[i + 1]! : null;
}

/**
 * PanResponder for switching tabs by swiping from screen edges.
 * Left edge + swipe right → previous tab; right edge + swipe left → next tab.
 * Attach to root container: {...panHandlers}
 */
export function useTabSwipe(currentTab: TabName) {
  const router = useRouter();
  const haptics = useHaptics();
  const startXRef = useRef(0);
  const screenWidth = Dimensions.get('window').width;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onPanResponderGrant: (e) => {
          startXRef.current = e.nativeEvent.pageX;
        },
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 20 && Math.abs(g.dy) < VERTICAL_THRESHOLD,
        onPanResponderRelease: (_, g) => {
          const startX = startXRef.current;
          const prev = getPrevTab(currentTab);
          const next = getNextTab(currentTab);
          if (startX < EDGE_THRESHOLD && g.dx > SWIPE_THRESHOLD && prev) {
            try {
              haptics.light();
            } catch {
              /* ignore */
            }
            router.replace(`/(tabs)/${prev}` as any);
          } else if (
            startX > screenWidth - EDGE_THRESHOLD &&
            g.dx < -SWIPE_THRESHOLD &&
            next
          ) {
            try {
              haptics.light();
            } catch {
              /* ignore */
            }
            router.replace(`/(tabs)/${next}` as any);
          }
        },
      }),
    [currentTab, router, haptics, screenWidth]
  );

  return panResponder.panHandlers;
}

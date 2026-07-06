import { useHaptics } from '@/hooks/useHaptics';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { PanResponder } from 'react-native';

const SWIPE_THRESHOLD = 80;
const VERTICAL_THRESHOLD = 50;

/**
 * PanResponder for "swipe right to go back" on stack/modal screens.
 * Attach to the root container: {...panHandlers}
 */
export function useSwipeBack() {
  const router = useRouter();
  const haptics = useHaptics();

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          g.dx > 30 && Math.abs(g.dy) < VERTICAL_THRESHOLD,
        onPanResponderRelease: (_, g) => {
          if (g.dx > SWIPE_THRESHOLD && Math.abs(g.dy) < VERTICAL_THRESHOLD) {
            try {
              haptics.light();
            } catch {
              /* ignore */
            }
            router.back();
          }
        },
      }),
    [router, haptics]
  );

  return panResponder.panHandlers;
}

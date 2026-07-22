import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';

export function useHaptics() {
  const light = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  }, []);

  const medium = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
  }, []);

  const success = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  }, []);

  const error = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (_) {}
  }, []);

  const selection = useCallback(() => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
  }, []);

  return useMemo(
    () => ({ light, medium, success, error, selection }),
    [light, medium, success, error, selection]
  );
}

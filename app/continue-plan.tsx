import { resolveContinueReadingDestination } from '@/constants/continueReading';
import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const ACCENT = '#C4956A';

/** Home Screen Quick Action "Devam Et" → okuma planındaki kaldığın bölüm. */
export default function ContinuePlanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const dest = await resolveContinueReadingDestination();
        router.replace(dest as never);
      } catch (e) {
        console.warn('[ContinuePlan] resolve failed:', e);
        router.replace('/(tabs)/read' as never);
      }
    })();
  }, [router]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={ACCENT} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

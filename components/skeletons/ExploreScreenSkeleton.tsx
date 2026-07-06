import { SkeletonBox } from '@/components/SkeletonLoader';
import { useTheme } from '@/hooks/useTheme';
import { Dimensions, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 20;
const GAP = 12;
const CELL_W = (SCREEN_W - PAD * 2 - GAP) / 2;

export function ExploreScreenSkeleton() {
  const { theme } = useTheme();
  const bg = theme.background ?? '#0A0A08';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <SkeletonBox width={100} height={32} borderRadius={6} />
        <SkeletonBox width={180} height={16} borderRadius={4} />
      </View>
      <View style={styles.container}>
        <View style={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonBox
              key={i}
              width={CELL_W}
              height={90}
              borderRadius={12}
            />
          ))}
        </View>
        <SkeletonBox width={160} height={20} borderRadius={4} />
        <View style={styles.hScroll}>
          {[1, 2, 3].map((i) => (
            <SkeletonBox
              key={i}
              width={140}
              height={180}
              borderRadius={12}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
  },
  container: {
    padding: PAD,
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  hScroll: {
    flexDirection: 'row',
    gap: 12,
  },
});

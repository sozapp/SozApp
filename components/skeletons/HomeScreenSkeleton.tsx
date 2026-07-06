import { SkeletonBox } from '@/components/SkeletonLoader';
import { useTheme } from '@/hooks/useTheme';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function HomeScreenSkeleton() {
  const { theme } = useTheme();
  const bg = theme.background ?? '#0A0A08';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <SkeletonBox width={80} height={36} borderRadius={6} />
          <View style={styles.headerRight}>
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <SkeletonBox width={36} height={36} borderRadius={18} />
          </View>
        </View>
        <SkeletonBox width="100%" height={130} borderRadius={12} style={styles.block} />
        <SkeletonBox width="100%" height={80} borderRadius={12} style={styles.block} />
        <SkeletonBox width="100%" height={60} borderRadius={12} style={styles.block} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  block: {
    alignSelf: 'stretch',
  },
});

import { SkeletonBox } from '@/components/SkeletonLoader';
import { useTheme } from '@/hooks/useTheme';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VERSE_LINE_WIDTHS = ['75%', '80%', '65%', '90%', '70%', '85%', '72%'] as const;

export function ReadScreenSkeleton() {
  const { theme } = useTheme();
  const bg = theme.background ?? '#0A0A08';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.container}>
        <SkeletonBox
          width={160}
          height={28}
          borderRadius={6}
          style={styles.title}
        />
        <View style={styles.toolbar}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBox key={i} width={44} height={44} borderRadius={8} />
          ))}
        </View>
        <View style={styles.verses}>
          {VERSE_LINE_WIDTHS.map((w, i) => (
            <View key={i} style={styles.verseRow}>
              <SkeletonBox width={24} height={20} borderRadius={4} />
              <SkeletonBox width={w} height={20} borderRadius={4} style={styles.verseText} />
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: 20,
    gap: 14,
  },
  title: {
    alignSelf: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  verses: {
    gap: 14,
    marginTop: 8,
  },
  verseRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  verseText: {},
});

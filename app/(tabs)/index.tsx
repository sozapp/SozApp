import { plans } from '@/constants/plans';
import { getPlanProgress } from '@/constants/storage';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlanProgress } from '@/constants/storage';

const DEFAULT_PLAN_ID = 'yeni-ahit-30';

function getCurrentDay(progress: PlanProgress | null, totalDays: number): number {
  if (progress == null) return 1;
  const start = new Date(progress.startDate).getTime();
  const now = Date.now();
  const dayIndex = Math.floor((now - start) / 86400000);
  return Math.min(totalDays, Math.max(1, dayIndex + 1));
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(isDark);
  const [planProgress, setPlanProgress] = useState<PlanProgress | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      const p = await getPlanProgress(DEFAULT_PLAN_ID);
      setPlanProgress(p);
    } catch (_) {
      setPlanProgress(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const effectiveTheme = isDarkMode ? colors.dark : colors.light;

  const plan = plans.find((p) => p.id === DEFAULT_PLAN_ID);
  const completedCount = planProgress?.completedDays?.length ?? 0;
  const totalDays = plan?.totalDays ?? 30;
  const percent = totalDays > 0 ? (completedCount / totalDays) * 100 : 0;
  const currentDay = getCurrentDay(planProgress, totalDays);
  const todayRef = plan?.days.find((d) => d.day === currentDay)?.reference ?? 'Yuhanna 3';
  const streak = planProgress?.streak ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: effectiveTheme.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: effectiveTheme.text }]}>Söz</Text>
          <Pressable onPress={toggleTheme} style={styles.themeToggle} hitSlop={12}>
            <Ionicons
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
              size={24}
              color={effectiveTheme.text}
            />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: effectiveTheme.surface, borderLeftColor: colors.accent }]}>
          <Text style={[styles.cardLabel, { color: colors.accent }]}>Günün Ayeti</Text>
          <Text style={[styles.verseText, { color: effectiveTheme.text }]}>
            «Çünkü Tanrı dünyayı o kadar çok sevdi ki, biricik Oğlu'nu verdi. Öyle ki, O'na iman edenlerin hiçbiri mahvolmasın, hepsi sonsuz yaşama kavuşsun.» — Yuhanna 3:16
          </Text>
        </View>

        <View style={[styles.card, styles.cardNoBorder, { backgroundColor: effectiveTheme.surface }]}>
          <Text style={[styles.cardTitle, { color: effectiveTheme.text }]}>Okuma Planı</Text>
          <Text style={[styles.planLabel, { color: effectiveTheme.text }]}>
            {plan?.title ?? 'Yeni Ahit 30 Günde'}
          </Text>
          <View style={[styles.progressBg, { backgroundColor: effectiveTheme.textMuted }]}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <View style={styles.planMeta}>
            <Text style={[styles.todayLabel, { color: effectiveTheme.textMuted }]}>
              Bugün: {todayRef}
            </Text>
            {streak > 0 && (
              <Text style={[styles.streakLabel, { color: colors.accent }]}>
                🔥 {streak} gün seri
              </Text>
            )}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.readButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => router.push('/(tabs)/read')}
        >
          <Text style={styles.readButtonText}>{todayRef} →</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable onPress={() => router.push('/privacy-policy')}>
            <Text style={[styles.footerLink, { color: effectiveTheme.textMuted }]}>
              Gizlilik Politikası
            </Text>
          </Pressable>
          <Text style={[styles.footerVersion, { color: effectiveTheme.textMuted }]}>v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 6,
  },
  footerLink: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  footerVersion: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  logo: {
    fontFamily: fonts.thin,
    fontSize: 42,
    letterSpacing: -1,
  },
  themeToggle: {
    padding: 4,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  cardNoBorder: {
    borderLeftWidth: 0,
  },
  cardLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 3.2,
  },
  verseText: {
    fontFamily: fonts.italic,
    fontSize: 16,
    lineHeight: 26,
  },
  cardTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    marginBottom: 8,
  },
  planLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    marginBottom: 8,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  todayLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  streakLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  readButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.button,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  readButtonText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    letterSpacing: 0.85,
    color: colors.white,
  },
});

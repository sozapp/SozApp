import { plans } from '@/constants/plans';
import {
  getPlanProgress,
  markDayComplete,
  savePlanProgress,
} from '@/constants/storage';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { useFocusEffect } from '@react-navigation/native';
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
import type { ReadingPlan } from '@/constants/plans';

function getCurrentDay(progress: PlanProgress | null, totalDays: number): number {
  if (progress == null) return 1;
  const start = new Date(progress.startDate).getTime();
  const now = Date.now();
  const dayIndex = Math.floor((now - start) / 86400000);
  return Math.min(totalDays, Math.max(1, dayIndex + 1));
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PlansScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const router = useRouter();
  const { isPremium } = usePremium();
  const [progressByPlanId, setProgressByPlanId] = useState<Record<string, PlanProgress | null>>({});

  const loadProgress = useCallback(async () => {
    const next: Record<string, PlanProgress | null> = {};
    for (const plan of plans) {
      try {
        next[plan.id] = await getPlanProgress(plan.id);
      } catch (_) {
        next[plan.id] = null;
      }
    }
    setProgressByPlanId(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  const handleStartOrContinue = useCallback(
    async (plan: ReadingPlan) => {
      let progress = progressByPlanId[plan.id] ?? null;
      if (progress == null) {
        progress = {
          planId: plan.id,
          startDate: todayString(),
          completedDays: [],
          lastReadDate: null,
          streak: 0,
        };
        try {
          await savePlanProgress(progress);
          setProgressByPlanId((prev) => ({ ...prev, [plan.id]: progress }));
        } catch (_) {
          return;
        }
      }

      const currentDay = getCurrentDay(progress, plan.totalDays);
      const dayInfo = plan.days.find((d) => d.day === currentDay);
      try {
        await markDayComplete(plan.id, currentDay);
        await loadProgress();
      } catch (_) {
        // ignore
      }
      router.push('/(tabs)/read');
    },
    [progressByPlanId, router, loadProgress]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Okuma Planları</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {plans.map((plan) => {
          const progress = progressByPlanId[plan.id] ?? null;
          const completedCount = progress?.completedDays?.length ?? 0;
          const percent = plan.totalDays > 0 ? (completedCount / plan.totalDays) * 100 : 0;
          const currentDay = getCurrentDay(progress, plan.totalDays);
          const dayInfo = plan.days.find((d) => d.day === currentDay);
          const streak = progress?.streak ?? 0;

          return (
            <View
              key={plan.id}
              style={[styles.card, { backgroundColor: theme.surface }]}
            >
              {!isPremium && (
                <View style={styles.cardLockWrap}>
                  <Text style={styles.cardLock}>🔒</Text>
                </View>
              )}
              <Text style={[styles.planTitle, { color: theme.text }]}>{plan.title}</Text>
              <Text style={[styles.planDesc, { color: theme.textMuted }]}>
                {plan.description}
              </Text>
              <View style={[styles.progressBg, { backgroundColor: theme.textMuted }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percent}%` },
                  ]}
                />
              </View>
              <Text style={[styles.daysLabel, { color: theme.textMuted }]}>
                {completedCount} / {plan.totalDays} gün tamamlandı
              </Text>
              {streak > 0 && (
                <View style={[styles.streakBadge, { backgroundColor: colors.accentBadgeBg, borderColor: colors.accentBadgeBorder }]}>
                  <Text style={[styles.streakText, { color: colors.accent }]}>🔥 {streak} günlük seri</Text>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.continueBtn,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => {
                  if (!isPremium) {
                    router.push('/paywall');
                    return;
                  }
                  handleStartOrContinue(plan);
                }}
              >
                <Text style={styles.continueBtnText}>
                  {progress == null ? 'Başla' : 'Devam Et'}
                  {dayInfo != null ? ` — ${dayInfo.reference}` : ''}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  cardLockWrap: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  cardLock: {
    fontSize: 18,
  },
  planTitle: {
    fontFamily: fonts.medium,
    fontSize: 20,
    marginBottom: 6,
  },
  planDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 12,
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
  daysLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 10,
  },
  streakBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    marginBottom: 12,
  },
  streakText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  continueBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  continueBtnText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.white,
  },
});

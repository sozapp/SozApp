import { FREE_PLAN_ID } from '@/constants/premium';
import { plans } from '@/constants/plans';
import {
  getPlanProgress,
  markDayComplete,
  savePlanProgress,
} from '@/constants/storage';
import { logFriendActivity } from '@/constants/friend-activity';
import { supabase } from '@/constants/supabase';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useNetwork } from '@/context/NetworkContext';
import { useChurch } from '@/hooks/useChurch';
import { useHaptics } from '@/hooks/useHaptics';
import { usePremium } from '@/hooks/usePremium';
import { requestReviewIfAppropriate } from '@/hooks/useStoreReview';
import { useTheme } from '@/hooks/useTheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const ACCENT = '#C4956A';

export default function PlansScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const { isPremium } = usePremium();
  const haptics = useHaptics();
  const { church, members } = useChurch();
  const groupCompletedCount = members.filter((m) => m.completed).length;
  const groupPercent =
    members.length > 0 ? Math.round((groupCompletedCount / members.length) * 100) : 0;
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
      const wasNewPlan = progress == null;
      const currentDay = getCurrentDay(progress, plan.totalDays);
      const hadDay = progress?.completedDays?.includes(currentDay) ?? false;

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

      try {
        if (wasNewPlan && isOnline) {
          if (!supabase) {
            console.log('Supabase not available, using local storage');
          } else {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await logFriendActivity(supabase, user, isOnline, {
                type: 'plan_started',
                note: plan.title,
              });
            } catch {
              /* ignore */
            }
          }
        }
        await markDayComplete(plan.id, currentDay);
        if (!hadDay && isOnline) {
          if (!supabase) {
            console.log('Supabase not available, using local storage');
          } else {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await logFriendActivity(supabase, user, isOnline, {
                type: 'plan_day_complete',
                note: plan.title,
              });
            } catch {
              /* ignore */
            }
          }
        }
        await loadProgress();
        haptics.success();
        requestReviewIfAppropriate();
      } catch (_) {
        // ignore
      }
      router.push('/(tabs)/read');
    },
    [progressByPlanId, router, loadProgress, haptics, isOnline]
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
        {church != null && church.planReference != null && (
          <View style={styles.groupSection}>
            <Text style={[styles.groupSectionTitle, { color: theme.text }]}>
              Kilisenizin aktif planı
            </Text>
            <Pressable
              style={[styles.card, styles.groupPlanCard, { backgroundColor: theme.surface }]}
              onPress={() => router.push('/church')}
            >
              <Text style={[styles.planTitle, { color: theme.text }]}>
                {church.groupName} — {church.planReference}
              </Text>
              <Text style={[styles.planDesc, { color: theme.textMuted }]}>
                Grup ortalaması: %{groupPercent} tamamlandı
              </Text>
              <View style={[styles.progressBg, { backgroundColor: theme.textMuted }]}>
                <View style={[styles.progressFill, { width: `${groupPercent}%` }]} />
              </View>
              <Text style={[styles.daysLabel, { color: theme.textMuted }]}>
                {groupCompletedCount} / {members.length} üye tamamladı
              </Text>
              <Text style={[styles.groupPlanLink, { color: ACCENT }]}>
                Gruba git →
              </Text>
            </Pressable>
          </View>
        )}

        {plans.map((plan) => {
          const progress = progressByPlanId[plan.id] ?? null;
          const completedCount = progress?.completedDays?.length ?? 0;
          const percent = plan.totalDays > 0 ? (completedCount / plan.totalDays) * 100 : 0;
          const currentDay = getCurrentDay(progress, plan.totalDays);
          const dayInfo = plan.days.find((d) => d.day === currentDay);
          const streak = progress?.streak ?? 0;
          const planUnlocked = isPremium || plan.id === FREE_PLAN_ID;

          return (
            <View
              key={plan.id}
              style={[styles.card, { backgroundColor: theme.surface }]}
            >
              {!planUnlocked && (
                <View style={styles.cardLockWrap}>
                  <Ionicons name="lock-closed" size={22} color={ACCENT} />
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
                  <View style={styles.streakRow}>
                    <Ionicons name="flash" size={14} color="#C4956A" />
                    <Text style={[styles.streakText, { color: ACCENT }]}> {streak} günlük seri</Text>
                  </View>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.continueBtn,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => {
                  haptics.light();
                  if (!planUnlocked) {
                    try {
                      router.push('/paywall');
                    } catch {
                      /* ignore */
                    }
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
  groupSection: {
    marginBottom: 24,
  },
  groupSectionTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 12,
  },
  groupPlanCard: {
    paddingVertical: 16,
  },
  groupPlanLink: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 8,
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
    backgroundColor: ACCENT,
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
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  continueBtn: {
    backgroundColor: ACCENT,
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

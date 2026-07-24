import { FREE_PLAN_ID } from '@/constants/premium';
import { plans } from '@/constants/plans';
import {
  getPlanProgress,
  markDayComplete,
  savePlanProgress,
} from '@/constants/storage';
import { BOOK_SHORT_TO_ID, getPlanCurrentDay } from '@/constants/continueReading';
import { logFriendActivity } from '@/constants/friend-activity';
import { trackEvent } from '@/constants/analytics';
import { supabase } from '@/constants/supabase';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useNetwork } from '@/context/NetworkContext';
import { useTranslation } from '@/context/LanguageContext';
import { useChurch } from '@/hooks/useChurch';
import { useHaptics } from '@/hooks/useHaptics';
import { usePlanBuddy } from '@/hooks/usePlanBuddy';
import { usePremium } from '@/hooks/usePremium';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useSozAlert } from '@/hooks/useSozAlert';
import { requestReviewIfAppropriate } from '@/hooks/useStoreReview';
import { useTheme } from '@/hooks/useTheme';
import { useAnalyticsScreen } from '@/hooks/useAnalyticsScreen';
import { SozAlert } from '@/components/SozAlert';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const ACCENT = '#C4956A';

type FriendOption = {
  id: string;
  name: string;
};

export default function PlansScreen() {
  useAnalyticsScreen('plans');
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const safeBack = useSafeBack();
  const { isOnline } = useNetwork();
  const { isPremium } = usePremium();
  const haptics = useHaptics();
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const { church, members } = useChurch();
  const { buddiesByPlanId, pendingInvites, invitePlanBuddy, respondToInvite } = usePlanBuddy();
  const groupCompletedCount = members.filter((m) => m.completed).length;
  const groupPercent =
    members.length > 0 ? Math.round((groupCompletedCount / members.length) * 100) : 0;
  const [progressByPlanId, setProgressByPlanId] = useState<Record<string, PlanProgress | null>>({});
  const [invitePlanId, setInvitePlanId] = useState<string | null>(null);
  const [friendOptions, setFriendOptions] = useState<FriendOption[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);

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

  const openInviteModal = useCallback(
    async (planId: string) => {
      if (!isOnline || !supabase) {
        showAlert('Söz', t('internetRequiredMsg'));
        return;
      }
      setInvitePlanId(planId);
      setFriendsLoading(true);
      setFriendOptions([]);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setInvitePlanId(null);
          showAlert('Söz', t('mustSignInFirst'));
          return;
        }
        const { data: rows } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        const ids = [
          ...new Set(
            ((rows ?? []) as { user_id: string; friend_id: string }[]).map((r) =>
              r.user_id === user.id ? r.friend_id : r.user_id
            )
          ),
        ];
        if (ids.length === 0) {
          setFriendOptions([]);
          return;
        }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', ids);
        const options: FriendOption[] = (
          (profiles ?? []) as { id: string; display_name: string | null; email: string | null }[]
        ).map((p) => ({
          id: p.id,
          name: p.display_name?.trim() || p.email?.split('@')[0]?.trim() || t('defaultFriendName'),
        }));
        options.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        setFriendOptions(options);
      } catch {
        setFriendOptions([]);
      } finally {
        setFriendsLoading(false);
      }
    },
    [isOnline, showAlert, t]
  );

  const handleInviteFriend = useCallback(
    async (friendId: string) => {
      if (!invitePlanId || inviteBusy) return;
      setInviteBusy(true);
      try {
        const result = await invitePlanBuddy(friendId, invitePlanId);
        if (!result.ok) {
          haptics.error();
          showAlert('Söz', t('planBuddyInviteFailed'));
          return;
        }
        haptics.success();
        setInvitePlanId(null);
        showAlert('Söz', t('planBuddyInviteSent'));
      } finally {
        setInviteBusy(false);
      }
    },
    [invitePlanId, inviteBusy, invitePlanBuddy, haptics, showAlert, t]
  );

  const handleStartOrContinue = useCallback(
    async (plan: ReadingPlan) => {
      let progress = progressByPlanId[plan.id] ?? null;
      const wasNewPlan = progress == null;
      const currentDay = getPlanCurrentDay(progress, plan.totalDays);
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
        if (wasNewPlan) {
          trackEvent('plan_started', { plan_id: plan.id });
        }
        if (wasNewPlan && isOnline && supabase) {
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
        await markDayComplete(plan.id, currentDay);
        if (!hadDay) {
          trackEvent('plan_day_complete', { plan_id: plan.id, day: currentDay });
        }
        if (!hadDay && isOnline && supabase) {
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
        await loadProgress();
        haptics.success();
        requestReviewIfAppropriate();
      } catch (_) {
        // ignore
      }
      const dayInfo = plan.days.find((d) => d.day === currentDay);
      const bookId = dayInfo ? BOOK_SHORT_TO_ID[dayInfo.bookShort] : undefined;
      if (dayInfo && bookId) {
        router.push({
          pathname: '/(tabs)/read',
          params: { bookId, chapter: String(dayInfo.chapter) },
        });
      } else {
        router.push('/(tabs)/read');
      }
    },
    [progressByPlanId, router, loadProgress, haptics, isOnline]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => safeBack()}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Ionicons name="chevron-back" size={24} color={ACCENT} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t('readingPlansTitle')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {pendingInvites.length > 0 && (
          <View style={styles.groupSection}>
            <Text style={[styles.groupSectionTitle, { color: theme.text }]}>
              {t('planBuddyPendingSection')}
            </Text>
            {pendingInvites.map((inv) => (
              <View
                key={inv.id}
                style={[styles.card, { backgroundColor: theme.surface }]}
              >
                <Text style={[styles.planTitle, { color: theme.text }]}>
                  {t('planBuddyPendingTitle')}
                </Text>
                <Text style={[styles.planDesc, { color: theme.textMuted }]}>
                  {t('planBuddyPendingMsg', { name: inv.inviterName, plan: inv.planTitle })}
                </Text>
                <View style={styles.pendingActions}>
                  <Pressable
                    style={[styles.pendingBtn, styles.pendingDecline]}
                    onPress={async () => {
                      haptics.light();
                      const r = await respondToInvite(inv.id, false);
                      if (!r.ok) showAlert('Söz', t('planBuddyRespondFailed'));
                    }}
                  >
                    <Text style={styles.pendingDeclineText}>{t('planBuddyDecline')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.pendingBtn, styles.pendingAccept]}
                    onPress={async () => {
                      haptics.success();
                      const r = await respondToInvite(inv.id, true);
                      if (!r.ok) showAlert('Söz', t('planBuddyRespondFailed'));
                      else showAlert('Söz', t('planBuddyAccepted'));
                    }}
                  >
                    <Text style={styles.pendingAcceptText}>{t('planBuddyAccept')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {church != null && church.planReference != null && (
          <View style={styles.groupSection}>
            <Text style={[styles.groupSectionTitle, { color: theme.text }]}>
              {t('churchActivePlan')}
            </Text>
            <Pressable
              style={[styles.card, styles.groupPlanCard, { backgroundColor: theme.surface }]}
              onPress={() => router.push('/church')}
            >
              <Text style={[styles.planTitle, { color: theme.text }]}>
                {church.groupName} — {church.planReference}
              </Text>
              <Text style={[styles.planDesc, { color: theme.textMuted }]}>
                {t('groupAvgCompleted', { percent: groupPercent })}
              </Text>
              <View style={[styles.progressBg, { backgroundColor: theme.textMuted }]}>
                <View style={[styles.progressFill, { width: `${groupPercent}%` }]} />
              </View>
              <Text style={[styles.daysLabel, { color: theme.textMuted }]}>
                {t('membersCompleted', { done: groupCompletedCount, total: members.length })}
              </Text>
              <Text style={[styles.groupPlanLink, { color: ACCENT }]}>
                {t('goToGroup')}
              </Text>
            </Pressable>
          </View>
        )}

        {plans.map((plan) => {
          const progress = progressByPlanId[plan.id] ?? null;
          const completedCount = progress?.completedDays?.length ?? 0;
          const percent = plan.totalDays > 0 ? (completedCount / plan.totalDays) * 100 : 0;
          const currentDay = getPlanCurrentDay(progress, plan.totalDays);
          const dayInfo = plan.days.find((d) => d.day === currentDay);
          const streak = progress?.streak ?? 0;
          const planUnlocked = isPremium || plan.id === FREE_PLAN_ID;
          const buddy = buddiesByPlanId[plan.id];

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
              <View style={styles.planTitleRow}>
                <View style={[styles.planIconWrap, { backgroundColor: colors.accentBadgeBg }]}>
                  <Ionicons name={plan.icon} size={20} color={ACCENT} />
                </View>
                <Text style={[styles.planTitle, { color: theme.text, flex: 1 }]}>
                  {t(plan.titleKey)}
                </Text>
              </View>
              <Text style={[styles.planDesc, { color: theme.textMuted }]}>
                {t(plan.descriptionKey)}
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
                {t('daysCompletedLabel', { done: completedCount, total: plan.totalDays })}
              </Text>
              {buddy ? (
                <Text style={[styles.buddyLine, { color: theme.textMuted }]}>
                  {t('planBuddyWith', {
                    name: buddy.buddyName,
                    you: buddy.myPercent,
                    them: buddy.buddyPercent,
                  })}
                </Text>
              ) : (
                <Pressable
                  onPress={() => {
                    haptics.light();
                    void openInviteModal(plan.id);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('invitePlanBuddy')}
                >
                  <Text style={[styles.inviteLink, { color: ACCENT }]}>
                    {t('invitePlanBuddy')}
                  </Text>
                </Pressable>
              )}
              {streak > 0 && (
                <View style={[styles.streakBadge, { backgroundColor: colors.accentBadgeBg, borderColor: colors.accentBadgeBorder }]}>
                  <View style={styles.streakRow}>
                    <Ionicons name="flash" size={14} color="#C4956A" />
                    <Text style={[styles.streakText, { color: ACCENT }]}>
                      {' '}
                      {t('streakDaysLabel', { n: streak })}
                    </Text>
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
                  {progress == null ? t('startPlan') : t('continueReading')}
                  {dayInfo != null ? ` — ${dayInfo.reference}` : ''}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={invitePlanId != null}
        transparent
        animationType="slide"
        onRequestClose={() => setInvitePlanId(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setInvitePlanId(null)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('planBuddyInviteTitle')}
            </Text>
            {friendsLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            ) : friendOptions.length === 0 ? (
              <Text style={[styles.modalEmpty, { color: theme.textMuted }]}>
                {t('planBuddyNoFriends')}
              </Text>
            ) : (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {friendOptions.map((f) => (
                  <Pressable
                    key={f.id}
                    style={[styles.friendRow, { borderBottomColor: theme.border }]}
                    disabled={inviteBusy}
                    onPress={() => void handleInviteFriend(f.id)}
                  >
                    <Text style={[styles.friendName, { color: theme.text }]}>{f.name}</Text>
                    <Ionicons name="chevron-forward" size={18} color={ACCENT} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Pressable style={styles.modalCancel} onPress={() => setInvitePlanId(null)}>
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 28,
    flex: 1,
    textAlign: 'center',
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
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
    paddingRight: 28,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontFamily: fonts.medium,
    fontSize: 20,
    marginBottom: 0,
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
  buddyLine: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 10,
  },
  inviteLink: {
    fontFamily: fonts.medium,
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
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  pendingBtn: {
    flex: 1,
    borderRadius: borderRadius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pendingDecline: {
    borderWidth: 1,
    borderColor: 'rgba(196,149,106,0.35)',
  },
  pendingAccept: {
    backgroundColor: ACCENT,
  },
  pendingDeclineText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: ACCENT,
  },
  pendingAcceptText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(196,149,106,0.35)',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 12,
  },
  modalEmpty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 24,
  },
  modalList: { maxHeight: 320 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendName: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  modalCancel: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: ACCENT,
  },
});

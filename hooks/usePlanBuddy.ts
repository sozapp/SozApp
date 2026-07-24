import { plans } from '@/constants/plans';
import { reportError } from '@/constants/sentry';
import { getPlanProgress } from '@/constants/storage';
import { supabase } from '@/constants/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export type PlanBuddyComparison = {
  inviteId: string;
  planId: string;
  buddyUserId: string;
  buddyName: string;
  myCompleted: number;
  buddyCompleted: number;
  myPercent: number;
  buddyPercent: number;
  totalDays: number;
};

export type PendingPlanInvite = {
  id: string;
  planId: string;
  planTitle: string;
  inviterId: string;
  inviterName: string;
  createdAt: string;
};

type PlanInviteRow = {
  id: string;
  inviter_id: string;
  invitee_id: string;
  plan_id: string;
  status: 'pending' | 'accepted' | 'declined';
  inviter_completed: number;
  invitee_completed: number;
  created_at: string;
};

type ActionResult = { ok: boolean; error?: string };

function planTitle(planId: string): string {
  return plans.find((p) => p.id === planId)?.title ?? planId;
}

function planTotalDays(planId: string): number {
  return plans.find((p) => p.id === planId)?.totalDays ?? 0;
}

function percentOf(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(completed, total) / total) * 100);
}

async function displayNameFor(userId: string): Promise<string> {
  if (!supabase) return 'Arkadaş';
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .maybeSingle();
    const row = data as { display_name: string | null; email: string | null } | null;
    return row?.display_name?.trim() || row?.email?.split('@')[0]?.trim() || 'Arkadaş';
  } catch {
    return 'Arkadaş';
  }
}

export function usePlanBuddy() {
  const [buddiesByPlanId, setBuddiesByPlanId] = useState<Record<string, PlanBuddyComparison>>(
    {}
  );
  const [pendingInvites, setPendingInvites] = useState<PendingPlanInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setBuddiesByPlanId({});
      setPendingInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBuddiesByPlanId({});
        setPendingInvites([]);
        return;
      }

      const { data, error } = await supabase
        .from('plan_invites')
        .select(
          'id, inviter_id, invitee_id, plan_id, status, inviter_completed, invitee_completed, created_at'
        )
        .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
        .in('status', ['pending', 'accepted']);

      if (error || !data) {
        if (error) console.warn('[PlanBuddy] load failed:', error.message);
        setBuddiesByPlanId({});
        setPendingInvites([]);
        return;
      }

      const rows = data as PlanInviteRow[];
      const nextBuddies: Record<string, PlanBuddyComparison> = {};
      const nextPending: PendingPlanInvite[] = [];

      for (const row of rows) {
        if (row.status === 'pending' && row.invitee_id === user.id) {
          nextPending.push({
            id: row.id,
            planId: row.plan_id,
            planTitle: planTitle(row.plan_id),
            inviterId: row.inviter_id,
            inviterName: await displayNameFor(row.inviter_id),
            createdAt: row.created_at,
          });
          continue;
        }

        if (row.status !== 'accepted') continue;

        const totalDays = planTotalDays(row.plan_id);
        const local = await getPlanProgress(row.plan_id);
        const myCompleted = local?.completedDays?.length ?? 0;
        const iAmInviter = row.inviter_id === user.id;

        // Local ilerlemeyi buluta yaz (karşı tarafın karşılaştırması için)
        try {
          if (iAmInviter) {
            if (row.inviter_completed !== myCompleted) {
              await supabase
                .from('plan_invites')
                .update({ inviter_completed: myCompleted })
                .eq('id', row.id);
            }
          } else if (row.invitee_completed !== myCompleted) {
            await supabase
              .from('plan_invites')
              .update({ invitee_completed: myCompleted })
              .eq('id', row.id);
          }
        } catch (e) {
          console.warn('[PlanBuddy] progress sync failed:', e);
        }

        const buddyUserId = iAmInviter ? row.invitee_id : row.inviter_id;
        const buddyCompleted = iAmInviter ? row.invitee_completed : row.inviter_completed;

        // Aynı plan için birden fazla kabul varsa en yenisini tut
        const existing = nextBuddies[row.plan_id];
        if (existing && existing.inviteId > row.id) continue;

        nextBuddies[row.plan_id] = {
          inviteId: row.id,
          planId: row.plan_id,
          buddyUserId,
          buddyName: await displayNameFor(buddyUserId),
          myCompleted,
          buddyCompleted,
          myPercent: percentOf(myCompleted, totalDays),
          buddyPercent: percentOf(buddyCompleted, totalDays),
          totalDays,
        };
      }

      setBuddiesByPlanId(nextBuddies);
      setPendingInvites(nextPending);
    } catch (e) {
      console.warn('[PlanBuddy] refresh failed:', e);
      reportError('PlanBuddy.refresh', e);
      setBuddiesByPlanId({});
      setPendingInvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const invitePlanBuddy = useCallback(
    async (friendId: string, planId: string): Promise<ActionResult> => {
      if (!supabase) return { ok: false, error: 'offline' };
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: 'auth' };
        if (user.id === friendId) return { ok: false, error: 'self' };

        // Kabul edilmiş arkadaşlık zorunlu
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id')
          .eq('status', 'accepted')
          .or(
            `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
          )
          .maybeSingle();
        if (!friendship) return { ok: false, error: 'not_friends' };

        const local = await getPlanProgress(planId);
        const myCompleted = local?.completedDays?.length ?? 0;

        const { error } = await supabase.from('plan_invites').insert({
          inviter_id: user.id,
          invitee_id: friendId,
          plan_id: planId,
          status: 'pending',
          inviter_completed: myCompleted,
          invitee_completed: 0,
        });
        if (error) {
          // Unique violation → zaten davet var
          if (error.code === '23505') return { ok: false, error: 'already_invited' };
          return { ok: false, error: error.message };
        }

        void (async () => {
          try {
            let senderName = 'Söz';
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, email')
              .eq('id', user.id)
              .maybeSingle();
            const name =
              (profile as { display_name: string | null; email: string | null } | null)
                ?.display_name?.trim() ||
              (profile as { display_name: string | null; email: string | null } | null)?.email
                ?.split('@')[0]
                ?.trim();
            if (name) senderName = name;

            await supabase.functions.invoke('send-push', {
              body: {
                recipientUserId: friendId,
                title: senderName,
                body: `${senderName} seni bir okuma planına davet etti`,
                data: { type: 'plan_invite', planId },
              },
            });
          } catch (e) {
            console.warn('[Push] plan_invite notify skipped:', e);
          }
        })();

        await refresh();
        return { ok: true };
      } catch (e) {
        reportError('PlanBuddy.invitePlanBuddy', e);
        return { ok: false, error: e instanceof Error ? e.message : 'error' };
      }
    },
    [refresh]
  );

  const respondToInvite = useCallback(
    async (inviteId: string, accept: boolean): Promise<ActionResult> => {
      if (!supabase) return { ok: false, error: 'offline' };
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: 'auth' };

        const patch: { status: 'accepted' | 'declined'; invitee_completed?: number } = {
          status: accept ? 'accepted' : 'declined',
        };

        if (accept) {
          const { data: row } = await supabase
            .from('plan_invites')
            .select('plan_id')
            .eq('id', inviteId)
            .eq('invitee_id', user.id)
            .maybeSingle();
          const planId = (row as { plan_id: string } | null)?.plan_id;
          if (planId) {
            const local = await getPlanProgress(planId);
            patch.invitee_completed = local?.completedDays?.length ?? 0;
          }
        }

        const { error } = await supabase
          .from('plan_invites')
          .update(patch)
          .eq('id', inviteId)
          .eq('invitee_id', user.id);
        if (error) return { ok: false, error: error.message };

        await refresh();
        return { ok: true };
      } catch (e) {
        reportError('PlanBuddy.respondToInvite', e);
        return { ok: false, error: e instanceof Error ? e.message : 'error' };
      }
    },
    [refresh]
  );

  return {
    buddiesByPlanId,
    pendingInvites,
    loading,
    refresh,
    invitePlanBuddy,
    respondToInvite,
  };
}

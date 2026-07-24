import { supabase } from '@/constants/supabase';
import { reportError } from '@/constants/sentry';
import { trackEvent } from '@/constants/analytics';
import { useCallback, useEffect, useState } from 'react';

export type PrayerWallItem = {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  isAnonymous: boolean;
  createdAt: string;
  prayCount: number;
  reactedByMe: boolean;
};

type ActionResult = { ok: boolean; error?: string };

async function myDisplayName(userId: string, fallbackEmail?: string | null): Promise<string> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      const name = (data as { display_name: string | null } | null)?.display_name?.trim();
      if (name) return name;
    } catch {
      /* ignore */
    }
  }
  return fallbackEmail?.split('@')[0]?.trim() || 'Kardeş';
}

export function usePrayerWall() {
  const [prayers, setPrayers] = useState<PrayerWallItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPrayers = useCallback(async () => {
    if (!supabase) {
      setPrayers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('prayer_requests')
        .select('id, user_id, display_name, text, is_anonymous, created_at, pray_count')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) {
        setPrayers([]);
        return;
      }

      const rows = data as {
        id: string;
        user_id: string;
        display_name: string;
        text: string;
        is_anonymous: boolean;
        created_at: string;
        pray_count: number;
      }[];

      let reacted = new Set<string>();
      if (user && rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const { data: reactions } = await supabase
          .from('prayer_reactions')
          .select('prayer_id')
          .eq('user_id', user.id)
          .in('prayer_id', ids);
        reacted = new Set(
          ((reactions ?? []) as { prayer_id: string }[]).map((r) => r.prayer_id)
        );
      }

      setPrayers(
        rows.map((p) => ({
          id: p.id,
          userId: p.user_id,
          displayName: p.display_name,
          text: p.text,
          isAnonymous: p.is_anonymous,
          createdAt: p.created_at,
          prayCount: p.pray_count ?? 0,
          reactedByMe: reacted.has(p.id),
        }))
      );
    } catch (e) {
      console.warn('[PrayerWall] loadPrayers failed:', e);
      reportError('PrayerWall.loadPrayers', e);
      setPrayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrayers();
  }, [loadPrayers]);

  const submitPrayer = useCallback(
    async (text: string, isAnonymous: boolean): Promise<ActionResult> => {
      if (!supabase) return { ok: false, error: 'Sunucuya bağlanılamıyor.' };
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: 'empty' };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'auth' };
      const name = await myDisplayName(user.id, user.email);
      try {
        const { error } = await supabase.from('prayer_requests').insert({
          user_id: user.id,
          display_name: name,
          text: trimmed,
          is_anonymous: isAnonymous,
        });
        if (error) return { ok: false, error: error.message };
        trackEvent('prayer_submitted');
        await loadPrayers();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'error' };
      }
    },
    [loadPrayers]
  );

  const reactToPrayer = useCallback(
    async (prayerId: string): Promise<ActionResult> => {
      if (!supabase) return { ok: false, error: 'Sunucuya bağlanılamıyor.' };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: 'auth' };

      const target = prayers.find((p) => p.id === prayerId);
      if (target?.reactedByMe) return { ok: true };

      // Optimistic
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? { ...p, reactedByMe: true, prayCount: p.prayCount + 1 }
            : p
        )
      );

      try {
        const { error } = await supabase.rpc('increment_pray_count', {
          p_prayer_id: prayerId,
        });
        if (error) {
          setPrayers((prev) =>
            prev.map((p) =>
              p.id === prayerId
                ? {
                    ...p,
                    reactedByMe: target?.reactedByMe ?? false,
                    prayCount: target?.prayCount ?? Math.max(0, p.prayCount - 1),
                  }
                : p
            )
          );
          return { ok: false, error: error.message };
        }
        return { ok: true };
      } catch (e) {
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === prayerId
              ? {
                  ...p,
                  reactedByMe: target?.reactedByMe ?? false,
                  prayCount: target?.prayCount ?? Math.max(0, p.prayCount - 1),
                }
              : p
          )
        );
        return { ok: false, error: e instanceof Error ? e.message : 'error' };
      }
    },
    [prayers]
  );

  const reportPrayer = useCallback(async (prayerId: string): Promise<ActionResult> => {
    if (!supabase) return { ok: false, error: 'Sunucuya bağlanılamıyor.' };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'auth' };
    try {
      const { error } = await supabase.from('prayer_reports').insert({
        prayer_id: prayerId,
        reporter_id: user.id,
      });
      if (error) {
        if (error.code === '23505') return { ok: true };
        return { ok: false, error: error.message };
      }
      console.warn('[PrayerWall] report filed', { prayerId, reporterId: user.id });
      reportError('PrayerWall.report', new Error(`prayer_report:${prayerId}`));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'error' };
    }
  }, []);

  return {
    prayers,
    loading,
    refresh: loadPrayers,
    submitPrayer,
    reactToPrayer,
    reportPrayer,
  };
}

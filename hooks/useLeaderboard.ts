import { supabase } from '@/constants/supabase';
import { useCallback, useState } from 'react';

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  score: number;
  isMe: boolean;
};

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
  return fallbackEmail?.split('@')[0]?.trim() || 'Sen';
}

export function useLeaderboard(gameId: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('game_scores')
        .select('user_id, display_name, best_score')
        .eq('game_id', gameId)
        .order('best_score', { ascending: false })
        .limit(50);
      const rows = (data ?? []) as { user_id: string; display_name: string; best_score: number }[];
      const mapped = rows.map((r) => ({
        userId: r.user_id,
        displayName: r.display_name,
        score: r.best_score,
        isMe: r.user_id === user?.id,
      }));
      setEntries(mapped);
      const idx = mapped.findIndex((e) => e.isMe);
      setMyRank(idx >= 0 ? idx + 1 : null);
    } catch {
      setEntries([]);
      setMyRank(null);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const submitScore = useCallback(
    async (score: number) => {
      if (!supabase) return;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const name = await myDisplayName(user.id, user.email);
        await supabase.rpc('submit_game_score', {
          p_game_id: gameId,
          p_score: score,
          p_display_name: name,
        });
      } catch {
        /* liderlik tablosuna skor gönderimi opsiyonel, sessiz başarısız olsun */
      }
    },
    [gameId]
  );

  return { entries, loading, myRank, load, submitScore };
}

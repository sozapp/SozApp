import { supabase } from '@/constants/supabase';
import { useCallback, useState } from 'react';

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  score: number;
  isMe: boolean;
};

export type LeaderboardScope = 'global' | 'friends';

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

/** Kabul edilmiş arkadaşlık satırlarından diğer kullanıcının id'sini çıkarır. */
function friendIdsFromRows(
  rows: { user_id: string; friend_id: string }[],
  myId: string,
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const other = row.user_id === myId ? row.friend_id : row.user_id;
    if (other && other !== myId) ids.add(other);
  }
  return [...ids];
}

export function useLeaderboard(gameId: string, scope: LeaderboardScope = 'global') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  /** Arkadaşlar kapsamında: kabul edilmiş arkadaş sayısı (kendisi hariç). */
  const [friendCount, setFriendCount] = useState(0);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let allowedUserIds: string[] | null = null;
      if (scope === 'friends') {
        if (!user) {
          setEntries([]);
          setFriendCount(0);
          setMyRank(null);
          return;
        }
        const { data: friendshipRows } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        const friendIds = friendIdsFromRows(
          (friendshipRows ?? []) as { user_id: string; friend_id: string }[],
          user.id,
        );
        setFriendCount(friendIds.length);
        if (friendIds.length === 0) {
          setEntries([]);
          setMyRank(null);
          return;
        }
        allowedUserIds = [...friendIds, user.id];
      } else {
        setFriendCount(0);
      }

      let query = supabase
        .from('game_scores')
        .select('user_id, display_name, best_score')
        .eq('game_id', gameId);

      if (allowedUserIds) {
        query = query.in('user_id', allowedUserIds);
      }

      const { data } = await query.order('best_score', { ascending: false }).limit(50);
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
      setFriendCount(0);
    } finally {
      setLoading(false);
    }
  }, [gameId, scope]);

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

  return { entries, loading, myRank, friendCount, load, submitScore };
}

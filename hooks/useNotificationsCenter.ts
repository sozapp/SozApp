import { isRealAccount } from '@/constants/friend-activity';
import { supabase } from '@/constants/supabase';
import { useTranslation } from '@/context/LanguageContext';
import { useUnreadMessageCounts } from '@/hooks/useMessages';
import type { User } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type PendingFriendRequest = {
  id: string;
  fromUserId: string;
  name: string;
  email: string | null;
};

export type UnreadChatThread = {
  friendId: string;
  name: string;
  email: string | null;
  unreadCount: number;
};

type FriendshipRow = {
  id: string;
  user_id: string;
  friend_id: string;
};

type ProfileMini = { id: string; display_name: string | null; email: string | null };

async function syncAppIconBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch (e) {
    console.warn('[NotificationsCenter] setBadgeCountAsync failed:', e);
  }
}

/**
 * Ana sayfa zili, notifications ekranı ve uygulama ikonu rozeti için tek kaynak:
 * bekleyen arkadaşlık istekleri + okunmamış mesajlar.
 */
export function useNotificationsCenter() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [pendingRows, setPendingRows] = useState<FriendshipRow[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileMini>>({});

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    try {
      if (!supabase) {
        setUser(null);
        setPendingRows([]);
        setFriendIds([]);
        setProfileMap({});
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user ?? null;
      setUser(u);
      if (!isRealAccount(u)) {
        setPendingRows([]);
        setFriendIds([]);
        setProfileMap({});
        return;
      }
      const uid = u!.id;

      let incoming: FriendshipRow[] = [];
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id')
          .eq('friend_id', uid)
          .eq('status', 'pending');
        if (error) throw error;
        incoming = (data ?? []) as FriendshipRow[];
      } catch (e) {
        console.warn('[NotificationsCenter] pending requests failed:', e);
      }
      setPendingRows(incoming);

      let accepted: FriendshipRow[] = [];
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${uid},friend_id.eq.${uid}`);
        if (error) throw error;
        accepted = (data ?? []) as FriendshipRow[];
      } catch (e) {
        console.warn('[NotificationsCenter] accepted friends failed:', e);
      }
      const fids = accepted.map((r) => (r.user_id === uid ? r.friend_id : r.user_id));
      setFriendIds(fids);

      const otherIds = new Set<string>(fids);
      for (const row of incoming) otherIds.add(row.user_id);
      const ids = [...otherIds];
      if (ids.length > 0) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', ids);
          if (error) throw error;
          const pmap: Record<string, ProfileMini> = {};
          for (const p of (data ?? []) as ProfileMini[]) pmap[p.id] = p;
          setProfileMap(pmap);
        } catch (e) {
          console.warn('[NotificationsCenter] profiles fetch failed:', e);
          setProfileMap({});
        }
      } else {
        setProfileMap({});
      }
    } finally {
      if (!opts?.soft) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Ana ekrana dönmeden / uygulamayı yeniden açınca rozeti güncelle
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void load();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [load]);

  const { unreadCounts, reloadUnread } = useUnreadMessageCounts(friendIds);

  const displayName = useCallback(
    (id: string) =>
      profileMap[id]?.display_name?.trim() || profileMap[id]?.email?.split('@')[0] || t('defaultFriendName'),
    [profileMap, t]
  );

  const pendingRequests: PendingFriendRequest[] = useMemo(
    () =>
      pendingRows.map((row) => ({
        id: row.id,
        fromUserId: row.user_id,
        name: displayName(row.user_id),
        email: profileMap[row.user_id]?.email ?? null,
      })),
    [pendingRows, profileMap, displayName]
  );

  const unreadThreads: UnreadChatThread[] = useMemo(
    () =>
      friendIds
        .filter((fid) => (unreadCounts[fid] ?? 0) > 0)
        .map((fid) => ({
          friendId: fid,
          name: displayName(fid),
          email: profileMap[fid]?.email ?? null,
          unreadCount: unreadCounts[fid] ?? 0,
        })),
    [friendIds, unreadCounts, profileMap, displayName]
  );

  const totalUnreadMessages = useMemo(
    () => Object.values(unreadCounts).reduce((sum, n) => sum + n, 0),
    [unreadCounts]
  );

  const totalCount = pendingRequests.length + totalUnreadMessages;

  // Uygulama ikonu rozeti — 0 iken mutlaka temizle
  useEffect(() => {
    void syncAppIconBadge(totalCount);
  }, [totalCount]);

  const reload = useCallback(async () => {
    await load({ soft: true });
    await reloadUnread();
  }, [load, reloadUnread]);

  const acceptRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!supabase) return false;
      try {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', requestId);
        if (error) throw error;
        reload();
        return true;
      } catch (e) {
        console.warn('[NotificationsCenter] acceptRequest failed:', e);
        return false;
      }
    },
    [reload]
  );

  const rejectRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!supabase) return false;
      try {
        const { error } = await supabase.from('friendships').delete().eq('id', requestId);
        if (error) throw error;
        reload();
        return true;
      } catch (e) {
        console.warn('[NotificationsCenter] rejectRequest failed:', e);
        return false;
      }
    },
    [reload]
  );

  /** Okunmamış sohbetlerdeki mesajları tek sorguda okundu işaretle. */
  const markAllThreadsRead = useCallback(async (): Promise<void> => {
    if (!supabase || !user?.id) return;
    const senderIds = unreadThreads.map((t) => t.friendId);
    if (senderIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .in('sender_id', senderIds)
        .is('read_at', null);
      if (error) throw error;
      reload();
    } catch (e) {
      console.warn('[NotificationsCenter] markAllThreadsRead failed:', e);
    }
  }, [user, unreadThreads, reload]);

  return {
    loading,
    user,
    pendingRequests,
    unreadThreads,
    totalCount,
    reload,
    acceptRequest,
    rejectRequest,
    markAllThreadsRead,
  };
}

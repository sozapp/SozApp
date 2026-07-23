import {
  activityDescription,
  bookNameToReadParams,
  formatActivityTimeLong,
  formatActivityTimeShort,
  getShareActivityEnabled,
  isRealAccount,
  lastActivityLine,
  setShareActivityEnabled,
  verseIdToReadParams,
} from '@/constants/friend-activity';
import { supabase } from '@/constants/supabase';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useNetwork } from '@/context/NetworkContext';
import { SozAlert } from '@/components/SozAlert';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useTheme } from '@/hooks/useTheme';
import { useUnreadMessageCounts } from '@/hooks/useMessages';
import { useTranslation } from '@/context/LanguageContext';
import type { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';

type FriendshipRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
};

type ActivityRow = {
  id: string;
  user_id: string;
  type: string;
  verse_id: string | null;
  book: string | null;
  chapter: number | null;
  note: string | null;
  created_at: string;
};

type ProfileMini = { id: string; display_name: string | null; email: string | null };

function initials(name: string, email: string | null): string {
  const n = name?.trim() || email?.split('@')[0] || '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export default function FriendsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const safeBack = useSafeBack();
  const { isOnline } = useNetwork();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [shareActivity, setShareActivityState] = useState(true);
  const [pendingIn, setPendingIn] = useState<FriendshipRow[]>([]);
  const [friendsRows, setFriendsRows] = useState<FriendshipRow[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileMini>>({});
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [lastByUser, setLastByUser] = useState<Record<string, ActivityRow>>({});
  const { alertConfig, showAlert, hideAlert } = useSozAlert();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      if (!supabase) {
        console.log('Supabase not available, using local storage');
        setUser(null);
        setPendingIn([]);
        setFriendsRows([]);
        setActivities([]);
        setLastByUser({});
        setProfileMap({});
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user ?? null;
      setUser(u);
      if (!isRealAccount(u)) {
        setPendingIn([]);
        setFriendsRows([]);
        setActivities([]);
        setLastByUser({});
        setLoading(false);
        return;
      }
      const uid = u!.id;

      const share = await getShareActivityEnabled();
      setShareActivityState(share);

      let incoming: FriendshipRow[] = [];
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id, status, created_at')
          .eq('friend_id', uid)
          .eq('status', 'pending');
        if (error) throw error;
        incoming = (data ?? []) as FriendshipRow[];
      } catch {
        incoming = [];
      }
      setPendingIn(incoming);

      let accepted: FriendshipRow[] = [];
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id, status, created_at')
          .eq('status', 'accepted')
          .or(`user_id.eq.${uid},friend_id.eq.${uid}`);
        if (error) throw error;
        accepted = (data ?? []) as FriendshipRow[];
      } catch {
        accepted = [];
      }
      setFriendsRows(accepted);

      const otherIds = new Set<string>();
      for (const row of accepted) {
        otherIds.add(row.user_id === uid ? row.friend_id : row.user_id);
      }
      for (const row of incoming) {
        otherIds.add(row.user_id);
      }

      const ids = [...otherIds];
      const pmap: Record<string, ProfileMini> = {};
      if (ids.length > 0) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', ids);
          if (!error && data) {
            for (const p of data as ProfileMini[]) {
              pmap[p.id] = p;
            }
          }
        } catch {
          /* ignore */
        }
      }
      setProfileMap(pmap);

      const friendIds = accepted.map((r) => (r.user_id === uid ? r.friend_id : r.user_id));

      const lastMap: Record<string, ActivityRow> = {};
      if (friendIds.length > 0 && isOnline) {
        try {
          const { data, error } = await supabase
            .from('friend_activity')
            .select('id, user_id, type, verse_id, book, chapter, note, created_at')
            .in('user_id', friendIds)
            .order('created_at', { ascending: false })
            .limit(80);
          if (!error && data) {
            for (const a of data as ActivityRow[]) {
              if (!lastMap[a.user_id]) lastMap[a.user_id] = a;
            }
          }
        } catch {
          /* ignore */
        }
      }
      setLastByUser(lastMap);

      let feed: ActivityRow[] = [];
      if (friendIds.length > 0 && isOnline) {
        try {
          const { data, error } = await supabase
            .from('friend_activity')
            .select('id, user_id, type, verse_id, book, chapter, note, created_at')
            .in('user_id', friendIds)
            .order('created_at', { ascending: false })
            .limit(20);
          if (!error && data) feed = data as ActivityRow[];
        } catch {
          feed = [];
        }
      }
      setActivities(feed);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const displayName = (id: string) => {
    const p = profileMap[id];
    return (p?.display_name?.trim() || p?.email?.split('@')[0] || t('defaultFriendName')) as string;
  };

  const goAuth = () => {
    try {
      router.replace('/auth');
    } catch {
      /* ignore */
    }
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!supabase) {
      showAlert('Söz', t('serverOfflineMsg'));
      return;
    }
    if (!email || !isRealAccount(user) || !isOnline) {
      if (!isOnline) showAlert('Söz', t('internetRequiredMsg'));
      return;
    }
    setInviteBusy(true);
    try {
      const { data: rows, error } = await supabase.rpc('find_user_by_email', {
        search_email: email,
      });
      if (error) throw error;
      const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
      if (!row?.uid) {
        showAlert('Söz', t('userNotFoundByEmail'));
        return;
      }
      const targetId = row.uid as string;
      if (targetId === user!.id) {
        showAlert('Söz', t('cannotInviteSelf'));
        return;
      }
      const { error: insErr } = await supabase.from('friendships').insert({
        user_id: user!.id,
        friend_id: targetId,
        status: 'pending',
      });
      if (insErr) {
        if (insErr.code === '23505') {
          showAlert('Söz', t('requestAlreadyExists'));
        } else {
          throw insErr;
        }
        return;
      }
      setInviteEmail('');
      showAlert('Söz', t('inviteSent'));
      loadAll();
    } catch (e) {
      showAlert('Söz', t('inviteSendFailed'));
    } finally {
      setInviteBusy(false);
    }
  };

  const acceptRequest = async (row: FriendshipRow) => {
    if (!isOnline) return;
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    try {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', row.id);
      if (error) throw error;
      loadAll();
    } catch {
      showAlert('Söz', t('requestAcceptFailed'));
    }
  };

  const rejectRequest = async (row: FriendshipRow) => {
    if (!isOnline) return;
    if (!supabase) {
      console.log('Supabase not available, using local storage');
      return;
    }
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', row.id);
      if (error) throw error;
      loadAll();
    } catch {
      showAlert('Söz', t('requestRejectFailed'));
    }
  };

  const onActivityPress = (a: ActivityRow) => {
    if (a.verse_id) {
      const p = verseIdToReadParams(a.verse_id);
      if (p) {
        router.push({ pathname: '/(tabs)/read', params: { bookId: p.bookId, chapter: p.chapter } });
        return;
      }
    }
    if (a.book != null && a.chapter != null) {
      const p = bookNameToReadParams(a.book, a.chapter);
      if (p) {
        router.push({ pathname: '/(tabs)/read', params: { bookId: p.bookId, chapter: p.chapter } });
        return;
      }
    }
    if (a.type === 'plan_started' || a.type === 'plan_day_complete') {
      router.push('/(tabs)/plans');
    }
  };

  const onShareToggle = async (v: boolean) => {
    setShareActivityState(v);
    try {
      await setShareActivityEnabled(v);
    } catch {
      /* ignore */
    }
  };

  const uid = user?.id ?? '';
  const friendIdsForUnread = useMemo(
    () => friendsRows.map((r) => (r.user_id === uid ? r.friend_id : r.user_id)),
    [friendsRows, uid]
  );
  const { unreadCounts } = useUnreadMessageCounts(friendIdsForUnread);

  if (!loading && !isRealAccount(user)) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>{t('friends')}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.guestBox}>
          <Text style={[styles.guestText, { color: theme.textMuted }]}>
            {t('friendFeatureSignInPrompt')}
          </Text>
          <Pressable style={styles.authBtn} onPress={goAuth}>
            <Text style={styles.authBtnText}>{t('signInShort')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => safeBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t('friends')}</Text>
        <Pressable
          onPress={() => {
            /* scroll to invite — already visible */
          }}
          hitSlop={12}
        >
          <Ionicons name="person-add-outline" size={26} color={ACCENT} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('friendInviteCardTitle')}</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.textMuted }]}
              placeholder={t('emailAddressPlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Pressable
              style={[styles.primaryBtn, { opacity: inviteBusy || !isOnline ? 0.6 : 1 }]}
              onPress={sendInvite}
              disabled={inviteBusy || !isOnline}
            >
              <Text style={styles.primaryBtnText}>
                {inviteBusy ? t('sendingEllipsis') : t('sendInviteCta')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.rowBetween}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              {pendingIn.length > 0 ? t('pendingFriendRequestsCount', { n: pendingIn.length }) : t('noPendingRequests')}
            </Text>
          </View>
          {pendingIn.map((row) => {
            const fromId = row.user_id;
            const name = displayName(fromId);
            const p = profileMap[fromId];
            return (
              <View key={row.id} style={[styles.requestRow, { backgroundColor: theme.surface }]}>
                <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
                  <Text style={styles.avatarText}>{initials(name, p?.email ?? null)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: theme.text }]}>{name}</Text>
                  {p?.email ? (
                    <Text style={[styles.friendEmail, { color: theme.textMuted }]}>{p.email}</Text>
                  ) : null}
                </View>
                <Pressable style={styles.acceptBtn} onPress={() => acceptRequest(row)}>
                  <Text style={styles.acceptBtnText}>{t('acceptCta')}</Text>
                </Pressable>
                <Pressable style={styles.rejectBtn} onPress={() => rejectRequest(row)}>
                  <Text style={[styles.rejectBtnText, { color: theme.textMuted }]}>{t('declineCta')}</Text>
                </Pressable>
              </View>
            );
          })}

          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>
            {t('yourFriendsLabel')}
          </Text>
          {friendsRows.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>{t('noFriendsYet')}</Text>
          ) : (
            friendsRows.map((row) => {
              const fid = row.user_id === uid ? row.friend_id : row.user_id;
              const name = displayName(fid);
              const p = profileMap[fid];
              const last = lastByUser[fid];
              const sub = last
                ? `${lastActivityLine(last.type, last.verse_id, last.book, last.chapter, last.note)} · ${formatActivityTimeLong(last.created_at)}`
                : t('noActivityYet');
              const unread = unreadCounts[fid] ?? 0;
              return (
                <View key={row.id} style={[styles.friendRow, { backgroundColor: theme.surface }]}>
                  <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
                    <Text style={styles.avatarText}>{initials(name, p?.email ?? null)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.friendName, { color: theme.text }]}>{name}</Text>
                    <Text style={[styles.friendEmail, { color: theme.textMuted }]}>{p?.email ?? ''}</Text>
                    <Text style={[styles.lastAct, { color: theme.textMuted }]}>{sub}</Text>
                  </View>
                  <Pressable
                    style={styles.msgBtn}
                    onPress={() =>
                      router.push({ pathname: '/chat/[friendId]', params: { friendId: fid, friendName: name } })
                    }
                    hitSlop={8}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color={ACCENT} />
                    {unread > 0 ? (
                      <View style={styles.msgBadge}>
                        <Text style={styles.msgBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })
          )}

          <View style={[styles.shareRow, { backgroundColor: theme.surface }]}>
            <Text style={[styles.shareLabel, { color: theme.text }]}>{t('shareActivityToggleLabel')}</Text>
            <Switch
              value={shareActivity}
              onValueChange={onShareToggle}
              trackColor={{ false: theme.textMuted, true: ACCENT }}
              thumbColor={colors.white}
            />
          </View>

          <Text style={[styles.feedTitle, { color: theme.textMuted }]}>{t('friendActivityCaps')}</Text>
          {activities.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              {friendsRows.length === 0 ? t('addFriendToSeeHere') : t('noSharedActivityYet')}
            </Text>
          ) : (
            activities.map((a) => {
              const name = displayName(a.user_id);
              const line = activityDescription(
                a.type,
                a.verse_id,
                a.book,
                a.chapter,
                a.note,
                name
              );
              const p = profileMap[a.user_id];
              return (
                <Pressable
                  key={a.id}
                  style={[styles.actCard, { backgroundColor: theme.surface }]}
                  onPress={() => onActivityPress(a)}
                >
                  <View style={[styles.actAvatar, { backgroundColor: ACCENT }]}>
                    <Text style={styles.actAvatarText}>{initials(name, p?.email ?? null)}</Text>
                  </View>
                  <Text style={[styles.actBody, { color: theme.text }]} numberOfLines={3}>
                    {line}
                  </Text>
                  <Text style={[styles.actTime, { color: theme.textMuted }]}>
                    {formatActivityTimeShort(a.created_at)}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
    <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 28,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guestBox: { padding: 24, alignItems: 'center' },
  guestText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  authBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.button,
  },
  authBtnText: {
    fontFamily: fonts.medium,
    color: colors.white,
    fontSize: 16,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.medium,
    color: colors.white,
    fontSize: 15,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  msgBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#E57373',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontFamily: fonts.medium,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: fonts.medium,
    color: colors.white,
    fontSize: 14,
  },
  friendName: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  friendEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  lastAct: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  acceptBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: {
    fontFamily: fonts.medium,
    color: colors.white,
    fontSize: 13,
  },
  rejectBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  rejectBtnText: { fontFamily: fonts.regular, fontSize: 13 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  shareLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  feedTitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 12,
  },
  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  actAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actAvatarText: {
    fontFamily: fonts.medium,
    color: colors.white,
    fontSize: 13,
  },
  actBody: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  actTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    opacity: 0.9,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

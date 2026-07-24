import { isRealAccount } from '@/constants/friend-activity';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { SozAlert } from '@/components/SozAlert';
import { useHaptics } from '@/hooks/useHaptics';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useTheme } from '@/hooks/useTheme';
import { useSafeBack } from '@/hooks/useSafeBack';
import {
  useNotificationsCenter,
  type PendingFriendRequest,
  type UnreadChatThread,
} from '@/hooks/useNotificationsCenter';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

function initials(name: string, email: string | null): string {
  const n = name?.trim() || email?.split('@')[0] || '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const safeBack = useSafeBack();
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const haptics = useHaptics();
  const {
    loading,
    user,
    pendingRequests,
    unreadThreads,
    acceptRequest,
    rejectRequest,
    markAllThreadsRead,
    reload,
  } = useNotificationsCenter();
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const goAuth = () => {
    try {
      router.replace('/auth');
    } catch {
      /* ignore */
    }
  };

  const onAccept = async (row: PendingFriendRequest) => {
    const ok = await acceptRequest(row.id);
    if (ok) {
      haptics.success();
    } else {
      haptics.error();
      showAlert('Söz', t('requestAcceptFailed'));
    }
  };

  const onReject = async (row: PendingFriendRequest) => {
    const ok = await rejectRequest(row.id);
    if (ok) {
      haptics.light();
    } else {
      haptics.error();
      showAlert('Söz', t('requestRejectFailed'));
    }
  };

  const goToChat = (row: UnreadChatThread) => {
    router.push({ pathname: '/chat/[friendId]', params: { friendId: row.friendId, friendName: row.name } });
  };

  const onMarkAllRead = async () => {
    if (markingAll || unreadThreads.length === 0) return;
    setMarkingAll(true);
    try {
      haptics.selection();
      await markAllThreadsRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const isGuest = !loading && !isRealAccount(user);
  const isEmpty = !loading && !isGuest && pendingRequests.length === 0 && unreadThreads.length === 0;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={ACCENT}
      colors={[ACCENT]}
    />
  );

  return (
    <>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => safeBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>{t('notificationsTitle')}</Text>
          {unreadThreads.length > 0 ? (
            <Pressable
              onPress={() => void onMarkAllRead()}
              disabled={markingAll}
              hitSlop={8}
              style={styles.markAllHeaderBtn}
              accessibilityRole="button"
              accessibilityLabel={t('markAllThreadsRead')}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <Text style={styles.markAllHeaderText} numberOfLines={2}>
                  {t('markAllThreadsRead')}
                </Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : isGuest ? (
          <View style={styles.guestBox}>
            <Text style={[styles.guestText, { color: theme.textMuted }]}>
              {t('friendFeatureSignInPrompt')}
            </Text>
            <Pressable style={styles.authBtn} onPress={goAuth}>
              <Text style={styles.authBtnText}>{t('signInShort')}</Text>
            </Pressable>
          </View>
        ) : isEmpty ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, styles.centeredGrow]}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            <Ionicons name="notifications-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.empty, { color: theme.textMuted, marginTop: 12 }]}>
              {t('noNotificationsMsg')}
            </Text>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              {pendingRequests.length > 0
                ? t('pendingFriendRequestsCount', { n: pendingRequests.length })
                : t('noPendingRequests')}
            </Text>
            {pendingRequests.map((row) => (
              <View key={row.id} style={[styles.requestRow, { backgroundColor: theme.surface }]}>
                <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
                  <Text style={styles.avatarText}>{initials(row.name, row.email)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: theme.text }]}>{row.name}</Text>
                  {row.email ? (
                    <Text style={[styles.friendEmail, { color: theme.textMuted }]}>{row.email}</Text>
                  ) : null}
                </View>
                <Pressable style={styles.acceptBtn} onPress={() => onAccept(row)}>
                  <Text style={styles.acceptBtnText}>{t('acceptCta')}</Text>
                </Pressable>
                <Pressable style={styles.rejectBtn} onPress={() => onReject(row)}>
                  <Text style={[styles.rejectBtnText, { color: theme.textMuted }]}>{t('declineCta')}</Text>
                </Pressable>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>
              {t('unreadChatsLabel')}
            </Text>
            {unreadThreads.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textMuted }]}>{t('noUnreadChatsMsg')}</Text>
            ) : (
              unreadThreads.map((row) => (
                <Pressable
                  key={row.friendId}
                  style={[styles.friendRow, { backgroundColor: theme.surface }]}
                  onPress={() => goToChat(row)}
                >
                  <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
                    <Text style={styles.avatarText}>{initials(row.name, row.email)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.friendName, { color: theme.text }]}>{row.name}</Text>
                    {row.email ? (
                      <Text style={[styles.friendEmail, { color: theme.textMuted }]}>{row.email}</Text>
                    ) : null}
                  </View>
                  <View style={styles.unreadPill}>
                    <Text style={styles.unreadPillText}>
                      {row.unreadCount > 9 ? '9+' : row.unreadCount}
                    </Text>
                  </View>
                </Pressable>
              ))
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
    gap: 8,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 28,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { width: 72 },
  markAllHeaderBtn: {
    maxWidth: 96,
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markAllHeaderText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: ACCENT,
    textAlign: 'right',
    lineHeight: 15,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredGrow: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
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
  unreadPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: '#E57373',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: fonts.medium,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

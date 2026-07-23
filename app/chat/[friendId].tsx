import { colorForUserId } from '@/constants/avatar-colors';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useChatThread, type ChatMessage } from '@/hooks/useMessages';
import { useTranslation } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

type ChatListItem =
  | { kind: 'separator'; id: string; label: string }
  | { kind: 'message'; id: string; message: ChatMessage };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function timeOfDay(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(iso: string, todayLabel: string, yesterdayLabel: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startToday - startMsg) / 86_400_000);
  if (diffDays === 0) return todayLabel;
  if (diffDays === 1) return yesterdayLabel;
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  }
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildChatListItems(
  messages: ChatMessage[],
  todayLabel: string,
  yesterdayLabel: string
): ChatListItem[] {
  const items: ChatListItem[] = [];
  let prevDay: string | null = null;
  for (const message of messages) {
    const key = dayKey(message.createdAt);
    if (key !== prevDay) {
      items.push({
        kind: 'separator',
        id: `sep-${key}`,
        label: formatDayLabel(message.createdAt, todayLabel, yesterdayLabel),
      });
      prevDay = key;
    }
    items.push({ kind: 'message', id: message.id, message });
  }
  return items;
}

/** SpeechBar PlayingDots ile aynı opaklık döngüsü — yazıyor göstergesi. */
function TypingDots({ color }: { color: string }) {
  const bars = useRef([0, 1, 2].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const loops = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(v, { toValue: 1, duration: 340, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.35, duration: 340, easing: Easing.linear, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [bars]);

  return (
    <View style={typingDotStyles.row}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={[typingDotStyles.dot, { backgroundColor: color, opacity: v }]} />
      ))}
    </View>
  );
}

const typingDotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});

export default function ChatThreadScreen() {
  const { colors, fonts } = useTheme();
  const haptics = useHaptics();
  const safeBack = useSafeBack();
  const { t } = useTranslation();
  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName?: string }>();
  const { messages, loading, myId, theirTyping, notifyTyping, sendMessage, markRead } = useChatThread(
    friendId ?? ''
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const name = friendName?.trim() || t('defaultFriendName');

  useFocusEffect(
    useCallback(() => {
      void markRead();
    }, [markRead])
  );

  const handleChangeText = useCallback(
    (text: string) => {
      setInput(text);
      if (text.trim()) notifyTyping();
    },
    [notifyTyping]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    const result = await sendMessage(text);
    setSending(false);
    if (!result.ok) {
      haptics.error();
      setInput(text);
      return;
    }
    haptics.light();
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [input, sending, sendMessage, haptics]);

  const styles = useMemo(() => makeStyles(colors, fonts), [colors, fonts]);

  const yesterdayLabel = useMemo(() => {
    const raw = t('yesterdayLower');
    return raw ? raw.charAt(0).toLocaleUpperCase('tr-TR') + raw.slice(1) : 'Dün';
  }, [t]);

  const listItems = useMemo(
    () => buildChatListItems(messages, t('today'), yesterdayLabel),
    [messages, t, yesterdayLabel]
  );

  const lastMineMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === myId) return messages[i].id;
    }
    return null;
  }, [messages, myId]);

  const typingRow = theirTyping ? (
    <View style={styles.typingRow} accessibilityLiveRegion="polite">
      <TypingDots color={ACCENT} />
      <Text style={styles.typingText}>{t('typing')}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => safeBack()}
          style={styles.iconBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View
            style={[
              styles.headerAvatar,
              { backgroundColor: colorForUserId(friendId ?? '') },
            ]}
          >
            <Text style={styles.headerAvatarText}>{initials(name)}</Text>
          </View>
          <Text style={styles.headerName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, messages.length === 0 && styles.listEmpty]}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              theirTyping ? null : (
                <View style={styles.centerBox}>
                  <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.emptyText}>{t('noMessagesYet')}</Text>
                </View>
              )
            }
            ListFooterComponent={typingRow}
            renderItem={({ item }) => {
              if (item.kind === 'separator') {
                return (
                  <View style={styles.dateSepWrap}>
                    <View style={styles.dateSepPill}>
                      <Text style={styles.dateSepText}>{item.label}</Text>
                    </View>
                  </View>
                );
              }
              const msg = item.message;
              const mine = msg.senderId === myId;
              const showSeen = mine && msg.id === lastMineMessageId && !!msg.readAt;
              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{msg.text}</Text>
                  </View>
                  <Text style={styles.bubbleTime}>{timeOfDay(msg.createdAt)}</Text>
                  {showSeen ? <Text style={styles.readReceipt}>{t('messageSeen')}</Text> : null}
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={handleChangeText}
            placeholder={t('messagePlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={!input.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel={t('send')}
          >
            <Ionicons name="arrow-up" size={20} color="#FFF8EE" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: { background: string; surface: string; text: string; textMuted: string; border: string }, fonts: { regular: string; medium: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    headerAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAvatarText: { fontSize: 12, color: '#FFF8EE', fontFamily: fonts.medium },
    headerName: { fontSize: 16, color: colors.text, fontFamily: fonts.medium },
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fonts.regular },
    listContent: { padding: 16, gap: 10, flexGrow: 1 },
    listEmpty: { justifyContent: 'center' },
    dateSepWrap: {
      alignSelf: 'stretch',
      alignItems: 'center',
      marginVertical: 4,
    },
    dateSepPill: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    dateSepText: {
      fontSize: 12,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
    typingRow: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    typingText: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular },
    bubbleRow: { maxWidth: '80%', gap: 2 },
    bubbleRowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    bubbleRowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMine: { backgroundColor: ACCENT, borderBottomRightRadius: 4 },
    bubbleTheirs: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
      // day/sepia'da surface ≈ background — balonun kenarı kaybolmasın
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bubbleText: { fontSize: 15, color: colors.text, fontFamily: fonts.regular, lineHeight: 20 },
    bubbleTextMine: { color: '#FFF8EE' },
    bubbleTime: { fontSize: 10, color: colors.textMuted, fontFamily: fonts.regular, marginHorizontal: 4 },
    readReceipt: {
      fontSize: 11,
      color: colors.textMuted,
      fontFamily: fonts.regular,
      marginHorizontal: 4,
      marginTop: 1,
      opacity: 0.85,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.regular,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
}

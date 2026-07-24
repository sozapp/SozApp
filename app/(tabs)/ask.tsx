import { parseVerseRefForRead } from '@/constants/ask-verse-parse';
import { askQuestion, isSupabaseConfigured, transcribeAudio } from '@/constants/groq';
import { FREE_AI_QUESTIONS_PER_DAY } from '@/constants/premium';
import { borderRadius, fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useNetwork } from '@/context/NetworkContext';
import { usePremium } from '@/hooks/usePremium';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useTheme } from '@/hooks/useTheme';
import { useAnalyticsScreen } from '@/hooks/useAnalyticsScreen';
import { SozAlert } from '@/components/SozAlert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

const CONVERSATIONS_KEY = '@soz/conversations';
const SAVED_ANSWERS_KEY = '@soz/savedAnswers';
const LAST_ASK_RESULT_KEY = '@soz/lastAskResult';
const FREE_DAILY_LIMIT = FREE_AI_QUESTIONS_PER_DAY;
const MAX_CONVERSATIONS = 20;
const ACCENT = '#C4956A';
const ACCENT_LIGHT = '#FFF8EE';

const VERSE_REGEX = /(\d?\s?[A-Za-zÇçĞğİıÖöŞşÜü]+\s+\d+:\d+)/g;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
};

type UsageState = {
  count: number;
};

const QUICK_QUESTIONS = [
  'Yuhanna 3:16 ne anlama geliyor?',
  "İsa'nın en önemli öğretisi neydi?",
  'Pavlus kimdir?',
  'Dua nasıl yapılır?',
];

const QUICK_FOLLOWUPS = [
  { label: 'Daha fazla anlat', send: 'Önceki cevabını daha ayrıntılı ve genişleterek anlat.' },
  { label: 'Ayet referansı ver', send: 'Önceki konu için mümkün olduğunca çok ayet referansı parantez içinde ver.' },
  { label: 'Basitçe açıkla', send: 'Aynı konuyu daha basit kelimelerle ve kısaca açıkla.' },
];

function parseVerseRefs(text: string): Array<{ type: 'text'; value: string } | { type: 'ref'; value: string }> {
  const parts: Array<{ type: 'text'; value: string } | { type: 'ref'; value: string }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(VERSE_REGEX.source, 'g');
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    parts.push({ type: 'ref', value: m[1].trim() });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}

async function loadConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Conversation[];
    return (Array.isArray(arr) ? arr : []).map((c) => ({
      ...c,
      messages: (c.messages ?? []).map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

async function saveConversations(list: Conversation[]): Promise<void> {
  try {
    const toSave = list.slice(0, MAX_CONVERSATIONS).map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp as unknown as string),
      })),
    }));
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(toSave));
  } catch (_) {}
}

function SozLogoMark({ size }: { size: number }) {
  return (
    <Text
      style={{
        fontFamily: fonts.thin,
        fontSize: size * 0.55,
        letterSpacing: size * 0.08,
        color: ACCENT,
      }}
    >
      SÖZ
    </Text>
  );
}

function TypingDots() {
  const y1 = useRef(new Animated.Value(0)).current;
  const y2 = useRef(new Animated.Value(0)).current;
  const y3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: -5, duration: 200, useNativeDriver: false }),
          Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: false }),
          Animated.delay(400),
        ])
      );
    const a1 = bounce(y1, 0);
    const a2 = bounce(y2, 400);
    const a3 = bounce(y3, 800);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [y1, y2, y3]);

  const dot = (v: Animated.Value) => (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: ACCENT,
        transform: [{ translateY: v }],
      }}
    />
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingVertical: 6 }}>
      {dot(y1)}
      {dot(y2)}
      {dot(y3)}
    </View>
  );
}

function AssistantTextWithLinks({
  text,
  bodyColor,
  onVersePress,
}: {
  text: string;
  bodyColor: string;
  onVersePress: (ref: string) => void;
}) {
  const parts = parseVerseRefs(text);
  return (
    <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>
      {parts.map((part, i) => {
        if (part.type === 'ref' && parseVerseRefForRead(part.value)) {
          return (
            <Text
              key={i}
              onPress={() => onVersePress(part.value)}
              style={styles.verseLink}
            >
              {part.value}
            </Text>
          );
        }
        return (
          <Text key={i} style={{ color: bodyColor }}>
            {part.type === 'text' ? part.value : part.value}
          </Text>
        );
      })}
    </Text>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function AskScreen() {
  useAnalyticsScreen('ask');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isOffline } = useNetwork();
  const { isPremium } = usePremium();
  const router = useRouter();
  const safeBack = useSafeBack();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [usage, setUsage] = useState<UsageState>({ count: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null);
  const [showMsgActions, setShowMsgActions] = useState(false);
  const [recordingVis, setRecordingVis] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [storedUserProfile, setStoredUserProfile] = useState('');
  const [lastOfflineAnswer, setLastOfflineAnswer] = useState<string | null>(null);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const scrollRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const conversationsLoaded = useRef(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const bg = colors.background;
  const surface = colors.surface;
  const text = colors.text;
  const muted = colors.textMuted;

  const supabaseReady = isSupabaseConfigured();
  const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
  const canAsk = supabaseReady && (isPremium || remaining > 0);

  useEffect(() => {
    let cancel = false;
    loadConversations().then((list) => {
      if (!cancel) setConversations(list);
      conversationsLoaded.current = true;
    });
    return () => {
      cancel = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      void (async () => {
        try {
          const cached = await AsyncStorage.getItem(LAST_ASK_RESULT_KEY);
          if (mounted) setLastOfflineAnswer(cached?.trim() ? cached : null);
        } catch {
          if (mounted) setLastOfflineAnswer(null);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  useEffect(() => {
    if (prefill && typeof prefill === 'string') {
      setInput(prefill);
      setTimeout(() => {
        sendMessage(prefill);
      }, 600);
    }
    // Only on first mount / when prefill changes from route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const v = await AsyncStorage.getItem('@soz/userProfile');
          setStoredUserProfile((v ?? '').trim());
        } catch (e) {
          console.error('userProfile load (ask):', e);
          setStoredUserProfile('');
        }
      })();
    }, [])
  );

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages.length, loading]);

  const navigateToVerse = useCallback(
    (ref: string) => {
      try {
        const parsed = parseVerseRefForRead(ref);
        if (parsed) {
          router.push({
            pathname: '/(tabs)/read',
            params: {
              bookId: parsed.bookId,
              chapter: String(parsed.chapter),
              highlightVerse: String(parsed.verse),
            },
          });
        }
      } catch (_) {
        /* ignore */
      }
    },
    [router]
  );

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;
      if (!supabaseReady) {
        showAlert(
          'Söz\'e Sor kullanılamıyor',
          'Bu özellik güvenli sunucu doğrulaması gerektirir. Lütfen Supabase yapılandırmasını tamamlayın veya internet bağlantınızı kontrol edin.'
        );
        return;
      }

      if (isOffline) {
        setErrorMessage('Bağlantı kurulamadı. İnternet bağlantını kontrol et.');
        setLastFailedQuestion(trimmed);
        if (lastOfflineAnswer) {
          setMessages((prev) => {
            if (prev.length > 0) return prev;
            return [
              {
                id: `a-offline-${Date.now()}`,
                role: 'assistant',
                content: lastOfflineAnswer,
                timestamp: new Date(),
              },
            ];
          });
        }
        return;
      }

      if (!isPremium && usage.count >= FREE_DAILY_LIMIT) {
        try {
          router.push('/paywall');
        } catch {
          /* ignore */
        }
        return;
      }

      setErrorMessage(null);
      setLastFailedQuestion(null);
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      try {
        const result = await askQuestion(
          trimmed,
          history,
          storedUserProfile || undefined,
        );
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: result.answer || 'Yanıt oluşturulamadı.',
          timestamp: new Date(),
        };
        void AsyncStorage.setItem(LAST_ASK_RESULT_KEY, assistantMsg.content).catch(() => {});
        setLastOfflineAnswer(assistantMsg.content);
        setMessages((prev) => {
          const next = [...prev, assistantMsg];
          const firstUser = next.find((m) => m.role === 'user');
          const title = firstUser ? firstUser.content.slice(0, 40).trim() : 'Sohbet';
          const conv: Conversation = {
            id: currentConversationId ?? `conv-${Date.now()}`,
            title: title.length > 0 ? title : 'Sohbet',
            messages: next,
            createdAt: currentConversationId ? (conversations.find((c) => c.id === currentConversationId)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
          };
          setConversations((list) => {
            const without = list.filter((c) => c.id !== conv.id);
            const updated = [conv, ...without].slice(0, MAX_CONVERSATIONS);
            saveConversations(updated);
            return updated;
          });
          if (!currentConversationId) setCurrentConversationId(conv.id);
          return next;
        });
        if (!isPremium && result.questionsUsed > 0) {
          setUsage({ count: result.questionsUsed });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        console.warn('AI hatası (ask):', msg || e);
        if (msg === 'SUPABASE_NOT_CONFIGURED' || msg === 'AUTH_REQUIRED') {
          setMessages((prev) => prev.slice(0, -1));
          setInput(trimmed);
          showAlert(
            'Giriş gerekiyor',
            'Söz\'e Sor özelliğini kullanmak için giriş yapmanız gerekiyor.',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Giriş Yap', onPress: () => router.push('/auth') },
            ]
          );
        } else if (msg === 'DAILY_LIMIT_REACHED') {
          const used =
            e && typeof e === 'object' && 'questionsUsed' in e
              ? Number((e as { questionsUsed?: number }).questionsUsed)
              : FREE_DAILY_LIMIT;
          setUsage({ count: used || FREE_DAILY_LIMIT });
          setMessages((prev) => prev.slice(0, -1));
          setInput(trimmed);
          try {
            router.push('/paywall');
          } catch {
            /* ignore */
          }
        } else {
          const msgLower = msg.toLowerCase();
          const isNetwork =
            e instanceof TypeError ||
            msgLower.includes('network') ||
            msgLower.includes('zaman aşımı') ||
            msgLower.includes('fetch') ||
            (e &&
              typeof e === 'object' &&
              'message' in e &&
              String((e as Error).message).toLowerCase().includes('network'));
          if (isNetwork) {
            setErrorMessage('Bağlantı kurulamadı. İnternet bağlantını kontrol et.');
            setLastFailedQuestion(trimmed);
            setMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: 'İnternet bağlantınızı kontrol edin.',
                timestamp: new Date(),
              },
            ]);
          } else {
            showAlert('Hata', 'Bağlantı hatası, tekrar deneyin.');
            setLastFailedQuestion(trimmed);
            setMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: 'Bağlantı hatası, tekrar deneyin.',
                timestamp: new Date(),
              },
            ]);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      messages,
      usage.count,
      isPremium,
      isOffline,
      lastOfflineAnswer,
      currentConversationId,
      storedUserProfile,
      supabaseReady,
    ]
  );

  const clearChat = useCallback(() => {
    showAlert('Sohbeti temizle', 'Tüm mesajlar silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          setCurrentConversationId(null);
        },
      },
    ]);
  }, []);

  const loadConversation = useCallback((conv: Conversation) => {
    setMessages(conv.messages.map((m) => ({ ...m, timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp) })));
    setCurrentConversationId(conv.id);
    setShowHistory(false);
  }, []);

  const clearAllHistory = useCallback(() => {
    showAlert('Geçmişi temizle', 'Kayıtlı tüm sohbetler silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: async () => {
          setConversations([]);
          await AsyncStorage.removeItem(CONVERSATIONS_KEY);
        },
      },
    ]);
  }, []);

  const openMsgActions = useCallback(
    (content: string) => {
      slideAnim.setValue(300);
      overlayAnim.setValue(0);
      setSelectedMsg(content);
      setShowMsgActions(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [slideAnim, overlayAnim]
  );

  const closeMsgActions = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setShowMsgActions(false);
      setSelectedMsg(null);
    });
  }, [slideAnim, overlayAnim]);

  const micPressIn = async () => {
    if (isOffline) {
      showAlert('İnternet gerekli', 'Sesli soru için bağlantı gerekir.');
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert('İzin gerekli', 'Sesli soru için mikrofon iznine ihtiyaç var.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setRecordingVis(true);
    } catch (_) {
      recordingRef.current = null;
      showAlert('Hata', 'Kayıt başlatılamadı.');
    }
  };

  const micPressOut = async () => {
    setRecordingVis(false);
    const r = recordingRef.current;
    recordingRef.current = null;
    if (!r) return;
    try {
      await r.stopAndUnloadAsync();
      const uri = r.getURI();
      if (!uri) throw new Error('Kayıt bulunamadı');
      setIsTranscribing(true);
      const text = await transcribeAudio(uri);
      if (text) {
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      } else {
        showAlert('Anlaşılamadı', 'Ses metne çevrilemedi, tekrar dener misin?');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'SUPABASE_NOT_CONFIGURED' || msg === 'AUTH_REQUIRED') {
        showAlert('Giriş gerekiyor', 'Sesli soru için giriş yapmanız gerekiyor.', [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/auth') },
        ]);
      } else {
        showAlert('Hata', 'Ses metne çevrilemedi, tekrar dener misin?');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const lastAssistantId =
    messages.length > 0 && messages[messages.length - 1].role === 'assistant'
      ? messages[messages.length - 1].id
      : null;

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => safeBack()}
          style={styles.headerLeft}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Ionicons name="arrow-back" size={22} color={muted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: text }]}>{t('askTitle')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowHistory(true)}
          style={styles.headerRight}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('history')}
        >
          <Ionicons name="time-outline" size={22} color={muted} />
        </TouchableOpacity>
      </View>

      {isOffline ? (
        <View style={[styles.offlineBox, { backgroundColor: `${ACCENT}1F` }]}>
          <Text style={[styles.offlineText, { color: muted }]}>İnternet bağlantısı yok. Bağlandığında tekrar dene.</Text>
        </View>
      ) : null}
      {!supabaseReady ? (
        <View style={[styles.offlineBox, { backgroundColor: `${ACCENT}1F` }]}>
          <Text style={[styles.offlineText, { color: muted }]}>
            Söz'e Sor, güvenli sunucu doğrulaması için Supabase yapılandırması gerektirir.
          </Text>
        </View>
      ) : null}
      {isOffline && lastOfflineAnswer ? (
        <View style={[styles.offlineCacheBox, { backgroundColor: surface, borderColor: colors.border }]}>
          <Text style={[styles.offlineCacheTitle, { color: text }]}>Önceki sonuç</Text>
          <Text style={[styles.offlineCacheText, { color: muted }]} numberOfLines={5}>
            {lastOfflineAnswer}
          </Text>
        </View>
      ) : null}

      {!isPremium && (
        <View style={styles.quotaBar}>
          <View style={styles.quotaLeft}>
            <Ionicons name="chatbubble-outline" size={12} color={`${ACCENT}B3`} />
            <Text style={[styles.quotaText, { color: muted }]}>
              {usage.count}/{FREE_DAILY_LIMIT} soru
            </Text>
          </View>
          <View style={styles.quotaTrack}>
            <View
              style={[
                styles.quotaFill,
                {
                  width: `${Math.min(100, (usage.count / FREE_DAILY_LIMIT) * 100)}%` as `${number}%`,
                  backgroundColor: usage.count >= FREE_DAILY_LIMIT ? '#E74C3C' : ACCENT,
                },
              ]}
            />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !loading && !isOffline && (
            <View style={styles.emptyState}>
              <View style={styles.emptyLogo}>
                <Svg width={32} height={32} viewBox="0 0 40 40" fill="none">
                  <Line
                    x1="13"
                    y1="11"
                    x2="27"
                    y2="11"
                    stroke={ACCENT}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <Path
                    d="M27 11C27 11 13 11 13 20C13 29 27 29 27 29"
                    stroke={ACCENT}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Line
                    x1="13"
                    y1="29"
                    x2="27"
                    y2="29"
                    stroke={ACCENT}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <Circle cx="20" cy="20" r="2" fill={ACCENT} />
                </Svg>
              </View>
              <Text style={[styles.emptyTitle, { color: text }]}>Söz'e Sor</Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                İncil hakkında her şeyi sorabilirsin
              </Text>
              <View style={styles.quickWrap}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.quickItem, { backgroundColor: surface, borderColor: colors.border }]}
                    onPress={() => sendMessage(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickText, { color: text }]}>{q}</Text>
                    <Ionicons name="arrow-forward" size={13} color={muted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const showQuick =
              !loading &&
              m.role === 'assistant' &&
              m.id === lastAssistantId &&
              idx === messages.length - 1;

            return (
              <View key={m.id}>
                <View
                  style={[
                    styles.bubbleRow,
                    isUser ? styles.bubbleRowUser : styles.bubbleRowAsst,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.asstLogo}>
                      <SozLogoMark size={16} />
                    </View>
                  )}
                  {isUser ? (
                    <Pressable
                      style={[
                        styles.bubble,
                        styles.bubbleUser,
                        { backgroundColor: ACCENT },
                      ]}
                    >
                      <Text style={[styles.bubbleTextUser, { color: ACCENT_LIGHT }]}>{m.content}</Text>
                      <Text style={[styles.bubbleTime, { color: 'rgba(10,10,8,0.45)' }]}>
                        {formatTime(m.timestamp)}
                      </Text>
                    </Pressable>
                  ) : (
                    <TouchableOpacity
                      onLongPress={() => openMsgActions(m.content)}
                      delayLongPress={400}
                      activeOpacity={0.85}
                      style={[styles.bubble, styles.bubbleAsst, { backgroundColor: surface }]}
                    >
                      <AssistantTextWithLinks
                        text={m.content}
                        bodyColor={text}
                        onVersePress={navigateToVerse}
                      />
                      <Text style={[styles.bubbleTime, { color: muted }]}>{formatTime(m.timestamp)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {showQuick && (
                  <View style={styles.quickRow}>
                    {QUICK_FOLLOWUPS.map((q) => (
                      <Pressable
                        key={q.label}
                        style={[styles.quickChip, { borderColor: `${ACCENT}59` }]}
                        onPress={() => sendMessage(q.send)}
                      >
                        <Text style={[styles.quickChipText, { color: ACCENT }]}>{q.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {loading && (
            <View style={[styles.bubbleRow, styles.bubbleRowAsst]}>
              <View style={styles.asstLogo}>
                <SozLogoMark size={16} />
              </View>
              <View style={[styles.bubble, styles.bubbleAsst, { backgroundColor: surface }]}>
                <TypingDots />
              </View>
            </View>
          )}

          {errorMessage ? (
            <View>
              <Text style={[styles.errorText, { color: '#C62828' }]}>{errorMessage}</Text>
              {lastFailedQuestion ? (
                <TouchableOpacity
                  onPress={() => void sendMessage(lastFailedQuestion)}
                  style={styles.retryBtn}
                  disabled={loading || isOffline}
                >
                  <Text style={styles.retryBtnText}>Tekrar Sor</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {recordingVis ? (
          <View style={[styles.recBanner, { backgroundColor: `${ACCENT}26` }]}>
            <Text style={{ color: ACCENT, fontFamily: fonts.medium, fontSize: 13 }}>Kayıt…</Text>
          </View>
        ) : null}
        {isTranscribing ? (
          <View style={[styles.recBanner, { backgroundColor: `${ACCENT}26` }]}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={{ color: ACCENT, fontFamily: fonts.medium, fontSize: 13, marginLeft: 8 }}>
              Metne çevriliyor…
            </Text>
          </View>
        ) : null}

        <View style={[styles.inputWrap, { backgroundColor: bg, borderTopColor: `${ACCENT}1F` }]}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              onPressIn={micPressIn}
              onPressOut={micPressOut}
              style={[styles.micBtn, { backgroundColor: surface }]}
              disabled={loading || !canAsk || isOffline || isTranscribing}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('voiceInput')}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={muted} />
              ) : (
                <Ionicons
                  name={recordingVis ? 'mic' : 'mic-outline'}
                  size={20}
                  color={recordingVis ? '#E74C3C' : muted}
                />
              )}
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: surface, color: text, borderColor: `${ACCENT}33` }]}
              placeholder="Sorunuzu yazın..."
              placeholderTextColor={muted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={!loading && canAsk && !isOffline}
            />
            <Pressable
              style={[
                styles.sendBtn,
                (loading || !input.trim() || !canAsk || isOffline) && styles.sendBtnDisabled,
                { opacity: isOffline ? 0.45 : 1 },
              ]}
              onPress={() => sendMessage(input)}
              disabled={loading || !input.trim() || !canAsk || isOffline}
              accessibilityRole="button"
              accessibilityLabel={t('send')}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke={
                    loading || !input.trim() || !canAsk || isOffline ? colors.textFaint : ACCENT_LIGHT
                  }
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showHistory} transparent animationType="slide">
        <Pressable style={styles.actionOverlay} onPress={() => setShowHistory(false)}>
          <Pressable style={[styles.historySheet, { backgroundColor: surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.historyHandle, { backgroundColor: muted }]} />
            <View style={styles.historyHeaderRow}>
              <Text style={[styles.historyTitle, { color: text }]}>{t('history')}</Text>
              {conversations.length > 0 && (
                <Pressable onPress={clearAllHistory} hitSlop={10}>
                  <Text style={styles.historyClearBtn}>Temizle</Text>
                </Pressable>
              )}
            </View>
            <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
              {conversations.length === 0 ? (
                <Text style={[styles.historyEmpty, { color: muted }]}>Henüz konuşma yok</Text>
              ) : (
                conversations.map((conv) => (
                  <TouchableOpacity
                    key={conv.id}
                    style={[styles.historyRow, { borderBottomColor: colors.border }]}
                    onPress={() => loadConversation(conv)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.historyRowTitle, { color: text }]} numberOfLines={1}>
                      {conv.title || 'Sohbet'}
                    </Text>
                    <Text style={[styles.historyRowDate, { color: muted }]}>
                      {conv.createdAt ? new Date(conv.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>

    {showMsgActions && (
      <Modal
        visible={showMsgActions}
        transparent
        animationType="none"
        onRequestClose={closeMsgActions}
        statusBarTranslucent
      >
        <View style={styles.msgModalRoot}>
          <Animated.View style={[styles.msgOverlay, { opacity: overlayAnim }]}>
            <TouchableOpacity style={styles.msgOverlayTouch} onPress={closeMsgActions} activeOpacity={1} />
          </Animated.View>
          <Animated.View
            style={[
              styles.msgSheet,
              {
                transform: [{ translateY: slideAnim }],
                backgroundColor: surface,
                borderTopColor: colors.border,
                paddingBottom: Math.max(32, insets.bottom + 8),
              },
            ]}
          >
            <View style={[styles.msgSheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.msgSheetHeader}>
              <View style={styles.msgSheetIconWrap}>
                <Svg width={14} height={14} viewBox="0 0 40 40" fill="none">
                  <Line x1="13" y1="11" x2="27" y2="11" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
                  <Path
                    d="M27 11C27 11 13 11 13 20C13 29 27 29 27 29"
                    stroke={ACCENT}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Line x1="13" y1="29" x2="27" y2="29" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
                  <Circle cx="20" cy="20" r="2.5" fill={ACCENT} />
                </Svg>
              </View>
              <Text style={[styles.msgSheetTitle, { color: colors.text }]}>Söz Cevabı</Text>
            </View>
            <Text style={[styles.msgSheetPreview, { color: colors.textMuted }]} numberOfLines={3}>
              {selectedMsg}
            </Text>
            <View style={styles.msgSheetDivider} />
            <TouchableOpacity
              style={styles.msgSheetAction}
              onPress={() => {
                void Clipboard.setStringAsync(selectedMsg ?? '');
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                closeMsgActions();
              }}
              activeOpacity={0.75}
            >
              <View style={styles.msgSheetActionIcon}>
                <Ionicons name="copy-outline" size={18} color={ACCENT} />
              </View>
              <Text style={[styles.msgSheetActionText, { color: colors.text }]}>Kopyala</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.msgSheetAction}
              onPress={() => {
                void Share.share({ message: selectedMsg ?? '' });
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                closeMsgActions();
              }}
              activeOpacity={0.75}
            >
              <View style={styles.msgSheetActionIcon}>
                <Ionicons name="share-outline" size={18} color={ACCENT} />
              </View>
              <Text style={[styles.msgSheetActionText, { color: colors.text }]}>Paylaş</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.msgSheetAction}
              onPress={async () => {
                try {
                  const existing = await AsyncStorage.getItem(SAVED_ANSWERS_KEY);
                  const list = existing ? (JSON.parse(existing) as unknown[]) : [];
                  const arr = Array.isArray(list) ? list : [];
                  arr.unshift({
                    id: Date.now().toString(),
                    content: selectedMsg,
                    date: new Date().toISOString(),
                  });
                  await AsyncStorage.setItem(SAVED_ANSWERS_KEY, JSON.stringify(arr.slice(0, 50)));
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) {
                  console.warn('Save error:', e);
                }
                closeMsgActions();
              }}
              activeOpacity={0.75}
            >
              <View style={styles.msgSheetActionIcon}>
                <Ionicons name="bookmark-outline" size={18} color={ACCENT} />
              </View>
              <Text style={[styles.msgSheetActionText, { color: colors.text }]}>Kaydet</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.msgSheetCancel} onPress={closeMsgActions} activeOpacity={0.8}>
              <Text style={[styles.msgSheetCancelText, { color: colors.textMuted }]}>İptal</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    )}
    <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.regular,
    letterSpacing: -0.01,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  offlineBox: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  offlineText: { fontSize: 13 },
  offlineCacheBox: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    gap: 4,
  },
  offlineCacheTitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  offlineCacheText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 19,
  },
  quotaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: `${ACCENT}33`,
    gap: 12,
  },
  quotaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quotaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    letterSpacing: 0.02,
  },
  quotaTrack: {
    flex: 1,
    height: 3,
    backgroundColor: `${ACCENT}1F`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  quotaFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  verseLink: {
    color: ACCENT,
    textDecorationLine: 'underline',
    fontStyle: 'italic',
    fontFamily: fonts.regular,
  },
  historySheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  historyHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  historyClearBtn: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#E57373',
  },
  historyScroll: {
    maxHeight: 400,
  },
  historyEmpty: {
    fontFamily: fonts.italic,
    fontSize: 14,
    paddingVertical: 24,
    textAlign: 'center',
  },
  historyRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyRowTitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    marginBottom: 4,
  },
  historyRowDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 40,
    minHeight: 280,
  },
  emptyLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: `${ACCENT}14`,
    borderWidth: 0.5,
    borderColor: `${ACCENT}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: fonts.regular,
    letterSpacing: -0.02,
  },
  emptyDesc: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: fonts.italic ?? fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  quickWrap: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  quickText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    flex: 1,
    marginRight: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  bubbleRowAsst: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  asstLogo: {
    marginRight: 8,
    marginBottom: 22,
    width: 28,
    alignItems: 'center',
  },
  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bubbleUser: {
    maxWidth: '80%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleAsst: {
    maxWidth: '85%',
    flexShrink: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTime: {
    fontFamily: fonts.regular,
    fontSize: 10,
    marginTop: 8,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 36,
    marginBottom: 16,
    marginTop: 4,
  },
  quickChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  quickChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 8,
    marginLeft: 36,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginLeft: 36,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: `${ACCENT}20`,
  },
  retryBtnText: {
    color: ACCENT,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  recBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    alignItems: 'center',
  },
  inputWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: borderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
    maxHeight: 96,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: `${ACCENT}40`,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  msgModalRoot: {
    flex: 1,
  },
  msgOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  msgOverlayTouch: {
    flex: 1,
  },
  msgSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0.5,
  },
  msgSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  msgSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  msgSheetIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${ACCENT}1A`,
    borderWidth: 0.5,
    borderColor: `${ACCENT}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgSheetTitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    letterSpacing: -0.01,
  },
  msgSheetPreview: {
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: fonts.italic,
    lineHeight: 20,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  msgSheetDivider: {
    height: 0.5,
    backgroundColor: `${ACCENT}1F`,
    marginHorizontal: 0,
    marginBottom: 4,
  },
  msgSheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: `${ACCENT}12`,
  },
  msgSheetActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${ACCENT}14`,
    borderWidth: 0.5,
    borderColor: `${ACCENT}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgSheetActionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  msgSheetCancel: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: `${ACCENT}0F`,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: `${ACCENT}26`,
    alignItems: 'center',
  },
  msgSheetCancelText: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
});

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/theme';
import {
  getVerseTextByVerseId,
  getVerseRefFromVerseId,
} from '@/constants/bible-index';
import { parseFavoritesRaw } from '@/hooks/useFavorites';
import { useSafeBack } from '@/hooks/useSafeBack';

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_PROGRESS = '@soz/memorizeProgress';
const STORAGE_FAVORITES = '@soz/favorites';
const ACCENT = '#C4956A';
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#C4956A', '#E8B87A', '#D4A574', '#F0C080', '#B8845A',
  '#C4956A88', '#E8D0A0', '#A07040', '#D4B090', '#C89060',
];

const SUGGESTIONS = [
  { book: 'Yuhanna', chapter: 3, verse: 16 },
  { book: 'Yuhanna', chapter: 1, verse: 1 },
  { book: 'Matta', chapter: 6, verse: 9 },
  { book: 'Romalılar', chapter: 8, verse: 28 },
  { book: 'Filipililere', chapter: 4, verse: 13 },
  { book: 'Romalılar', chapter: 12, verse: 2 },
  { book: 'İbraniler', chapter: 11, verse: 1 },
  { book: 'Yuhanna', chapter: 14, verse: 6 },
  { book: 'Galatyalılar', chapter: 5, verse: 22 },
  { book: 'Matta', chapter: 5, verse: 3 },
  { book: '1. Korintliler', chapter: 13, verse: 4 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type MemorizeVerse = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  addedAt: string;
  level: number;
  nextReview: string;
  streak: number;
  lastPracticed: string | null;
};

type AppView = 'list' | 'practice' | 'result' | 'add';
type PracticeStage = 'see' | 'fill' | 'type' | 'heart' | 'speech';
type WordStatus = 'correct' | 'close' | 'wrong';
type AddTab = 'suggestions' | 'favorites' | 'manual';

// ─── Utilities ────────────────────────────────────────────────────────────────
function makeId(book: string, chapter: number, verse: number) {
  return `${book}-${chapter}-${verse}`;
}

function computeNextReview(level: number): string {
  const days = REVIEW_INTERVALS[Math.min(level, 4)] ?? 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function isDueToday(verse: MemorizeVerse): boolean {
  return new Date(verse.nextReview) <= new Date();
}

function normalizeText(t: string): string {
  return t
    .toLowerCase()
    .replace(/[.,;:!?"'"'—–\-«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function compareWords(
  expected: string,
  actual: string
): { accuracy: number; words: Array<{ word: string; status: WordStatus }> } {
  const expWords = normalizeText(expected).split(' ').filter(Boolean);
  const actWords = normalizeText(actual).split(' ').filter(Boolean);
  let score = 0;
  const words = expWords.map((ew, i) => {
    const aw = actWords[i] ?? '';
    if (ew === aw) {
      score += 1;
      return { word: ew, status: 'correct' as WordStatus };
    }
    if (aw && (ew.includes(aw) || aw.includes(ew) || levenshtein(ew, aw) <= 2)) {
      score += 0.5;
      return { word: ew, status: 'close' as WordStatus };
    }
    return { word: ew, status: 'wrong' as WordStatus };
  });
  return { accuracy: expWords.length > 0 ? score / expWords.length : 0, words };
}

const DECOY_WORDS = [
  'sevgi', 'iman', 'umut', 'ışık', 'barış', 'dua', 'ruh', 'yol',
  'güç', 'söz', 'halk', 'can', 'taş', 'su', 'ekmek', 'dağ',
  'gece', 'gün', 'göz', 'kalp', 'el', 'ses', 'kol', 'yüz',
  'merhamet', 'sevinç', 'kurtuluş', 'bereket', 'şükür', 'huzur',
];

function normalizeWord(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?'"»«]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

type FillPuzzle = {
  words: string[];
  blanks: Array<{ index: number; answer: string }>;
  blankIndices: Set<number>;
  options: string[];
  filled: Record<number, string>;
};

function createFillBlankPuzzle(text: string): FillPuzzle {
  const allWords = text.split(' ').filter(Boolean);

  if (allWords.length < 4) {
    const targetIdx = Math.floor(allWords.length / 2);
    const answer = allWords[targetIdx].replace(/[.,;:!?'"»«]/g, '');
    const decoys = DECOY_WORDS.filter(d => d !== answer)
      .sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [answer, ...decoys].sort(() => Math.random() - 0.5);
    return {
      words: allWords,
      blanks: [{ index: targetIdx, answer }],
      blankIndices: new Set([targetIdx]),
      options,
      filled: {},
    };
  }

  const eligible = allWords
    .map((w, i) => ({ w, i }))
    .filter(({ w, i }) =>
      i > 0 &&
      i < allWords.length - 1 &&
      w.replace(/[.,;:!?'"»«]/g, '').length >= 3
    );

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const blankCount = Math.min(Math.max(2, Math.floor(allWords.length / 4)), 4);
  let selected = shuffled.slice(0, Math.max(blankCount, 1)).sort((a, b) => a.i - b.i);

  if (selected.length === 0) {
    selected = [eligible[0] ?? { w: allWords[1], i: 1 }];
  }

  const blanks = selected.map(({ w, i }) => ({
    index: i,
    answer: w.replace(/[.,;:!?'"»«]/g, ''),
  }));
  const blankIndicesSet = new Set(blanks.map(b => b.index));
  const correctAnswers = blanks.map(b => b.answer);

  const decoyCount = Math.max(4 - correctAnswers.length, 2);
  const decoys = DECOY_WORDS
    .filter(d => !correctAnswers.some(a => normalizeWord(a) === normalizeWord(d)))
    .sort(() => Math.random() - 0.5)
    .slice(0, decoyCount + 2);

  let allOptions = [...correctAnswers, ...decoys]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  // Doğru cevapların seçeneklerde olduğunu garantile
  correctAnswers.forEach(ans => {
    if (!allOptions.includes(ans)) {
      allOptions[allOptions.length - 1] = ans;
    }
  });
  allOptions = allOptions.sort(() => Math.random() - 0.5);

  return {
    words: allWords,
    blanks,
    blankIndices: blankIndicesSet,
    options: allOptions,
    filled: {},
  };
}

function getPracticeStages(level: number): PracticeStage[] {
  if (level === 0) return ['see', 'fill'];
  if (level === 1) return ['see', 'fill', 'type'];
  if (level === 2) return ['see', 'type', 'heart'];
  return ['see', 'heart', 'speech'];
}

const STAGE_LABELS: Record<PracticeStage, string> = {
  see: 'Gör & Öğren',
  fill: 'Boşluk Doldur',
  type: 'Serbest Yaz',
  heart: 'Kalbinden Yaz',
  speech: 'Dinle & Yaz',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function LevelIndicator({ level }: { level: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < level ? ACCENT : 'rgba(196,149,80,0.2)',
          }}
        />
      ))}
    </View>
  );
}

function CountdownCircle({
  seconds,
  total,
}: {
  seconds: number;
  total: number;
}) {
  const size = 80;
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, seconds) / total);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(196,149,80,0.15)" strokeWidth="3" fill="none"
        />
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={ACCENT} strokeWidth="3" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 22, color: ACCENT, fontFamily: fonts.regular }}>
        {Math.max(0, seconds)}
      </Text>
    </View>
  );
}

// ─── makeStyles ───────────────────────────────────────────────────────────────
const makeStyles = (colors: {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}) =>
  StyleSheet.create({
    safe: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
    },
    backBtn: { width: 36, alignItems: 'flex-start' },
    addBtn: { width: 36, alignItems: 'flex-end' },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 28,
      fontFamily: fonts.thin,
      letterSpacing: -0.5,
    },

    // List view
    scroll: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 40 },

    // Stats grid
    statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: {
      flex: 1,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.15)',
    },
    statNum: { fontSize: 28, color: ACCENT, fontFamily: fonts.thin, marginBottom: 2 },
    statLabel: { fontSize: 11, fontFamily: fonts.regular, textAlign: 'center' },

    // Section headers
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionLabel: { fontSize: 11, letterSpacing: 0.2, color: ACCENT, fontFamily: fonts.medium },
    dueBadge: {
      backgroundColor: ACCENT,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    dueBadgeText: { fontSize: 11, color: '#0A0A08', fontFamily: fonts.medium },
    groupLabel: {
      fontSize: 10,
      letterSpacing: 1.5,
      color: 'rgba(196,149,80,0.6)',
      fontFamily: fonts.medium,
      marginTop: 20,
      marginBottom: 10,
    },

    // Due today card
    dueCard: {
      flexDirection: 'row',
      backgroundColor: 'rgba(196,149,80,0.06)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.35)',
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    },
    dueCardBorder: { width: 3, backgroundColor: ACCENT },
    dueCardContent: { flex: 1, padding: 14 },
    dueCardRef: { fontSize: 11, color: ACCENT, fontFamily: fonts.medium, marginBottom: 6 },
    dueCardText: { fontSize: 14, fontStyle: 'italic', fontFamily: fonts.italic, lineHeight: 20, marginBottom: 10 },
    dueCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    practiceBtn: { fontSize: 13, color: ACCENT, fontFamily: fonts.regular },

    // Verse list item
    verseListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 10,
      borderWidth: 0.5,
      marginBottom: 8,
    },
    verseListItemInfo: { flex: 1 },
    verseListRef: { fontSize: 11, color: ACCENT, fontFamily: fonts.medium, marginBottom: 3 },
    verseListText: { fontSize: 13, fontStyle: 'italic', fontFamily: fonts.italic },

    // Empty state
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
    emptyIconCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: 'rgba(196,149,80,0.08)',
      borderWidth: 0.5, borderColor: 'rgba(196,149,80,0.15)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontFamily: fonts.regular, marginBottom: 8, textAlign: 'center' },
    emptyDesc: { fontSize: 13, fontStyle: 'italic', fontFamily: fonts.italic, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: ACCENT,
    },
    emptyBtnText: { fontSize: 14, color: ACCENT, fontFamily: fonts.regular },

    // Practice header
    practiceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
    },
    practiceHeaderCenter: { flex: 1, alignItems: 'center' },
    practiceStageLabel: { fontSize: 15, fontFamily: fonts.medium },
    practiceStepCount: { fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
    practiceProgressBg: { height: 2, backgroundColor: 'rgba(196,149,80,0.12)' },
    practiceProgressFill: { height: 2, backgroundColor: ACCENT },

    // Practice content
    practiceContent: { padding: 24, paddingBottom: 40 },

    // See stage
    seeCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 28,
      marginBottom: 28,
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.15)',
    },
    seeCardLabel: {
      fontSize: 10, letterSpacing: 1.5, color: 'rgba(196,149,80,0.6)',
      fontFamily: fonts.medium, marginBottom: 16,
    },
    seeQuote: {
      fontSize: 56, color: ACCENT, opacity: 0.25, fontFamily: fonts.regular,
      lineHeight: 40, marginBottom: 8, textAlign: 'center',
    },
    seeVerseText: {
      fontSize: 20, fontStyle: 'italic', fontFamily: fonts.italic,
      lineHeight: 32, textAlign: 'center', marginBottom: 20,
    },
    seeVerseRef: { fontSize: 14, color: ACCENT, fontFamily: fonts.regular, textAlign: 'center' },
    countdownWrap: { alignItems: 'center', marginBottom: 28 },

    // Fill stage
    stageHint: { fontSize: 13, color: 'rgba(196,149,80,0.7)', fontFamily: fonts.regular, marginBottom: 16, textAlign: 'center' },
    fillEmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    fillEmptyText: { fontSize: 14, fontFamily: fonts.regular },
    fillProgress: { fontSize: 12, fontFamily: fonts.regular, textAlign: 'center', marginBottom: 16, marginTop: -8 },
    verseWordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center', padding: 20, marginBottom: 8 },
    wordText: { fontSize: 17, fontStyle: 'italic', fontFamily: fonts.italic, lineHeight: 28 },
    filledBlank: {
      flexDirection: 'row', alignItems: 'center', borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 3, marginHorizontal: 2,
    },
    filledBlankCorrect: { backgroundColor: 'rgba(124,184,124,0.15)', borderWidth: 1, borderColor: 'rgba(124,184,124,0.4)' },
    filledBlankWrong: { backgroundColor: 'rgba(220,112,112,0.15)', borderWidth: 1, borderColor: 'rgba(220,112,112,0.4)' },
    filledBlankText: { fontSize: 15, fontFamily: fonts.medium },
    emptyBlank: {
      borderBottomWidth: 1.5, borderBottomColor: 'rgba(196,149,80,0.3)',
      paddingHorizontal: 8, paddingVertical: 3, marginHorizontal: 2, minWidth: 40, alignItems: 'center',
    },
    emptyBlankActive: { borderBottomColor: ACCENT, borderBottomWidth: 2 },
    emptyBlankText: { fontSize: 14, color: 'rgba(196,149,80,0.5)', letterSpacing: 3 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, justifyContent: 'center' },
    optionChip: {
      paddingHorizontal: 18, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1, alignItems: 'center',
    },
    optionChipUsed: { opacity: 0.35 },
    optionChipDisabled: { opacity: 0.25 },
    optionChipText: { fontSize: 15, fontStyle: 'italic', fontFamily: fonts.italic },

    // Type/Heart/Speech
    refPill: {
      alignSelf: 'center', borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20,
    },
    refPillText: { fontSize: 15, color: ACCENT, fontFamily: fonts.medium },
    typeInput: {
      borderWidth: 1, borderRadius: 12, padding: 16,
      fontSize: 17, fontStyle: 'italic', fontFamily: fonts.italic,
      minHeight: 150, textAlignVertical: 'top', lineHeight: 26,
    },
    speakBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      alignSelf: 'center', padding: 16, marginBottom: 20,
      backgroundColor: 'rgba(196,149,80,0.08)',
      borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(196,149,80,0.25)',
    },
    speakBtnText: { fontSize: 15, color: ACCENT, fontFamily: fonts.regular },

    // Check result
    resultBlock: { alignItems: 'center', marginVertical: 20 },
    accuracyBig: { fontSize: 52, color: ACCENT, fontFamily: fonts.thin },
    accuracyLabel: { fontSize: 15, fontFamily: fonts.italic, marginTop: 4 },
    comparisonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 20 },
    compWord: { fontSize: 15, fontFamily: fonts.regular, lineHeight: 24 },
    compCorrect: { color: '#2E7D32' },
    compClose: { color: '#E65100' },
    compWrong: { color: '#C62828', textDecorationLine: 'line-through' },

    // Primary button
    primaryBtn: {
      backgroundColor: ACCENT, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center', marginTop: 12,
    },
    primaryBtnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 0.5, borderColor: ACCENT,
    },
    primaryBtnText: {
      fontSize: 16, color: '#0A0A08', fontFamily: fonts.medium,
    },

    // Result screen
    confettiContainer: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
    },
    confettiParticle: { width: 8, height: 8, borderRadius: 4 },
    resultContent: { padding: 32, paddingTop: 60, alignItems: 'center' },
    checkmarkCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: 'rgba(196,149,80,0.12)',
      borderWidth: 0.5, borderColor: 'rgba(196,149,80,0.3)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    resultTitle: { fontSize: 32, fontFamily: fonts.thin, letterSpacing: -0.5, marginBottom: 28 },
    resultStats: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
    resultStatCard: {
      flex: 1, borderRadius: 12, padding: 14,
      alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(196,149,80,0.15)',
    },
    resultStatNum: { fontSize: 24, color: ACCENT, fontFamily: fonts.thin, marginBottom: 2 },
    resultStatLabel: { fontSize: 11, fontFamily: fonts.regular, textAlign: 'center' },
    nextReviewCard: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 14, borderRadius: 12, borderWidth: 0.5,
      marginBottom: 32, width: '100%',
    },
    nextReviewText: { fontSize: 13, fontFamily: fonts.regular, flex: 1 },
    resultBtns: { width: '100%', gap: 10 },

    // Add modal
    addTabBar: {
      flexDirection: 'row', borderBottomWidth: 0.5,
    },
    addTab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
    addTabActive: {},
    addTabText: { fontSize: 13, fontFamily: fonts.regular },
    addTabIndicator: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 2, backgroundColor: ACCENT,
    },
    feedbackBanner: {
      backgroundColor: 'rgba(196,149,80,0.1)',
      borderBottomWidth: 0.5, borderColor: 'rgba(196,149,80,0.3)',
      padding: 10, alignItems: 'center',
    },
    feedbackText: { fontSize: 13, color: ACCENT, fontFamily: fonts.regular },
    addVerseCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 10, borderWidth: 0.5, marginBottom: 8,
    },
    addVerseCardInfo: { flex: 1 },
    addVerseRef: { fontSize: 11, color: ACCENT, fontFamily: fonts.medium, marginBottom: 4 },
    addVerseText: { fontSize: 13, fontStyle: 'italic', fontFamily: fonts.italic, lineHeight: 18 },
    addedBadge: {
      paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(196,149,80,0.3)',
      backgroundColor: 'rgba(196,149,80,0.06)',
    },
    addedBadgeText: { fontSize: 11, color: ACCENT, fontFamily: fonts.regular },
    manualForm: { gap: 4 },
    manualLabel: { fontSize: 12, fontFamily: fonts.regular, marginTop: 12, marginBottom: 4 },
    manualInput: {
      borderWidth: 1, borderRadius: 10, padding: 12,
      fontSize: 15, fontFamily: fonts.regular,
    },
  });

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MemorizeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const safeBack = useSafeBack();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // App-level state
  const [view, setView] = useState<AppView>('list');
  const [progress, setProgress] = useState<Record<string, MemorizeVerse>>({});
  const [loading, setLoading] = useState(true);

  // Practice state
  const [practiceVerse, setPracticeVerse] = useState<MemorizeVerse | null>(null);
  const [stages, setStages] = useState<PracticeStage[]>([]);
  const [stageIdx, setStageIdx] = useState(0);
  const currentStage = stages[stageIdx] as PracticeStage | undefined;

  // See stage
  const [countdown, setCountdown] = useState(10);

  // Fill stage — legacy state (reset için tutuldu)
  const [blankIdx, setBlankIdx] = useState(0);
  const [fillAnswers, setFillAnswers] = useState<Record<number, { answer: string; correct: boolean } | null>>({});
  const [fillOptions, setFillOptions] = useState<string[]>([]);
  const [fillPending, setFillPending] = useState(false);

  // Fill stage — yeni puzzle state
  const [puzzle, setPuzzle] = useState<FillPuzzle | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [completedBlanks, setCompletedBlanks] = useState<Set<number>>(new Set());
  const shakeAnims = useRef<Record<string, Animated.Value>>({});

  // Type/Heart/Speech stage
  const [typedText, setTypedText] = useState('');
  const [checkResult, setCheckResult] = useState<{
    accuracy: number;
    words: Array<{ word: string; status: WordStatus }>;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Result state
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [practiceStartTime, setPracticeStartTime] = useState(0);
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(Math.random()),
      y: new Animated.Value(-50),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  // Add tab state
  const [addTab, setAddTab] = useState<AddTab>('suggestions');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [manualBook, setManualBook] = useState('');
  const [manualChapter, setManualChapter] = useState('');
  const [manualVerse, setManualVerse] = useState('');
  const [addFeedback, setAddFeedback] = useState('');

  // ── Derived values
  const allVerses = useMemo(() => Object.values(progress), [progress]);
  const dueToday = useMemo(() => allVerses.filter(isDueToday), [allVerses]);
  const learning = useMemo(() => allVerses.filter(v => v.level < 3), [allVerses]);
  const almostDone = useMemo(() => allVerses.filter(v => v.level === 3), [allVerses]);
  const memorized = useMemo(() => allVerses.filter(v => v.level === 4), [allVerses]);

  const words = useMemo(
    () => (practiceVerse ? practiceVerse.text.split(' ').filter(Boolean) : []),
    [practiceVerse]
  );

  const getBlankIndices = useCallback(
    (w: string[], count: number): number[] => {
      if (!w || w.length < 4) return [];

      const eligible = w
        .map((word, i) => ({ word, i }))
        .filter(({ word }) => word.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '').length > 2);

      if (eligible.length === 0) return [];

      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      const selected = shuffled
        .slice(0, Math.min(count, eligible.length))
        .map(({ i }) => i);

      return selected.sort((a, b) => a - b);
    },
    []
  );

  const blankIndices = useMemo(() => {
    if (!practiceVerse?.text) return [];
    const w = practiceVerse.text.split(' ').filter(Boolean);
    const count = Math.max(1, Math.floor(w.length * 0.3));
    return getBlankIndices(w, count);
  }, [practiceVerse, getBlankIndices]);
  const currentBlankWordIdx = blankIndices[blankIdx] ?? -1;

  // ── Load data
  const loadProgress = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PROGRESS);
      const prog: Record<string, MemorizeVerse> = raw ? JSON.parse(raw) : {};

      // Migrate from old memorize-storage format
      const oldRaw = await AsyncStorage.getItem('@soz/memorizeList');
      if (oldRaw) {
        const old: Array<{ verseId: string; ref: string; text: string }> = JSON.parse(oldRaw);
        let changed = false;
        for (const item of old) {
          if (!prog[item.verseId]) {
            const parts = item.verseId.split('-');
            const verse = parseInt(parts[parts.length - 1], 10);
            const chapter = parseInt(parts[parts.length - 2], 10);
            const book = parts.slice(0, -2).join('-');
            if (!isNaN(verse) && !isNaN(chapter)) {
              prog[item.verseId] = {
                id: item.verseId,
                book, chapter, verse,
                text: item.text,
                addedAt: new Date().toISOString(),
                level: 0,
                nextReview: new Date().toISOString(),
                streak: 0,
                lastPracticed: null,
              };
              changed = true;
            }
          }
        }
        if (changed) await AsyncStorage.setItem(STORAGE_PROGRESS, JSON.stringify(prog));
      }

      setProgress(prog);
    } catch {
      setProgress({});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProgress(); }, [loadProgress]));

  // ── Fill puzzle oluştur (fill aşaması başladığında)
  useEffect(() => {
    if (view === 'practice' && currentStage === 'fill' && practiceVerse) {
      const p = createFillBlankPuzzle(practiceVerse.text);
      setPuzzle(p);
      setCorrectCount(0);
      setWrongCount(0);
      setRevealedAnswers(new Set());
      setCompletedBlanks(new Set());
      shakeAnims.current = {};
    }
  }, [view, currentStage, practiceVerse]);

  // ── Countdown for see stage
  useEffect(() => {
    if (view !== 'practice' || currentStage !== 'see' || countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [view, currentStage, countdown]);

  // ── Auto-speak for speech stage
  useEffect(() => {
    if (view === 'practice' && currentStage === 'speech' && practiceVerse) {
      const t = setTimeout(() => handleSpeak(), 500);
      return () => clearTimeout(t);
    }
  }, [view, currentStage]);

  // ── Confetti animation
  const startConfetti = useCallback(() => {
    confettiAnims.forEach((anim, i) => {
      anim.x.setValue(Math.random());
      anim.y.setValue(-50);
      anim.opacity.setValue(1);
      anim.rotate.setValue(0);
      Animated.parallel([
        Animated.timing(anim.y, {
          toValue: 900, duration: 2000 + Math.random() * 800,
          delay: i * 70, useNativeDriver: false,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0, duration: 2500,
          delay: i * 70 + 1200, useNativeDriver: false,
        }),
        Animated.timing(anim.rotate, {
          toValue: Math.random() > 0.5 ? 360 : -360,
          duration: 2000, delay: i * 70, useNativeDriver: false,
        }),
      ]).start();
    });
    checkmarkScale.setValue(0);
    Animated.spring(checkmarkScale, {
      toValue: 1, tension: 60, friction: 7, useNativeDriver: false,
    }).start();
  }, [confettiAnims, checkmarkScale]);

  // ── Start practice
  const startPractice = useCallback((verse: MemorizeVerse) => {
    setPracticeVerse(verse);
    const s = getPracticeStages(verse.level);
    setStages(s);
    setStageIdx(0);
    setCountdown(10);
    setFillAnswers({});
    setBlankIdx(0);
    setFillPending(false);
    setTypedText('');
    setCheckResult(null);
    setFinalAccuracy(0);
    setIsSpeaking(false);
    setPracticeStartTime(Date.now());
    // Yeni puzzle state sıfırla
    setPuzzle(null);
    setCorrectCount(0);
    setWrongCount(0);
    setRevealedAnswers(new Set());
    setCompletedBlanks(new Set());
    shakeAnims.current = {};
    setView('practice');
  }, []);

  // ── Next stage
  const advanceStage = useCallback(
    (accuracy = 1) => {
      setFinalAccuracy(accuracy);
      if (stageIdx < stages.length - 1) {
        setStageIdx(i => i + 1);
      setTypedText('');
        setCheckResult(null);
        setFillAnswers({});
        setBlankIdx(0);
        setFillPending(false);
        setPuzzle(null);
        setCorrectCount(0);
        setWrongCount(0);
        setRevealedAnswers(new Set());
        setCompletedBlanks(new Set());
        shakeAnims.current = {};
      } else {
        // End of practice
        const isCorrect = accuracy >= 0.8;
        if (practiceVerse) {
          const updated = { ...practiceVerse };
          if (isCorrect) {
            updated.level = Math.min(updated.level + 1, 4);
            updated.streak += 1;
          } else if (accuracy < 0.6) {
            updated.level = Math.max(updated.level - 1, 0);
            updated.streak = 0;
          }
          updated.nextReview = computeNextReview(updated.level);
          updated.lastPracticed = new Date().toISOString();
          const next = { ...progress, [updated.id]: updated };
          setProgress(next);
          AsyncStorage.setItem(STORAGE_PROGRESS, JSON.stringify(next)).catch(() => {});
        }
        setFinalAccuracy(accuracy);
        setView('result');
        startConfetti();
      }
    },
    [stageIdx, stages.length, practiceVerse, progress, startConfetti]
  );

  // ── Shake animasyonu
  const shakeOption = useCallback((option: string) => {
    if (!shakeAnims.current[option]) {
      shakeAnims.current[option] = new Animated.Value(0);
    }
    const anim = shakeAnims.current[option];
    Animated.sequence([
      Animated.timing(anim, { toValue: 8, duration: 60, useNativeDriver: false }),
      Animated.timing(anim, { toValue: -8, duration: 60, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 6, duration: 50, useNativeDriver: false }),
      Animated.timing(anim, { toValue: -6, duration: 50, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0, duration: 40, useNativeDriver: false }),
    ]).start();
  }, []);

  // ── Yeni fill answer handler
  const handleOptionSelect = useCallback(
    (option: string) => {
      if (!puzzle) return;

      // İlk doldurulmamış boşluğu bul
      const nextBlank = puzzle.blanks.find(
        b => !completedBlanks.has(b.index) && !revealedAnswers.has(b.index)
      );
      if (!nextBlank) return;

      const isCorrect = normalizeWord(option) === normalizeWord(nextBlank.answer);

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newFilled = { ...puzzle.filled, [nextBlank.index]: option };
        setPuzzle(prev => prev ? { ...prev, filled: newFilled } : prev);

        const newCompleted = new Set([...completedBlanks, nextBlank.index]);
        setCompletedBlanks(newCompleted);
        setCorrectCount(c => c + 1);

        if (newCompleted.size >= puzzle.blanks.length) {
          const total = puzzle.blanks.length;
          const correct = correctCount + 1;
          const accuracy = total > 0 ? correct / total : 0;
          setTimeout(() => advanceStage(accuracy), 600);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setWrongCount(w => w + 1);
        shakeOption(option);

        // 1.5 saniye sonra doğru cevabı göster ve geç
        setTimeout(() => {
          const wrongFilled = { ...puzzle.filled, [nextBlank.index]: `WRONG:${nextBlank.answer}` };
          setPuzzle(prev => prev ? { ...prev, filled: wrongFilled } : prev);

          const newRevealed = new Set([...revealedAnswers, nextBlank.index]);
          const newCompleted = new Set([...completedBlanks, nextBlank.index]);
          setRevealedAnswers(newRevealed);
          setCompletedBlanks(newCompleted);

          if (newCompleted.size >= puzzle.blanks.length) {
            const total = puzzle.blanks.length;
            const accuracy = total > 0 ? correctCount / total : 0;
            setTimeout(() => advanceStage(accuracy), 1000);
          }
        }, 1500);
      }
    },
    [puzzle, completedBlanks, revealedAnswers, correctCount, shakeOption, advanceStage]
  );

  // ── Text check handler
  const handleCheck = useCallback(() => {
    if (!practiceVerse || !typedText.trim()) return;
    const result = compareWords(practiceVerse.text, typedText);
    setCheckResult(result);
    if (result.accuracy >= 0.8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [practiceVerse, typedText]);

  // ── Speech
  const handleSpeak = useCallback(() => {
    if (!practiceVerse) return;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(practiceVerse.text, {
      language: 'tr-TR',
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [practiceVerse]);

  // ── Add verse
  const addVerse = useCallback(
    async (book: string, chapter: number, verse: number, text: string) => {
      const id = makeId(book, chapter, verse);
      if (progress[id]) {
        setAddFeedback('Bu ayet zaten listede.');
      return;
    }
      const entry: MemorizeVerse = {
        id, book, chapter, verse, text,
        addedAt: new Date().toISOString(),
        level: 0,
        nextReview: new Date().toISOString(),
        streak: 0,
        lastPracticed: null,
      };
      const next = { ...progress, [id]: entry };
      setProgress(next);
      try {
        await AsyncStorage.setItem(STORAGE_PROGRESS, JSON.stringify(next));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAddFeedback('Eklendi ✓');
        setTimeout(() => setAddFeedback(''), 2000);
      } catch {
        setAddFeedback('Hata oluştu.');
      }
    },
    [progress]
  );

  // ── Open add modal
  const openAdd = useCallback(async () => {
    setAddTab('suggestions');
    setAddFeedback('');
    setManualBook('');
    setManualChapter('');
    setManualVerse('');
    try {
      const raw = await AsyncStorage.getItem(STORAGE_FAVORITES);
      const items = parseFavoritesRaw(raw);
      setFavorites(items.map((i) => i.id));
    } catch {
      setFavorites([]);
    }
    setView('add');
  }, []);

  // ════════════════════════════════════════
  // RENDERS
  // ════════════════════════════════════════

  // ── List item
  const renderVerseItem = (verse: MemorizeVerse) => (
    <TouchableOpacity
      key={verse.id}
      style={[styles.verseListItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => startPractice(verse)}
      activeOpacity={0.8}
    >
      <LevelIndicator level={verse.level} />
      <View style={styles.verseListItemInfo}>
        <Text style={styles.verseListRef}>
          {verse.book} {verse.chapter}:{verse.verse}
        </Text>
        <Text style={[styles.verseListText, { color: colors.textMuted }]} numberOfLines={1}>
          {verse.text.length > 55 ? verse.text.slice(0, 55) + '…' : verse.text}
        </Text>
        </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );

  // ── List view
  const renderList = () => (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: 'rgba(196,149,80,0.12)' }]}>
        <TouchableOpacity onPress={() => safeBack()} style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ezberleme</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add" size={24} color={ACCENT} />
        </TouchableOpacity>
        </View>

      {allVerses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="book-outline" size={40} color="rgba(196,149,80,0.4)" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz ayet eklemediniz</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Favorilerden veya okurken + ile ekleyin
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
            <Text style={styles.emptyBtnText}>İlk Ayetini Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.statNum}>{learning.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Öğreniliyor</Text>
        </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.statNum}>{almostDone.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Neredeyse</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.statNum}>{memorized.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ezberledim</Text>
            </View>
          </View>

          {/* Due today */}
          {dueToday.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>BUGÜN TEKRARİ GEREKEN</Text>
                <View style={styles.dueBadge}>
                  <Text style={styles.dueBadgeText}>{dueToday.length}</Text>
                </View>
              </View>
              {dueToday.map(verse => (
                <TouchableOpacity
                  key={verse.id}
                  style={styles.dueCard}
                  onPress={() => startPractice(verse)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dueCardBorder} />
                  <View style={styles.dueCardContent}>
                    <Text style={styles.dueCardRef}>
                      {verse.book} {verse.chapter}:{verse.verse}
                    </Text>
                    <Text style={[styles.dueCardText, { color: colors.text }]} numberOfLines={2}>
                      {verse.text.length > 80 ? verse.text.slice(0, 80) + '…' : verse.text}
                    </Text>
                    <View style={styles.dueCardBottom}>
                      <LevelIndicator level={verse.level} />
                      <Text style={styles.practiceBtn}>Tekrar Et →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Groups */}
          {learning.length > 0 && (
            <>
              <Text style={styles.groupLabel}>ÖĞRENİLİYOR</Text>
              {learning.map(renderVerseItem)}
            </>
          )}
          {almostDone.length > 0 && (
            <>
              <Text style={styles.groupLabel}>NEREDEYSE BİTTİ</Text>
              {almostDone.map(renderVerseItem)}
            </>
          )}
          {memorized.length > 0 && (
            <>
              <Text style={styles.groupLabel}>EZBERLENDİ ✓</Text>
              {memorized.map(renderVerseItem)}
            </>
          )}
        </ScrollView>
      )}
      </SafeAreaView>
    );

  // ── See stage
  const renderSee = () => (
    <ScrollView contentContainerStyle={styles.practiceContent} showsVerticalScrollIndicator={false}>
      <View style={styles.seeCard}>
        <Text style={styles.seeCardLabel}>GÖR VE ÖĞREN</Text>
        <Text style={styles.seeQuote}>"</Text>
        <Text style={[styles.seeVerseText, { color: colors.text }]}>{practiceVerse?.text}</Text>
        <Text style={styles.seeVerseRef}>
          {practiceVerse?.book} {practiceVerse?.chapter}:{practiceVerse?.verse}
        </Text>
        </View>
      <View style={styles.countdownWrap}>
        <CountdownCircle seconds={countdown} total={10} />
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, countdown > 0 && styles.primaryBtnOutline]}
        onPress={() => advanceStage(1)}
      >
        <Text style={[styles.primaryBtnText, countdown > 0 && { color: ACCENT }]}>
          Hazırım →
              </Text>
      </TouchableOpacity>
        </ScrollView>
  );

  // ── Fill stage
  const renderFill = () => {
    // Null guard
    if (!practiceVerse) {
      return (
        <View style={styles.fillEmptyState}>
          <Ionicons name="school-outline" size={40} color="rgba(196,149,80,0.3)" />
          <Text style={[styles.fillEmptyText, { color: colors.textMuted }]}>Ayet yükleniyor...</Text>
        </View>
      );
    }
    if (!puzzle) {
      return (
        <View style={styles.fillEmptyState}>
          <ActivityIndicator color={ACCENT} size="small" />
        </View>
      );
    }
    if (puzzle.blanks.length === 0 || puzzle.options.length === 0) {
      return (
        <View style={styles.fillEmptyState}>
          <Text style={[styles.fillEmptyText, { color: colors.textMuted }]}>Hazırlanıyor...</Text>
        </View>
      );
    }

    const allDone = completedBlanks.size >= puzzle.blanks.length;
    const activeBlankIdx = puzzle.blanks.find(
      b => !completedBlanks.has(b.index) && !revealedAnswers.has(b.index)
    )?.index;

    return (
      <ScrollView contentContainerStyle={styles.practiceContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stageHint, { color: colors.textMuted }]}>Boş yerleri sırayla doldurun</Text>

        {/* Ayet kelime görünümü */}
        <View style={styles.verseWordWrap}>
          {puzzle.words.map((word, i) => {
            if (!puzzle.blankIndices.has(i)) {
              return (
                <Text key={i} style={[styles.wordText, { color: colors.text }]}>{word} </Text>
              );
            }

            const filledValue = puzzle.filled[i];
            const isCompleted = completedBlanks.has(i);

            if (isCompleted && filledValue) {
              const isWrong = filledValue.startsWith('WRONG:');
              const displayValue = isWrong ? filledValue.replace('WRONG:', '') : filledValue;
              return (
                <View key={i} style={[styles.filledBlank, isWrong ? styles.filledBlankWrong : styles.filledBlankCorrect]}>
                  <Ionicons
                    name={isWrong ? 'close-circle' : 'checkmark-circle'}
                    size={12}
                    color={isWrong ? '#E07070' : '#7CB87C'}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.filledBlankText, { color: isWrong ? '#E07070' : '#7CB87C' }]}>
                    {displayValue}
                  </Text>
      </View>
              );
            }

            const blankInfo = puzzle.blanks.find(b => b.index === i);
            const isActive = activeBlankIdx === i;
            return (
              <View key={i} style={[styles.emptyBlank, isActive && styles.emptyBlankActive]}>
                <Text style={[styles.emptyBlankText, { color: colors.textMuted }]}>
                  {'_'.repeat(Math.min(blankInfo?.answer.length ?? 5, 8))}
                </Text>
              </View>
            );
          })}
        </View>

        {/* İlerleme */}
        <Text style={[styles.fillProgress, { color: colors.textMuted }]}>
          {completedBlanks.size} / {puzzle.blanks.length} dolduruldu
        </Text>

        {/* Seçenek butonları */}
        <View style={styles.optionsGrid}>
          {puzzle.options.map((opt, i) => {
            const usedCorrectly = Object.values(puzzle.filled).includes(opt);
            const isUsed = usedCorrectly;
            const isDisabled = allDone;
            const shakeX = shakeAnims.current[opt] ?? new Animated.Value(0);

            return (
              <Animated.View key={`${opt}-${i}`} style={{ transform: [{ translateX: shakeX }] }}>
                <TouchableOpacity
                  style={[
                    styles.optionChip,
                    { backgroundColor: colors.surface, borderColor: 'rgba(196,149,80,0.35)' },
                    isUsed && styles.optionChipUsed,
                    isDisabled && styles.optionChipDisabled,
                  ]}
                  onPress={() => handleOptionSelect(opt)}
                  disabled={isUsed || isDisabled}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionChipText, { color: isUsed || isDisabled ? colors.textMuted : ACCENT }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── Type / Heart stage
  const renderType = (fromMemory: boolean) => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.practiceContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!fromMemory && (
          <Text style={[styles.stageHint, { color: colors.textMuted }]}>Ayeti yazın</Text>
        )}
        <View style={[styles.refPill, { backgroundColor: 'rgba(196,149,80,0.08)' }]}>
          <Text style={styles.refPillText}>
            {practiceVerse?.book} {practiceVerse?.chapter}:{practiceVerse?.verse}
          </Text>
        </View>
        {fromMemory && !checkResult && (
          <Text style={[styles.stageHint, { color: colors.textMuted, textAlign: 'center', marginBottom: 20 }]}>
            Sadece referanstan ezberden yaz
          </Text>
        )}
        {!checkResult ? (
          <>
            <TextInput
              style={[styles.typeInput, {
                backgroundColor: 'rgba(196,149,80,0.04)',
                borderColor: 'rgba(196,149,80,0.2)',
                color: colors.text,
              }]}
              placeholder="Ayeti buraya yaz..."
              placeholderTextColor={colors.textMuted}
              value={typedText}
              onChangeText={setTypedText}
              multiline
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCheck}>
              <Text style={styles.primaryBtnText}>Kontrol Et</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.resultBlock}>
              <Text style={styles.accuracyBig}>
                {Math.round(checkResult.accuracy * 100)}%
              </Text>
              <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>
                {checkResult.accuracy >= 0.8
                  ? 'Harika!'
                  : checkResult.accuracy >= 0.6
                  ? 'Çok yaklaştın!'
                  : 'Tekrar dene'}
        </Text>
      </View>
            <View style={styles.comparisonWrap}>
              {checkResult.words.map((item, i) => (
                <Text key={i} style={[
                  styles.compWord,
                  item.status === 'correct' ? styles.compCorrect
                    : item.status === 'close' ? styles.compClose
                    : styles.compWrong,
                ]}>
                  {item.word}{' '}
                </Text>
        ))}
      </View>
            {checkResult.accuracy >= 0.6 ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => advanceStage(checkResult.accuracy)}>
                <Text style={styles.primaryBtnText}>Devam Et →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnOutline]}
                onPress={() => { setTypedText(''); setCheckResult(null); }}>
                <Text style={[styles.primaryBtnText, { color: ACCENT }]}>Tekrar Dene</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Speech stage
  const renderSpeech = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.practiceContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.stageHint, { color: colors.textMuted }]}>Dinle ve yaz</Text>
        <TouchableOpacity style={styles.speakBtn} onPress={handleSpeak}>
          <Ionicons
            name={isSpeaking ? 'pause-circle-outline' : 'volume-high-outline'}
            size={28} color={ACCENT}
          />
          <Text style={styles.speakBtnText}>{isSpeaking ? 'Okunuyor...' : 'Tekrar Dinle'}</Text>
        </TouchableOpacity>
        {!checkResult ? (
          <>
      <TextInput
              style={[styles.typeInput, {
                backgroundColor: 'rgba(196,149,80,0.04)',
                borderColor: 'rgba(196,149,80,0.2)',
                color: colors.text,
              }]}
              placeholder="Duyduklarını yaz..."
              placeholderTextColor={colors.textMuted}
        value={typedText}
        onChangeText={setTypedText}
        multiline
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCheck}>
              <Text style={styles.primaryBtnText}>Kontrol Et</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.resultBlock}>
              <Text style={styles.accuracyBig}>{Math.round(checkResult.accuracy * 100)}%</Text>
              <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>
                {checkResult.accuracy >= 0.8 ? 'Harika!' : checkResult.accuracy >= 0.6 ? 'Çok yaklaştın!' : 'Tekrar dene'}
            </Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => advanceStage(checkResult.accuracy)}>
              <Text style={styles.primaryBtnText}>Devam Et →</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Practice view
  const renderPractice = () => {
    if (!practiceVerse) return null;
    const totalStages = stages.length;
    const progressPct = totalStages > 0 ? (stageIdx / totalStages) * 100 : 0;

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.practiceHeader, { borderBottomColor: 'rgba(196,149,80,0.1)' }]}>
          <TouchableOpacity
            onPress={() => { Speech.stop(); setView('list'); }}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.practiceHeaderCenter}>
            <Text style={[styles.practiceStageLabel, { color: colors.text }]}>
              {currentStage ? STAGE_LABELS[currentStage] : ''}
            </Text>
            <Text style={[styles.practiceStepCount, { color: 'rgba(196,149,80,0.5)' }]}>
              {stageIdx + 1}/{totalStages}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.practiceProgressBg}>
          <View style={[styles.practiceProgressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={{ flex: 1 }}>
          {currentStage === 'see' && renderSee()}
          {currentStage === 'fill' && renderFill()}
          {currentStage === 'type' && renderType(false)}
          {currentStage === 'heart' && renderType(true)}
          {currentStage === 'speech' && renderSpeech()}
        </View>
      </SafeAreaView>
    );
  };

  // ── Result view
  const renderResult = () => {
    const durationMin = Math.round((Date.now() - practiceStartTime) / 60000);
    const nextDue = dueToday.find(v => v.id !== practiceVerse?.id);
    const newLevel = Math.min((practiceVerse?.level ?? 0) + (finalAccuracy >= 0.8 ? 1 : 0), 4);
    const daysNext = REVIEW_INTERVALS[newLevel] ?? 30;

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Confetti overlay */}
        <View style={styles.confettiContainer} pointerEvents="none">
          {confettiAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                transform: [
                  { translateX: Animated.multiply(anim.x, SCREEN_WIDTH) },
                  { translateY: anim.y },
                  {
                    rotate: anim.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
                opacity: anim.opacity,
              }}
            >
              <View style={[styles.confettiParticle, { backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }]} />
            </Animated.View>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.resultContent}>
          <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={40} color={ACCENT} />
            </View>
          </Animated.View>

          <Text style={[styles.resultTitle, { color: colors.text }]}>Harika iş!</Text>

          <View style={styles.resultStats}>
            <View style={[styles.resultStatCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.resultStatNum}>{Math.round(finalAccuracy * 100)}%</Text>
              <Text style={[styles.resultStatLabel, { color: colors.textMuted }]}>Doğruluk</Text>
            </View>
            <View style={[styles.resultStatCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.resultStatNum}>{durationMin < 1 ? '<1' : durationMin}</Text>
              <Text style={[styles.resultStatLabel, { color: colors.textMuted }]}>Dakika</Text>
            </View>
            <View style={[styles.resultStatCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.resultStatNum}>{newLevel}/5</Text>
              <Text style={[styles.resultStatLabel, { color: colors.textMuted }]}>Level</Text>
            </View>
          </View>

          <View style={[styles.nextReviewCard, { backgroundColor: 'rgba(196,149,80,0.06)', borderColor: 'rgba(196,149,80,0.2)' }]}>
            <Ionicons name="calendar-outline" size={16} color={ACCENT} />
            <Text style={[styles.nextReviewText, { color: colors.textMuted }]}>
              Bu ayet {daysNext} gün sonra tekrar edilecek
            </Text>
          </View>

          <View style={styles.resultBtns}>
            {nextDue && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => startPractice(nextDue)}>
                <Text style={styles.primaryBtnText}>Başka Ayet Çalış</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={nextDue ? [styles.primaryBtn, styles.primaryBtnOutline] : styles.primaryBtn}
              onPress={() => { loadProgress(); setView('list'); }}
            >
              <Text style={[styles.primaryBtnText, nextDue && { color: ACCENT }]}>
                Listeye Dön
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  // ── Add view
  const renderAdd = () => (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: 'rgba(196,149,80,0.12)' }]}>
        <TouchableOpacity onPress={() => setView('list')} style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ayet Ekle</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.addTabBar, { borderBottomColor: 'rgba(196,149,80,0.12)' }]}>
        {(
          [
            ['suggestions', 'Öneriler'],
            ['favorites', 'Favorilerim'],
            ['manual', 'Manuel'],
          ] as [AddTab, string][]
        ).map(([tab, label]) => (
          <TouchableOpacity
            key={tab}
            style={[styles.addTab, addTab === tab && styles.addTabActive]}
            onPress={() => setAddTab(tab)}
          >
            <Text style={[styles.addTabText, { color: addTab === tab ? ACCENT : colors.textMuted }]}>
              {label}
            </Text>
            {addTab === tab && <View style={styles.addTabIndicator} />}
          </TouchableOpacity>
        ))}
            </View>

      {addFeedback !== '' && (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{addFeedback}</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Suggestions tab */}
        {addTab === 'suggestions' &&
          SUGGESTIONS.map((s, i) => {
            const id = makeId(s.book, s.chapter, s.verse);
            const text = getVerseTextByVerseId(id) ?? '';
            const added = !!progress[id];
            return (
              <TouchableOpacity
                key={i}
                style={[styles.addVerseCard, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: added ? 0.55 : 1,
                }]}
                onPress={() => { if (!added && text) addVerse(s.book, s.chapter, s.verse, text); }}
                disabled={added}
                activeOpacity={0.75}
              >
                <View style={styles.addVerseCardInfo}>
                  <Text style={styles.addVerseRef}>{s.book} {s.chapter}:{s.verse}</Text>
                  <Text style={[styles.addVerseText, { color: colors.textMuted }]} numberOfLines={2}>
                    {text || '—'}
                  </Text>
                </View>
                {added ? (
                  <View style={styles.addedBadge}>
                    <Text style={styles.addedBadgeText}>Eklendi ✓</Text>
                  </View>
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color={ACCENT} />
                )}
              </TouchableOpacity>
            );
          })}

        {/* Favorites tab */}
        {addTab === 'favorites' &&
          (favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Favori ayetiniz yok
              </Text>
            </View>
          ) : (
            favorites.map(verseId => {
              const text = getVerseTextByVerseId(verseId) ?? '';
              const ref = getVerseRefFromVerseId(verseId);
              const parts = verseId.split('-');
              const verse = parseInt(parts[parts.length - 1], 10);
              const chapter = parseInt(parts[parts.length - 2], 10);
              const book = parts.slice(0, -2).join('-');
              const added = !!progress[verseId];
  return (
                <TouchableOpacity
                  key={verseId}
                  style={[styles.addVerseCard, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: added ? 0.55 : 1,
                  }]}
                  onPress={() => { if (!added && text) addVerse(book, chapter, verse, text); }}
                  disabled={added}
                  activeOpacity={0.75}
                >
                  <View style={styles.addVerseCardInfo}>
                    <Text style={styles.addVerseRef}>{ref}</Text>
                    <Text style={[styles.addVerseText, { color: colors.textMuted }]} numberOfLines={2}>
                      {text}
        </Text>
      </View>
                  {added ? (
                    <View style={styles.addedBadge}>
                      <Text style={styles.addedBadgeText}>Eklendi ✓</Text>
                    </View>
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color={ACCENT} />
                  )}
                </TouchableOpacity>
              );
            })
          ))}

        {/* Manual tab */}
        {addTab === 'manual' && (
          <View style={styles.manualForm}>
            <Text style={[styles.manualLabel, { color: colors.textMuted }]}>Kitap Adı</Text>
            <TextInput
              style={[styles.manualInput, {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: 'rgba(196,149,80,0.25)',
              }]}
              placeholder="örn: Yuhanna"
              placeholderTextColor={colors.textMuted}
              value={manualBook}
              onChangeText={setManualBook}
              autoCorrect={false}
            />
            <Text style={[styles.manualLabel, { color: colors.textMuted }]}>Bölüm</Text>
            <TextInput
              style={[styles.manualInput, {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: 'rgba(196,149,80,0.25)',
              }]}
              placeholder="örn: 3"
              placeholderTextColor={colors.textMuted}
              value={manualChapter}
              onChangeText={setManualChapter}
              keyboardType="numeric"
            />
            <Text style={[styles.manualLabel, { color: colors.textMuted }]}>Ayet</Text>
            <TextInput
              style={[styles.manualInput, {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: 'rgba(196,149,80,0.25)',
              }]}
              placeholder="örn: 16"
              placeholderTextColor={colors.textMuted}
              value={manualVerse}
              onChangeText={setManualVerse}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 24 }]}
              onPress={() => {
                const ch = parseInt(manualChapter, 10);
                const v = parseInt(manualVerse, 10);
                if (!manualBook.trim() || isNaN(ch) || isNaN(v)) {
                  setAddFeedback('Lütfen tüm alanları doldurun.');
                  return;
                }
                const id = makeId(manualBook.trim(), ch, v);
                const text = getVerseTextByVerseId(id);
                if (!text) {
                  setAddFeedback('Ayet bulunamadı. Kitap adını kontrol edin.');
                  return;
                }
                addVerse(manualBook.trim(), ch, v, text);
              }}
            >
              <Text style={styles.primaryBtnText}>Ekle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // ── Root render
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
      </View>
    </SafeAreaView>
  );
}

  if (view === 'practice') return renderPractice();
  if (view === 'result') return renderResult();
  if (view === 'add') return renderAdd();
  return renderList();
}

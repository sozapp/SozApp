import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GameShell } from '@/components/games/GameShell';
import { markGameCompletedToday } from '@/constants/game-storage';
import { trackEvent } from '@/constants/analytics';
import { dailySeed, pickDailyItems, seededShuffle } from '@/constants/seeded-random';
import { useTranslation } from '@/context/LanguageContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTheme } from '@/hooks/useTheme';

const ACCENT = '#C4956A';
const SUCCESS = '#4CAF50';
const DANGER = '#E57373';
const STREAK_KEY = '@soz/game/verse-order/streak';
const GAME_ID = 'verse-order';

type VerseOrderQuestion = {
  /** Doğru kelime sırası (5–8 kelime). */
  words: string[];
  reference: string;
};

type WordChip = {
  id: string;
  text: string;
};

const ALL_VERSES: VerseOrderQuestion[] = [
  {
    words: ['RAB', 'benim', 'çobanım', 'hiçbir', 'şeyim', 'eksik', 'olmaz'],
    reference: 'Mezmur 23:1',
  },
  {
    words: ['Ben', 'yol', 'gerçek', 've', 'yaşamım'],
    reference: 'Yuhanna 14:6',
  },
  {
    words: ['Tanrı', 'dünyayı', 'o', 'kadar', 'çok', 'sevdi'],
    reference: 'Yuhanna 3:16',
  },
  {
    words: ['Sözün', 'adımlarım', 'için', 'çıra', 'yolum', 'için', 'ışıktır'],
    reference: 'Mezmur 119:105',
  },
  {
    words: ['Her', 'şeyi', 'bana', 'güç', 'veren', 'Mesih', 'aracılığıyla'],
    reference: 'Filipililer 4:13',
  },
  {
    words: ['Başlangıçta', 'Söz', 'vardı', 'Söz', 'Tanrı', 'ile'],
    reference: 'Yuhanna 1:1',
  },
  {
    words: ['Ve', 'gerçek', 'sizi', 'özgür', 'kılacak'],
    reference: 'Yuhanna 8:32',
  },
  {
    words: ['Sevinin', 'Rabde', 'yine', 'sevinin', 'diyorum'],
    reference: 'Filipililer 4:4',
  },
  {
    words: ['RAB', 'benim', 'ışığım', 've', 'kurtuluşum'],
    reference: 'Mezmur 27:1',
  },
  {
    words: ['Tanrı', 'sevgidir', 'seven', 'Tanrıdan', 'doğmuştur'],
    reference: '1. Yuhanna 4:7',
  },
  {
    words: ['Yorgun', 've', 'yükü', 'ağır', 'olan', 'herkes', 'bana', 'gelsin'],
    reference: 'Matta 11:28',
  },
  {
    words: ['Çünkü', 'imanla', 'yaşıyoruz', 'görünüşle', 'değil'],
    reference: '2. Korintliler 5:7',
  },
  {
    words: ['Siz', 'dünyanın', 'ışığısınız', 'dağın', 'üstündeki', 'kent'],
    reference: 'Matta 5:14',
  },
  {
    words: ['Korkma', 'çünkü', 'ben', 'seninleyim', 'seni', 'güçlendireceğim'],
    reference: 'Yeşaya 41:10',
  },
  {
    words: ['Rabbe', 'güven', 'kendi', 'anlayışına', 'dayanma'],
    reference: "Süleyman'ın Özdeyişleri 3:5",
  },
  {
    words: ['Sevgi', 'sabırlıdır', 'sevgi', 'şefkatlidir', 'kıskanmaz'],
    reference: '1. Korintliler 13:4',
  },
];

function toChips(words: string[]): WordChip[] {
  return words.map((text, i) => ({ id: `${i}:${text}`, text }));
}

/** Aynı günde herkese aynı karışık sıra; orijinal sıraya düşerse yeniden karıştır. */
function scrambleChips(words: string[], salt: string): WordChip[] {
  const chips = toChips(words);
  let order = seededShuffle(chips, dailySeed(salt));
  const same =
    order.length > 1 && order.every((c, i) => c.id === chips[i]?.id);
  if (same) {
    order = seededShuffle(chips, dailySeed(`${salt}:r`));
  }
  return order;
}

function pickQuestions(): VerseOrderQuestion[] {
  return pickDailyItems(
    ALL_VERSES.filter((v) => v.words.length >= 5 && v.words.length <= 8),
    10,
    GAME_ID,
  );
}

export default function VerseOrder() {
  const { colors, fonts } = useTheme();
  const { t } = useTranslation();
  const { submitScore } = useLeaderboard(GAME_ID);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [questions, setQuestions] = useState<VerseOrderQuestion[]>(() => pickQuestions());
  const [pool, setPool] = useState<WordChip[]>([]);
  const [placed, setPlaced] = useState<WordChip[]>([]);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalQuestions = questions.length;
  const current = questions[currentIndex];

  const loadQuestion = useCallback((q: VerseOrderQuestion | undefined, index: number) => {
    if (!q) return;
    const salt = `${GAME_ID}:${q.reference}:${index}`;
    setPool(scrambleChips(q.words, salt));
    setPlaced([]);
    setLocked(false);
    setFeedback(null);
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  useEffect(() => {
    loadQuestion(questions[currentIndex], currentIndex);
  }, [questions, currentIndex, loadQuestion]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      void (async () => {
        try {
          const raw = await AsyncStorage.getItem(STREAK_KEY);
          const val = raw ? parseInt(raw, 10) : 0;
          if (mounted) setStreak(Number.isNaN(val) ? 0 : Math.max(0, val));
        } catch {
          if (mounted) setStreak(0);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const saveStreak = async (nextStreak: number) => {
    try {
      await AsyncStorage.setItem(STREAK_KEY, String(nextStreak));
    } catch {
      /* ignore */
    }
    setStreak(nextStreak);
  };

  const goNext = async (wasCorrect: boolean) => {
    const isLast = currentIndex >= totalQuestions - 1;
    if (isLast) {
      const finalScore = wasCorrect ? score + 1 : score;
      const nextStreak = finalScore >= 8 ? streak + 1 : 0;
      await saveStreak(nextStreak);
      await markGameCompletedToday(GAME_ID);
      trackEvent('game_completed', { game_id: GAME_ID });
      void submitScore(finalScore);
      setGameOver(true);
      return;
    }
    setCurrentIndex((idx) => idx + 1);
  };

  const evaluate = (nextPlaced: WordChip[]) => {
    if (!current || locked) return;
    if (nextPlaced.length !== current.words.length) return;

    setLocked(true);
    const correct = nextPlaced.every((c, i) => c.text === current.words[i]);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      setScore((s) => s + 1);
    }

    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      void goNext(correct);
    }, 900);
  };

  const onTapPool = (chip: WordChip) => {
    if (locked || !current) return;
    const nextPool = pool.filter((c) => c.id !== chip.id);
    const nextPlaced = [...placed, chip];
    setPool(nextPool);
    setPlaced(nextPlaced);
    evaluate(nextPlaced);
  };

  const onTapPlaced = (chip: WordChip) => {
    if (locked) return;
    setPlaced((prev) => prev.filter((c) => c.id !== chip.id));
    setPool((prev) => [...prev, chip]);
  };

  const onClear = () => {
    if (locked || !current) return;
    loadQuestion(current, currentIndex);
  };

  const onReplay = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const next = pickQuestions();
    setQuestions(next);
    setCurrentIndex(0);
    setScore(0);
    setGameOver(false);
    loadQuestion(next[0], 0);
  };

  const resultMeta = useMemo(() => {
    if (score >= 8) return { text: t('gameResultPerfect'), icon: 'trophy-outline' as const, color: SUCCESS };
    if (score >= 5) return { text: t('gameResultGood'), icon: 'thumbs-up-outline' as const, color: ACCENT };
    return { text: t('gameResultRetry'), icon: 'refresh-outline' as const, color: DANGER };
  }, [score, t]);

  if (!current) return null;

  const slotBorder =
    feedback === 'correct' ? SUCCESS : feedback === 'wrong' ? DANGER : colors.border;
  const slotBg =
    feedback === 'correct'
      ? `${SUCCESS}18`
      : feedback === 'wrong'
        ? `${DANGER}18`
        : colors.card;

  return (
    <GameShell
      gameId={GAME_ID}
      title={t('verseOrder')}
      leaderboardTitle={t('verseOrderLeaderboard')}
      streak={streak}
      currentIndex={currentIndex}
      totalQuestions={totalQuestions}
      gameOver={gameOver}
      score={score}
      resultMeta={resultMeta}
      resultExtra={
        <Text style={[styles.dailyHint, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          {t('gameDailyStreakHint')}
        </Text>
      }
      replayButtonLayout={styles.replayLayout}
      onReplay={onReplay}
    >
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.questionMeta, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          {t('gameQuestionProgress', { current: currentIndex + 1, total: totalQuestions })}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted, fontFamily: fonts.regular }]}>
          {t('verseOrderHint')}
        </Text>

        <View style={[styles.answerRow, { borderColor: slotBorder, backgroundColor: slotBg }]}>
          {placed.length === 0 ? (
            <Text style={[styles.answerPlaceholder, { color: colors.textMuted, fontFamily: fonts.italic ?? fonts.regular }]}>
              {t('verseOrderTapWords')}
            </Text>
          ) : (
            placed.map((chip) => (
              <TouchableOpacity
                key={`placed-${chip.id}`}
                style={[styles.chip, styles.chipPlaced, { backgroundColor: `${ACCENT}28`, borderColor: ACCENT }]}
                onPress={() => onTapPlaced(chip)}
                disabled={locked}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, { color: colors.text, fontFamily: fonts.regular }]}>
                  {chip.text}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Text style={[styles.reference, { color: ACCENT, fontFamily: fonts.regular }]}>
          {current.reference}
        </Text>
      </View>

      <View style={styles.poolWrap}>
        <View style={styles.poolHeader}>
          <Text style={[styles.poolLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {t('verseOrderScrambled')}
          </Text>
          {placed.length > 0 && !locked ? (
            <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.clearBtn, { color: ACCENT, fontFamily: fonts.regular }]}>
                {t('verseOrderClear')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.pool}>
          {pool.map((chip) => (
            <TouchableOpacity
              key={`pool-${chip.id}`}
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => onTapPool(chip)}
              disabled={locked}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, { color: colors.text, fontFamily: fonts.regular }]}>
                {chip.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 24,
    margin: 16,
  },
  questionMeta: {
    fontSize: 12,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  answerRow: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  answerPlaceholder: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  reference: {
    marginTop: 14,
    fontSize: 13,
    textAlign: 'right',
  },
  poolWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  poolLabel: {
    fontSize: 12,
  },
  clearBtn: {
    fontSize: 13,
  },
  pool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipPlaced: {
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 15,
  },
  dailyHint: { fontSize: 13, textAlign: 'center' },
  replayLayout: { width: '100%', marginTop: 6 },
});

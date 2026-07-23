import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useSafeBack } from '@/hooks/useSafeBack';
import { markGameCompletedToday } from '@/constants/game-storage';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { GameLeaderboardModal } from '@/components/GameLeaderboardModal';

const ACCENT = '#C4956A';
const SUCCESS = '#4CAF50';
const DANGER = '#E57373';
const STREAK_KEY = '@soz/game/missing-word/streak';
const GAME_ID = 'missing-word';

type VerseQuestion = {
  template: string;
  reference: string;
  answer: string;
  options: string[];
};

const ALL_VERSES: VerseQuestion[] = [
  {
    template: 'Tanrı dünyayı o kadar çok _____ ki biricik Oğlunu verdi.',
    reference: 'Yuhanna 3:16',
    answer: 'sevdi',
    options: ['sevdi', 'yarattı', 'bildi', 'kurtardı'],
  },
  {
    template: 'Ben yol, _____ ve yaşamım.',
    reference: 'Yuhanna 14:6',
    answer: 'gerçek',
    options: ['gerçek', 'ışık', 'umut', 'güç'],
  },
  {
    template: 'Her şeyi bana _____ veren Mesih aracılığıyla yapabilirim.',
    reference: 'Filipililer 4:13',
    answer: 'güç',
    options: ['güç', 'sevgi', 'umut', 'iman'],
  },
  {
    template: 'RAB benim _____, hiçbir şeyim eksik olmaz.',
    reference: 'Mezmur 23:1',
    answer: 'çobanım',
    options: ['çobanım', 'gücüm', 'ışığım', 'koruyanım'],
  },
  {
    template: 'İman, umduklarımıza _____, görmediğimiz şeylerin varlığından emin olmaktır.',
    reference: 'İbraniler 11:1',
    answer: 'güvenmek',
    options: ['güvenmek', 'inanmak', 'sarılmak', 'ulaşmak'],
  },
  {
    template: 'Sevgi _____, sevgi şefkatlidir.',
    reference: '1. Korintliler 13:4',
    answer: 'sabırlıdır',
    options: ['sabırlıdır', 'güçlüdür', 'sessizdir', 'mükemmeldir'],
  },
  {
    template: 'Başlangıçta _____ vardı.',
    reference: 'Yuhanna 1:1',
    answer: 'Söz',
    options: ['Söz', 'Işık', 'Tanrı', 'Ruh'],
  },
  {
    template: "Endişelenmeyin; bunun yerine her durumda, şükranla birlikte _____ ve dileklerinizi Tanrı'ya bildirin.",
    reference: 'Filipililer 4:6',
    answer: 'dua',
    options: ['dua', 'şarkı', 'hizmet', 'iman'],
  },
  {
    template: 'RAB benim ışığım ve _____.',
    reference: 'Mezmur 27:1',
    answer: 'kurtuluşum',
    options: ['kurtuluşum', 'sığınağım', 'gücüm', 'sözüm'],
  },
  {
    template: 'Sevinin, yine sevinin _____ diyorum.',
    reference: 'Filipililer 4:4',
    answer: 'diyorum',
    options: ['diyorum', 'sana', 'hemen', 'kalpten'],
  },
  {
    template: 'Tanrı _____ sevgidir.',
    reference: '1. Yuhanna 4:8',
    answer: 'sevgidir',
    options: ['sevgidir', 'sadıktır', 'yücedir', 'ışıktır'],
  },
  {
    template: 'Sözün adımlarım için _____, yolum için ışıktır.',
    reference: 'Mezmur 119:105',
    answer: 'çıra',
    options: ['çıra', 'kalkan', 'teselli', 'güç'],
  },
  {
    template: 'Gerçek sizi _____ kılacak.',
    reference: 'Yuhanna 8:32',
    answer: 'özgür',
    options: ['özgür', 'mutlu', 'güçlü', 'bilge'],
  },
  {
    template: 'Çünkü imanla yaşıyoruz, _____ ile değil.',
    reference: '2. Korintliler 5:7',
    answer: 'görünüşle',
    options: ['görünüşle', 'sözle', 'yasa ile', 'duygu ile'],
  },
  {
    template: 'RAB sana neyin iyi olduğunu gösterdi: adil ol, merhameti sev ve Tanrınla alçakgönüllü _____.',
    reference: 'Mika 6:8',
    answer: 'yürü',
    options: ['yürü', 'dua et', 'bekle', 'koş'],
  },
  {
    template: 'Yorgun ve yükü ağır olan herkes bana gelsin, ben size _____ vereceğim.',
    reference: 'Matta 11:28',
    answer: 'huzur',
    options: ['huzur', 'zafer', 'sabır', 'umut'],
  },
];

function pickQuestions(): VerseQuestion[] {
  return [...ALL_VERSES].sort(() => Math.random() - 0.5).slice(0, 10);
}

export default function MissingWord() {
  const router = useRouter();
  const safeBack = useSafeBack();
  const { colors, fonts } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [questions, setQuestions] = useState<VerseQuestion[]>(() => pickQuestions());
  const [locked, setLocked] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const { submitScore } = useLeaderboard(GAME_ID);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fillWordAnim = useRef(new Animated.Value(0)).current;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const totalQuestions = questions.length;
  const current = questions[currentIndex];
  const progress = totalQuestions > 0 ? (currentIndex + 1) / totalQuestions : 0;

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

  useEffect(() => {
    fillWordAnim.setValue(0);
  }, [currentIndex, fillWordAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const saveStreak = async (nextStreak: number) => {
    try {
      await AsyncStorage.setItem(STREAK_KEY, String(nextStreak));
    } catch {
      // ignore persistence failure
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
      void submitScore(finalScore);
      setGameOver(true);
      return;
    }
    setCurrentIndex((idx) => idx + 1);
    setSelectedAnswer(null);
    setLocked(false);
  };

  const onSelect = (option: string) => {
    if (!current || locked) return;
    setSelectedAnswer(option);
    setLocked(true);

    const correct = option === current.answer;
    if (correct) {
      setScore((s) => s + 1);
      Animated.timing(fillWordAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      void goNext(correct);
    }, 850);
  };

  const onReplay = () => {
    setQuestions(pickQuestions());
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setGameOver(false);
    setLocked(false);
    progressAnim.setValue(0);
    fillWordAnim.setValue(0);
  };

  const resultMeta = useMemo(() => {
    if (score >= 8) return { text: 'Mükemmel! 🎉', icon: 'trophy-outline' as const, color: SUCCESS };
    if (score >= 5) return { text: 'İyi iş! 💪', icon: 'thumbs-up-outline' as const, color: ACCENT };
    return { text: 'Tekrar dene!', icon: 'refresh-outline' as const, color: DANGER };
  }, [score]);

  if (!current) return null;

  const parts = current.template.split('_____');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => safeBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.regular }]}>Eksik Kelime</Text>
        <View style={[styles.streakBadge, { backgroundColor: `${ACCENT}20` }]}>
          <Ionicons name="flame-outline" size={14} color={ACCENT} />
          <Text style={[styles.streakText, { color: ACCENT, fontFamily: fonts.regular }]}>{streak}</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!gameOver ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.questionMeta, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                Soru {currentIndex + 1}/{totalQuestions}
              </Text>

              <Text style={[styles.verse, { color: colors.text, fontFamily: fonts.italic ?? fonts.regular }]}>
                {parts[0]}
                {selectedAnswer === current.answer ? (
                  <Animated.Text
                    style={[
                      styles.fillWord,
                      {
                        color: SUCCESS,
                        opacity: fillWordAnim,
                        transform: [
                          {
                            translateY: fillWordAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [6, 0],
                            }),
                          },
                        ],
                        fontFamily: fonts.regular,
                      },
                    ]}
                  >
                    {current.answer}
                  </Animated.Text>
                ) : (
                  <Text style={[styles.blankWord, { borderBottomColor: ACCENT, color: colors.textSecondary }]}>
                    _____
                  </Text>
                )}
                {parts[1]}
              </Text>

              <Text style={[styles.reference, { color: ACCENT, fontFamily: fonts.regular }]}>
                {current.reference}
              </Text>
            </View>

            <View style={styles.optionsGrid}>
              {current.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === current.answer;
                const selectedWrong = Boolean(selectedAnswer && isSelected && !isCorrect);
                const revealCorrect = Boolean(selectedAnswer && isCorrect);

                let borderColor = colors.border;
                let backgroundColor = colors.card;
                if (selectedWrong) {
                  borderColor = DANGER;
                  backgroundColor = `${DANGER}20`;
                } else if (revealCorrect) {
                  borderColor = SUCCESS;
                  backgroundColor = `${SUCCESS}20`;
                }

                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionBtn, { borderColor, backgroundColor }]}
                    onPress={() => onSelect(option)}
                    activeOpacity={0.88}
                    disabled={locked}
                  >
                    <Text style={[styles.optionText, { color: colors.text, fontFamily: fonts.regular }]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
            <Ionicons name={resultMeta.icon} size={48} color={resultMeta.color} />
            <Text style={[styles.resultTitle, { color: resultMeta.color, fontFamily: fonts.regular }]}>
              {resultMeta.text}
            </Text>
            <Text style={[styles.resultScore, { color: colors.text, fontFamily: fonts.regular }]}>
              Puan: {score} / {totalQuestions}
            </Text>
            <Text style={[styles.dailyHint, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Yarın tekrar gel, günlük seriyi koru.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onReplay} activeOpacity={0.9}>
              <Text style={[styles.primaryBtnText, { fontFamily: fonts.regular }]}>Tekrar Oyna</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setLeaderboardVisible(true)}
              activeOpacity={0.9}
            >
              <Ionicons name="trophy-outline" size={16} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text, fontFamily: fonts.regular }]}>
                Liderlik Tablosu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => router.push('/(tabs)' as never)}
              activeOpacity={0.9}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text, fontFamily: fonts.regular }]}>
                Ana Sayfaya Dön
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <GameLeaderboardModal
        visible={leaderboardVisible}
        onClose={() => setLeaderboardVisible(false)}
        gameId={GAME_ID}
        title="Eksik Kelime — Liderlik"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 48,
    justifyContent: 'center',
  },
  streakText: { fontSize: 12 },
  progressTrack: {
    marginHorizontal: 16,
    marginTop: 6,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  content: { paddingBottom: 28 },
  card: {
    borderRadius: 20,
    padding: 24,
    margin: 16,
  },
  questionMeta: {
    fontSize: 12,
    marginBottom: 12,
  },
  verse: {
    fontSize: 20,
    lineHeight: 30,
  },
  blankWord: {
    minWidth: 80,
    textAlign: 'center',
    borderBottomWidth: 2,
  },
  fillWord: {
    minWidth: 80,
    textAlign: 'center',
  },
  reference: {
    marginTop: 14,
    fontSize: 13,
    textAlign: 'right',
  },
  optionsGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionBtn: {
    width: '48.5%',
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  optionText: {
    fontSize: 15,
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: 20,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    gap: 12,
  },
  resultTitle: { fontSize: 24, textAlign: 'center' },
  resultScore: { fontSize: 18 },
  dailyHint: { fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    width: '100%',
    marginTop: 6,
    backgroundColor: ACCENT,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF8EE', fontSize: 15 },
  secondaryBtn: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { fontSize: 15 },
});

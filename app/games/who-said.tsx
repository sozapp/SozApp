import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { markGameCompletedToday } from '@/constants/game-storage';
import { trackEvent } from '@/constants/analytics';
import { pickDailyItems } from '@/constants/seeded-random';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { GameShell } from '@/components/games/GameShell';

const ACCENT = '#C4956A';
const SUCCESS = '#4CAF50';
const DANGER = '#E57373';
const STREAK_KEY = '@soz/game/who-said/streak';
const GAME_ID = 'who-said';

type Question = {
  verse: string;
  reference: string;
  options: string[];
  correct: string;
};

const ALL_QUESTIONS: Question[] = [
  { verse: 'Ben yol, gerçek ve yaşamım.', reference: 'Yuhanna 14:6', options: ['İsa', 'Pavlus', 'Petrus', 'Yuhanna'], correct: 'İsa' },
  { verse: 'Her şeyi bana güç veren Mesih aracılığıyla yapabilirim.', reference: 'Filipililer 4:13', options: ['İsa', 'Pavlus', 'Petrus', 'Yuhanna'], correct: 'Pavlus' },
  { verse: 'RAB benim çobanım, hiçbir şeyim eksik olmaz.', reference: 'Mezmur 23:1', options: ['Davud', 'Musa', 'Süleyman', 'İbrahim'], correct: 'Davud' },
  { verse: 'Tanrı dünyayı o kadar çok sevdi ki biricik Oğlunu verdi.', reference: 'Yuhanna 3:16', options: ['İsa', 'Yuhanna', 'Pavlus', 'Luka'], correct: 'Yuhanna' },
  { verse: 'Sevgi sabırlıdır, sevgi şefkatlidir.', reference: '1. Korintliler 13:4', options: ['Pavlus', 'İsa', 'Petrus', 'Yuhanna'], correct: 'Pavlus' },
  { verse: 'Başlangıçta Söz vardı.', reference: 'Yuhanna 1:1', options: ['Yuhanna', 'Pavlus', 'Luka', 'Matta'], correct: 'Yuhanna' },
  { verse: 'İman, umduklarımıza güvenmek, görmediğimiz şeylerin varlığından emin olmaktır.', reference: 'İbraniler 11:1', options: ['Pavlus', 'Petrus', 'Yuhanna', 'Luka'], correct: 'Pavlus' },
  { verse: 'Ruhun meyvesi sevgi, sevinç, esenlik, sabır, şefkat, iyilik, bağlılık, yumuşaklık ve özdenetimdir.', reference: 'Galatyalılar 5:22-23', options: ['Pavlus', 'İsa', 'Petrus', 'Yuhanna'], correct: 'Pavlus' },
  { verse: 'Çocuklar, sizi seven Baba adına yazıyorum.', reference: '1. Yuhanna 2:13', options: ['Yuhanna', 'Pavlus', 'Petrus', 'İsa'], correct: 'Yuhanna' },
  { verse: 'Korkma, çünkü ben seninleyim.', reference: 'Yeşaya 41:10', options: ['Yeşaya', 'Musa', 'Davud', 'İlyas'], correct: 'Yeşaya' },
  { verse: 'RAB ışığım ve kurtuluşumdur, kimseden korkmam.', reference: 'Mezmur 27:1', options: ['Davud', 'Süleyman', 'Musa', 'Yeşaya'], correct: 'Davud' },
  { verse: 'Dinle ey İsrail! Tanrımız RAB tek RAB’dir.', reference: 'Yasa’nın Tekrarı 6:4', options: ['Musa', 'Davud', 'Yeşu', 'Süleyman'], correct: 'Musa' },
  { verse: 'Çünkü insanın yüreğinden kötü düşünceler çıkar.', reference: 'Markos 7:21', options: ['İsa', 'Pavlus', 'Petrus', 'Yakup'], correct: 'İsa' },
  { verse: 'Rabbe güven, kendi anlayışına dayanma.', reference: 'Süleymanın Özdeyişleri 3:5', options: ['Süleyman', 'Davud', 'Musa', 'Yeşaya'], correct: 'Süleyman' },
  { verse: 'Sevinin, yine sevinin diyorum.', reference: 'Filipililer 4:4', options: ['Pavlus', 'Petrus', 'Yuhanna', 'İsa'], correct: 'Pavlus' },
  { verse: 'Sözün adımlarım için çıra, yolum için ışıktır.', reference: 'Mezmur 119:105', options: ['Davud', 'Musa', 'Yeremya', 'Yeşaya'], correct: 'Davud' },
  { verse: 'Birbirinizi içten sevin.', reference: '1. Petrus 1:22', options: ['Petrus', 'Pavlus', 'Yuhanna', 'Yakup'], correct: 'Petrus' },
  { verse: 'Gerçek sizi özgür kılacak.', reference: 'Yuhanna 8:32', options: ['İsa', 'Pavlus', 'Yuhanna', 'Petrus'], correct: 'İsa' },
  { verse: 'RAB bana dedi: Sen benim oğlumsun.', reference: 'Mezmur 2:7', options: ['Davud', 'Musa', 'Yeşaya', 'Süleyman'], correct: 'Davud' },
  { verse: 'Boş sözlerinizi çok etmeyin.', reference: 'Matta 6:7', options: ['İsa', 'Petrus', 'Pavlus', 'Matta'], correct: 'İsa' },
  { verse: 'Siz dünyanın ışığısınız.', reference: 'Matta 5:14', options: ['İsa', 'Yuhanna', 'Pavlus', 'Petrus'], correct: 'İsa' },
  { verse: 'Tanrı sevgidir.', reference: '1. Yuhanna 4:8', options: ['Yuhanna', 'Pavlus', 'Petrus', 'Yakup'], correct: 'Yuhanna' },
];

function pickQuestions(): Question[] {
  return pickDailyItems(ALL_QUESTIONS, 10, GAME_ID);
}

export default function WhoSaid() {
  const { colors, fonts } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(() => pickQuestions());
  const [locked, setLocked] = useState(false);
  const { submitScore } = useLeaderboard(GAME_ID);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STREAK_KEY);
        const value = raw ? parseInt(raw, 10) : 0;
        setStreak(Number.isNaN(value) ? 0 : Math.max(0, value));
      } catch {
        setStreak(0);
      }
    })();
  }, []);

  const runWrongAnimation = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const runCorrectAnimation = () => {
    pulseAnim.setValue(1);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.03, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const onSelect = (option: string) => {
    if (!currentQuestion || locked || selectedAnswer) return;
    setSelectedAnswer(option);
    setLocked(true);
    if (option === currentQuestion.correct) {
      setScore((s) => s + 1);
      runCorrectAnimation();
    } else {
      runWrongAnimation();
    }
  };

  const persistStreak = async (nextStreak: number) => {
    try {
      await AsyncStorage.setItem(STREAK_KEY, String(nextStreak));
      setStreak(nextStreak);
    } catch {
      setStreak(nextStreak);
    }
  };

  const onNext = async () => {
    if (!selectedAnswer) return;
    const isLast = currentIndex >= totalQuestions - 1;
    if (isLast) {
      const nextStreak = score >= 8 ? streak + 1 : 0;
      await persistStreak(nextStreak);
      await markGameCompletedToday(GAME_ID);
      trackEvent('game_completed', { game_id: GAME_ID });
      void submitScore(score);
      setGameOver(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setLocked(false);
  };

  const onReplay = () => {
    setQuestions(pickQuestions());
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setGameOver(false);
    setLocked(false);
  };

  const resultMeta = useMemo(() => {
    if (score >= 8) return { text: 'Mükemmel! 🎉', icon: 'trophy-outline' as const, color: SUCCESS };
    if (score >= 5) return { text: 'İyi iş! 💪', icon: 'thumbs-up-outline' as const, color: ACCENT };
    return { text: 'Tekrar dene!', icon: 'refresh-outline' as const, color: DANGER };
  }, [score]);

  if (!currentQuestion) return null;

  return (
    <GameShell
      gameId={GAME_ID}
      title="Kim Söyledi?"
      leaderboardTitle="Kim Söyledi? — Liderlik"
      streak={streak}
      currentIndex={currentIndex}
      totalQuestions={totalQuestions}
      gameOver={gameOver}
      score={score}
      resultMeta={resultMeta}
      replayButtonLayout={styles.nextBtnLayout}
      onReplay={onReplay}
    >
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.questionMeta, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          Soru {currentIndex + 1}/{totalQuestions}
        </Text>
        <Text style={[styles.verse, { color: colors.text, fontFamily: fonts.italic ?? fonts.regular }]}>
          "{currentQuestion.verse}"
        </Text>
        <Text style={[styles.reference, { color: ACCENT, fontFamily: fonts.italic ?? fonts.regular }]}>
          {currentQuestion.reference}
        </Text>
      </Animated.View>

      <Animated.View
        style={{
          transform: [
            {
              translateX: shakeAnim.interpolate({
                inputRange: [-1, 1],
                outputRange: [-8, 8],
              }),
            },
          ],
        }}
      >
        {currentQuestion.options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === currentQuestion.correct;
          const selectedWrong = Boolean(selectedAnswer && isSelected && !isCorrect);
          const showCorrect = Boolean(selectedAnswer && isCorrect);

          let borderColor = colors.border;
          let backgroundColor = colors.card;
          if (showCorrect && isSelected) {
            borderColor = SUCCESS;
            backgroundColor = `${SUCCESS}20`;
          } else if (selectedWrong) {
            borderColor = DANGER;
            backgroundColor = `${DANGER}20`;
          } else if (showCorrect) {
            borderColor = SUCCESS;
            backgroundColor = `${SUCCESS}15`;
          }

          return (
            <TouchableOpacity
              key={option}
              style={[styles.optionBtn, { borderColor, backgroundColor }]}
              onPress={() => onSelect(option)}
              activeOpacity={0.88}
              disabled={locked}
            >
              <Text style={[styles.optionText, { color: colors.text, fontFamily: fonts.regular }]}>{option}</Text>
              {selectedWrong ? <Ionicons name="close-circle" size={20} color={DANGER} /> : null}
              {showCorrect ? <Ionicons name="checkmark-circle" size={20} color={SUCCESS} /> : null}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {selectedAnswer ? (
        <TouchableOpacity style={styles.nextBtn} onPress={() => void onNext()} activeOpacity={0.9}>
          <Text style={[styles.nextBtnText, { fontFamily: fonts.regular }]}>
            {currentIndex === totalQuestions - 1 ? 'Sonucu Gör →' : 'Sonraki Soru →'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 24,
    margin: 16,
    marginBottom: 10,
  },
  questionMeta: { fontSize: 12, textAlign: 'center' },
  verse: {
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 30,
    marginVertical: 16,
  },
  reference: { fontSize: 14, textAlign: 'center' },
  optionBtn: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { fontSize: 15 },
  nextBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: ACCENT,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFF8EE', fontSize: 15 },
  nextBtnLayout: { marginHorizontal: 16, marginTop: 10 },
});

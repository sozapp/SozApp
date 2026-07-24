import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { markGameCompletedToday } from '@/constants/game-storage';
import { trackEvent } from '@/constants/analytics';
import { pickDailyItems } from '@/constants/seeded-random';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { GameShell } from '@/components/games/GameShell';

const ACCENT = '#C4956A';
const SUCCESS = '#4CAF50';
const DANGER = '#E57373';
const STREAK_KEY = '@soz/game/true-false/streak';
const GAME_ID = 'true-false';

type Statement = {
  text: string;
  reference: string;
  isTrue: boolean;
};

const ALL_STATEMENTS: Statement[] = [
  { text: "İsa'nın ilk mucizesi suyu şaraba çevirmekti.", reference: 'Yuhanna 2:1-11', isTrue: true },
  { text: 'Pavlus 13 mektup yazdı.', reference: 'Yeni Ahit', isTrue: true },
  { text: 'Matta İncili 30 bölümden oluşur.', reference: 'Matta', isTrue: false },
  { text: "Petrus İsa'yı 3 kez inkâr etti.", reference: 'Yuhanna 18', isTrue: true },
  { text: 'Yuhanna İncili en kısa İncil’dir.', reference: 'Yeni Ahit', isTrue: false },
  { text: 'Zakkay bir vergi toplayıcısıydı.', reference: 'Luka 19', isTrue: true },
  { text: 'İsa 40 gün çölde oruç tuttu.', reference: 'Matta 4:2', isTrue: true },
  { text: "Pentekost Paskalya'dan 40 gün sonra gelir.", reference: 'Elçilerin İşleri 2', isTrue: false },
  { text: "Barnaba Pavlus'un ilk misyoner yolculuğundaki arkadaşıydı.", reference: 'Elçilerin İşleri 13', isTrue: true },
  { text: 'Markos İncili en uzun İncil’dir.', reference: 'Yeni Ahit', isTrue: false },
  { text: "İsa Beytlehem'de doğdu.", reference: 'Matta 2:1', isTrue: true },
  { text: "Yuhanna vaftizci İsa'nın kuzeni olarak bilinir.", reference: 'Luka 1', isTrue: true },
  { text: "Elçilerin İşleri kitabının yazarı Pavlus'tur.", reference: 'Elçilerin İşleri 1:1', isTrue: false },
  { text: "İsa'nın 12 havarisi vardı.", reference: 'Markos 3:14', isTrue: true },
  { text: 'Vahiy kitabı Pavlus tarafından yazıldı.', reference: 'Vahiy 1:1', isTrue: false },
  { text: "Nuh'un gemisinde her hayvandan ikişer tane vardı.", reference: 'Yaratılış 7', isTrue: true },
  { text: "İlyas ateşli araba ile göğe alındı.", reference: '2. Krallar 2', isTrue: true },
  { text: 'Yunus balinanın içinde 7 gün kaldı.', reference: 'Yunus 1:17', isTrue: false },
  { text: 'Süleyman tapınağı inşa etti.', reference: '1. Krallar 6', isTrue: true },
  { text: 'Musa Vaat Edilen Topraklara girdi.', reference: 'Yasa’nın Tekrarı 34', isTrue: false },
  { text: 'Timoteos, Pavlus’un öğrencilerinden biriydi.', reference: '1. Timoteos 1:2', isTrue: true },
  { text: "Yakup mektubunu Petrus'a yazdı.", reference: 'Yakup 1:1', isTrue: false },
];

function pickStatements(): Statement[] {
  return pickDailyItems(ALL_STATEMENTS, 10, GAME_ID);
}

export default function TrueFalse() {
  const { colors, fonts } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [statements, setStatements] = useState<Statement[]>(() => pickStatements());
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const { submitScore } = useLeaderboard(GAME_ID);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const totalQuestions = statements.length;
  const current = statements[currentIndex];

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STREAK_KEY);
        const val = raw ? parseInt(raw, 10) : 0;
        setStreak(Number.isNaN(val) ? 0 : Math.max(0, val));
      } catch {
        setStreak(0);
      }
    })();
  }, []);

  const advance = async (answeredCorrect: boolean) => {
    const isLast = currentIndex >= totalQuestions - 1;
    if (isLast) {
      const finalScore = answeredCorrect ? score + 1 : score;
      const nextStreak = finalScore >= 8 ? streak + 1 : 0;
      try {
        await AsyncStorage.setItem(STREAK_KEY, String(nextStreak));
      } catch {
        // ignore persistence failure
      }
      setStreak(nextStreak);
      await markGameCompletedToday(GAME_ID);
      trackEvent('game_completed', { game_id: GAME_ID });
      void submitScore(finalScore);
      setGameOver(true);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setFeedbackText(null);
    setLocked(false);
    flashAnim.setValue(0);
  };

  const onAnswer = (answer: boolean) => {
    if (!current || locked) return;
    setLocked(true);
    setSelectedAnswer(answer);

    const correct = answer === current.isTrue;
    if (correct) {
      setScore((s) => s + 1);
      setFeedbackText('✓ Doğru!');
    } else {
      setFeedbackText('✗ Yanlış');
    }

    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 220, useNativeDriver: false }),
    ]).start();

    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      void advance(correct);
    }, 800);
  };

  const onReplay = () => {
    setStatements(pickStatements());
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setGameOver(false);
    setFeedbackText(null);
    setLocked(false);
    flashAnim.setValue(0);
  };

  const resultMeta = useMemo(() => {
    if (score >= 8) return { text: 'Mükemmel! 🎉', icon: 'trophy-outline' as const, color: SUCCESS };
    if (score >= 5) return { text: 'İyi iş! 💪', icon: 'thumbs-up-outline' as const, color: ACCENT };
    return { text: 'Tekrar dene!', icon: 'refresh-outline' as const, color: DANGER };
  }, [score]);

  const cardFlashColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      colors.card,
      selectedAnswer == null
        ? colors.card
        : selectedAnswer === current?.isTrue
          ? `${SUCCESS}20`
          : `${DANGER}20`,
    ],
  });

  if (!current) return null;

  return (
    <GameShell
      gameId={GAME_ID}
      title="Doğru mu Yanlış mı?"
      leaderboardTitle="Doğru mu Yanlış mı? — Liderlik"
      streak={streak}
      currentIndex={currentIndex}
      totalQuestions={totalQuestions}
      gameOver={gameOver}
      score={score}
      resultMeta={resultMeta}
      onReplay={onReplay}
    >
      <Animated.View style={[styles.card, { backgroundColor: cardFlashColor }]}>
        <Text style={[styles.questionMeta, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          Soru {currentIndex + 1}/{totalQuestions}
        </Text>
        <Text style={[styles.statementText, { color: colors.text, fontFamily: fonts.regular }]}>
          {current.text}
        </Text>
        <Text style={[styles.reference, { color: ACCENT, fontFamily: fonts.italic ?? fonts.regular }]}>
          {current.reference}
        </Text>

        {feedbackText ? (
          <Text
            style={[
              styles.feedback,
              {
                color: selectedAnswer === current.isTrue ? SUCCESS : DANGER,
                fontFamily: fonts.regular,
              },
            ]}
          >
            {feedbackText}
          </Text>
        ) : null}
        {feedbackText && selectedAnswer !== current.isTrue ? (
          <Text style={[styles.correctInfo, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Doğru cevap: {current.isTrue ? 'Doğru' : 'Yanlış'}
          </Text>
        ) : null}
      </Animated.View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.decisionBtn, styles.falseBtn]}
          onPress={() => onAnswer(false)}
          activeOpacity={0.9}
          disabled={locked}
        >
          <Ionicons name="close-circle-outline" size={22} color={DANGER} />
          <Text style={[styles.decisionText, { color: DANGER, fontFamily: fonts.regular }]}>YANLIŞ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.decisionBtn, styles.trueBtn]}
          onPress={() => onAnswer(true)}
          activeOpacity={0.9}
          disabled={locked}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color={SUCCESS} />
          <Text style={[styles.decisionText, { color: SUCCESS, fontFamily: fonts.regular }]}>DOĞRU</Text>
        </TouchableOpacity>
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 28,
    margin: 16,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMeta: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  statementText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  reference: {
    marginTop: 16,
    fontSize: 13,
    textAlign: 'center',
  },
  feedback: {
    marginTop: 16,
    fontSize: 18,
  },
  correctInfo: {
    marginTop: 4,
    fontSize: 13,
  },
  row: {
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  decisionBtn: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  falseBtn: {
    borderColor: '#E5737360',
    backgroundColor: '#E5737315',
  },
  trueBtn: {
    borderColor: '#4CAF5060',
    backgroundColor: '#4CAF5015',
  },
  decisionText: { fontSize: 15 },
});

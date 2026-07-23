import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  return [...ALL_STATEMENTS].sort(() => Math.random() - 0.5).slice(0, 10);
}

export default function TrueFalse() {
  const router = useRouter();
  const safeBack = useSafeBack();
  const { colors, fonts } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [statements, setStatements] = useState<Statement[]>(() => pickStatements());
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const { submitScore } = useLeaderboard(GAME_ID);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const totalQuestions = statements.length;
  const current = statements[currentIndex];
  const progress = totalQuestions > 0 ? (currentIndex + 1) / totalQuestions : 0;

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

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

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
    progressAnim.setValue(0);
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => safeBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.regular }]}>Doğru mu Yanlış mı?</Text>
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
            <TouchableOpacity style={styles.nextBtn} onPress={onReplay} activeOpacity={0.9}>
              <Text style={[styles.nextBtnText, { fontFamily: fonts.regular }]}>Tekrar Oyna</Text>
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
        title="Doğru mu Yanlış mı? — Liderlik"
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
  resultCard: {
    borderRadius: 20,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    gap: 12,
  },
  resultTitle: { fontSize: 24, textAlign: 'center' },
  resultScore: { fontSize: 18 },
  nextBtn: {
    width: '100%',
    marginTop: 10,
    backgroundColor: ACCENT,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFF8EE', fontSize: 15 },
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

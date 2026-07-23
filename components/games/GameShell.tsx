import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useSafeBack } from '@/hooks/useSafeBack';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { GameLeaderboardModal } from '@/components/GameLeaderboardModal';

const ACCENT = '#C4956A';

export type GameResultMeta = {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export type GameShellProps = {
  gameId: string;
  title: string;
  leaderboardTitle: string;
  streak: number;
  currentIndex: number;
  totalQuestions: number;
  gameOver: boolean;
  score: number;
  resultMeta: GameResultMeta;
  /** Result kartında puan ile "Tekrar Oyna" butonu arasına eklenecek opsiyonel içerik (örn. missing-word'deki günlük ipucu). */
  resultExtra?: ReactNode;
  /**
   * "Tekrar Oyna" butonunun genişlik/margin düzeni oyundan oyuna küçük farklar içeriyor
   * (bazıları width:'100%', who-said marginHorizontal kullanıyor) — görsel farkı korumak için
   * her oyun kendi orijinal düzenini geçirebilir. Verilmezse true-false/who-said'in ortak
   * varsayılanı kullanılır.
   */
  replayButtonLayout?: StyleProp<ViewStyle>;
  onReplay: () => void;
  /** Soru aşamasında (gameOver=false) gösterilecek, oyuna özgü kart + cevap alanı. */
  children: ReactNode;
};

const DEFAULT_REPLAY_LAYOUT: ViewStyle = { width: '100%', marginTop: 10 };

export function GameShell({
  gameId,
  title,
  leaderboardTitle,
  streak,
  currentIndex,
  totalQuestions,
  gameOver,
  score,
  resultMeta,
  resultExtra,
  replayButtonLayout,
  onReplay,
  children,
}: GameShellProps) {
  const router = useRouter();
  const safeBack = useSafeBack();
  const { colors, fonts } = useTheme();
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progress = totalQuestions > 0 ? (currentIndex + 1) / totalQuestions : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => safeBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.regular }]}>{title}</Text>
        <View style={[styles.streakBadge, { backgroundColor: `${ACCENT}20` }]}>
          <Ionicons name="flame-outline" size={14} color={ACCENT} />
          <AnimatedCounter
            value={streak}
            style={[styles.streakText, { color: ACCENT, fontFamily: fonts.regular }]}
          />
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
          children
        ) : (
          <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
            <Ionicons name={resultMeta.icon} size={48} color={resultMeta.color} />
            <Text style={[styles.resultTitle, { color: resultMeta.color, fontFamily: fonts.regular }]}>
              {resultMeta.text}
            </Text>
            <Text style={[styles.resultScore, { color: colors.text, fontFamily: fonts.regular }]}>
              Puan: {score} / {totalQuestions}
            </Text>
            {resultExtra}
            <TouchableOpacity
              style={[styles.nextBtnCommon, replayButtonLayout ?? DEFAULT_REPLAY_LAYOUT]}
              onPress={onReplay}
              activeOpacity={0.9}
            >
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
        gameId={gameId}
        title={leaderboardTitle}
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
  resultCard: {
    borderRadius: 20,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    gap: 12,
  },
  resultTitle: { fontSize: 24, textAlign: 'center' },
  resultScore: { fontSize: 18 },
  nextBtnCommon: {
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

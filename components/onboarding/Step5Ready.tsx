import { fonts } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { OB } from './onboardingPalette';

const { width: WIDTH, height: HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#C4956A', '#E8D5B0', '#D4A47A'];
const SUMMARY: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'book-outline', text: 'Tüm Yeni Ahit Türkçe' },
  { icon: 'heart-outline', text: 'Nasılsın? AI duygu analizi' },
  { icon: 'game-controller-outline', text: 'Günlük oyunlar ve ezberleme' },
  { icon: 'map-outline', text: 'Anadolu haritası — 12 kutsal yer' },
  { icon: 'musical-notes-outline', text: '8 ortam müziği' },
  { icon: 'language-outline', text: '7 dil desteği' },
];

function ConfettiPiece({
  delay,
  color,
  x,
  duration,
  rotateEnd,
}: {
  delay: number;
  color: string;
  x: number;
  duration: number;
  rotateEnd: number;
}) {
  const y = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(y, {
        toValue: HEIGHT + 20,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: rotateEnd,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration * 0.7,
        delay: delay + duration * 0.3,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [y, rotate, opacity, delay, duration, rotateEnd]);

  const rotateStr = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: x,
          backgroundColor: color,
          transform: [{ translateY: y }, { rotate: rotateStr }],
          opacity,
        },
      ]}
    />
  );
}

type Props = {
  userName: string;
  onFinish: () => void;
  confettiStarted: boolean;
  hideFooter?: () => void;
};

export function Step5Ready({
  userName,
  onFinish,
  confettiStarted,
  hideFooter,
}: Props) {
  const haptics = useHaptics();
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    hideFooter?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca ilk mount
  }, []);
  const confettiData = useMemo(
    () =>
      confettiStarted
        ? Array.from({ length: 20 }, () => ({
            delay: Math.random() * 400,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            x: Math.random() * WIDTH,
            duration: 2500 + Math.random() * 1000,
            rotateEnd: Math.random(),
          }))
        : [],
    [confettiStarted]
  );
  const line1Opacity = useRef(new Animated.Value(0)).current;
  const line1Y = useRef(new Animated.Value(20)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;
  const line2Y = useRef(new Animated.Value(20)).current;
  const bulletsOpacity = useRef(SUMMARY.map(() => new Animated.Value(0))).current;
  const bulletsY = useRef(SUMMARY.map(() => new Animated.Value(16))).current;

  useEffect(() => {
    if (!confettiStarted) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [confettiStarted]);

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [checkScale]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(line1Y, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(line1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [line1Y, line1Opacity]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(line2Y, { toValue: 0, duration: 400, delay: 150, useNativeDriver: true }),
      Animated.timing(line2Opacity, { toValue: 1, duration: 400, delay: 150, useNativeDriver: true }),
    ]).start();
  }, [line2Y, line2Opacity]);

  useEffect(() => {
    bulletsOpacity.forEach((op, i) => {
      Animated.timing(op, {
        toValue: 1,
        duration: 350,
        delay: 400 + i * 120,
        useNativeDriver: true,
      }).start();
    });
    bulletsY.forEach((y, i) => {
      Animated.timing(y, {
        toValue: 0,
        duration: 350,
        delay: 400 + i * 120,
        useNativeDriver: true,
      }).start();
    });
  }, [bulletsOpacity, bulletsY]);

  const handleFinish = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    haptics.success();
    onFinish();
  };

  const displayName = userName.trim() || 'Sen';

  return (
    <View style={styles.container}>
      {confettiData.map((d, i) => (
        <ConfettiPiece
          key={i}
          delay={d.delay}
          color={d.color}
          x={d.x}
          duration={d.duration}
          rotateEnd={d.rotateEnd}
        />
      ))}
      <View style={styles.content}>
        <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
          <Ionicons name="checkmark-circle" size={80} color={OB.accent} />
        </Animated.View>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: line1Opacity,
              transform: [{ translateY: line1Y }],
            },
          ]}
        >
          {displayName}, hoş geldin!
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: line2Opacity,
              transform: [{ translateY: line2Y }],
            },
          ]}
        >
          Söz senin için hazır.
        </Animated.Text>
        <View style={styles.summaryList}>
          {SUMMARY.map((item, i) => (
            <Animated.View
              key={item.text}
              style={[
                styles.summaryItem,
                {
                  opacity: bulletsOpacity[i],
                  transform: [{ translateY: bulletsY[i] }],
                },
              ]}
            >
              <View style={styles.summaryIconWrap}>
                <Ionicons name={item.icon} size={15} color={OB.accent} />
              </View>
              <Text style={styles.summaryText}>{item.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
      <View style={[styles.step5Footer, { borderTopColor: OB.border }]}>
        <TouchableOpacity
          style={styles.finishBtn}
          onPress={handleFinish}
          activeOpacity={0.88}
        >
          <Text style={styles.finishBtnText}>Söz'ü Aç</Text>
          <Ionicons name="checkmark" size={18} color="#3E2A1C" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 0,
    position: 'relative',
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
    top: 0,
  },
  checkWrap: {
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 28,
    color: OB.title,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.italic,
    fontSize: 18,
    color: OB.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  bullets: {
    alignSelf: 'stretch',
    gap: 12,
  },
  summaryList: {
    alignSelf: 'stretch',
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletIcon: {
    marginRight: 10,
  },
  bulletText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: OB.body,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  summaryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(196,149,80,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: OB.body,
    fontFamily: fonts.regular,
    flex: 1,
  },
  step5Footer: {
    position: 'absolute',
    left: -24,
    right: -24,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: OB.accent,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: OB.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255,220,160,0.35)',
  },
  finishBtnText: {
    fontSize: 17,
    color: '#3E2A1C',
    fontFamily: fonts.medium ?? fonts.regular,
  },
});

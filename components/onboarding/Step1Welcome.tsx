import { fonts } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { OB } from './onboardingPalette';

type Props = {
  onNext: () => void;
  hideFooter?: boolean;
};

function SozLogo({ size = 80 }: { size?: number }) {
  const s = size / 80;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M27 11 C27 11 13 11 13 20 C13 29 27 29 27 29"
        stroke={OB.accent}
        strokeWidth={1.8 * s}
        strokeLinecap="round"
      />
      <Line x1="13" y1="11" x2="27" y2="11" stroke={OB.accent} strokeWidth={1.8 * s} strokeLinecap="round" />
      <Line x1="13" y1="29" x2="27" y2="29" stroke={OB.accent} strokeWidth={1.8 * s} strokeLinecap="round" />
      <Circle cx="20" cy="20" r={2 * s} fill={OB.accent} />
    </Svg>
  );
}

export function Step1Welcome({ onNext, hideFooter }: Props) {
  const haptics = useHaptics();
  const logoScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const verseY = useRef(new Animated.Value(24)).current;
  const verseOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(24)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spring = Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    });
    spring.start();
    return () => spring.stop();
  }, [logoScale]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowOpacity]);

  useEffect(() => {
    const t1 = Animated.timing(titleY, { toValue: 0, duration: 400, useNativeDriver: true });
    const t2 = Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true });
    Animated.parallel([
      Animated.sequence([Animated.delay(120), t1]),
      Animated.sequence([Animated.delay(120), t2]),
    ]).start();
  }, [titleY, titleOpacity]);

  useEffect(() => {
    const s1 = Animated.timing(subtitleY, { toValue: 0, duration: 350, useNativeDriver: true });
    const s2 = Animated.timing(subtitleOpacity, { toValue: 1, duration: 350, useNativeDriver: true });
    Animated.parallel([
      Animated.sequence([Animated.delay(260), s1]),
      Animated.sequence([Animated.delay(260), s2]),
    ]).start();
  }, [subtitleY, subtitleOpacity]);

  useEffect(() => {
    const v1 = Animated.timing(verseY, { toValue: 0, duration: 350, useNativeDriver: true });
    const v2 = Animated.timing(verseOpacity, { toValue: 1, duration: 350, useNativeDriver: true });
    Animated.parallel([
      Animated.sequence([Animated.delay(380), v1]),
      Animated.sequence([Animated.delay(380), v2]),
    ]).start();
  }, [verseY, verseOpacity]);

  useEffect(() => {
    const b1 = Animated.timing(btnY, { toValue: 0, duration: 350, useNativeDriver: true });
    const b2 = Animated.timing(btnOpacity, { toValue: 1, duration: 350, useNativeDriver: true });
    Animated.parallel([
      Animated.sequence([Animated.delay(460), b1]),
      Animated.sequence([Animated.delay(460), b2]),
    ]).start();
  }, [btnY, btnOpacity]);

  const handlePress = () => {
    haptics.medium();
    onNext();
  };

  return (
    <View style={[styles.container, hideFooter && styles.containerNoFooter]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
          <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
          <SozLogo size={80} />
        </Animated.View>
        <Animated.Text
          style={[
            styles.title,
            {
              transform: [{ translateY: titleY }],
              opacity: titleOpacity,
            }]}
        >
          Söz
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subtitle,
            {
              transform: [{ translateY: subtitleY }],
              opacity: subtitleOpacity,
            }]}
        >
          Türkçe İncil
        </Animated.Text>
        <Animated.View style={[styles.verseWrap, { transform: [{ translateY: verseY }], opacity: verseOpacity }]}>
          <Text style={styles.verse}>Başlangıçta Söz vardı.</Text>
          <Text style={styles.verseRef}>— Yuhanna 1:1</Text>
        </Animated.View>
      </View>
      {!hideFooter ? (
        <Animated.View style={[styles.footer, { transform: [{ translateY: btnY }], opacity: btnOpacity }]}>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handlePress}
          >
            <Text style={styles.btnText}>Başlayalım</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  containerNoFooter: {
    paddingBottom: 0,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(196,149,80,0.3)',
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 56,
    color: OB.title,
    letterSpacing: -0.02 * 56,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: OB.accent,
    letterSpacing: 0.3 * 14,
    marginBottom: 32,
  },
  verseWrap: {
    alignItems: 'center',
  },
  verse: {
    fontFamily: fonts.italic,
    fontSize: 17,
    fontStyle: 'italic',
    color: OB.body,
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: 0.01,
    marginBottom: 4,
  },
  verseRef: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: OB.accent,
    letterSpacing: 0.08,
    marginTop: 8,
  },
  footer: {
    paddingTop: 24,
  },
  btn: {
    backgroundColor: OB.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: OB.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,220,160,0.4)',
  },
  btnPressed: {
    opacity: 0.9,
  },
  btnText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: '#3E2A1C',
    letterSpacing: 0.02,
  },
});

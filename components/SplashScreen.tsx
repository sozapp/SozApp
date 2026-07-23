import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet, AccessibilityInfo } from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { fonts } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const { width, height } = Dimensions.get('window');

export default function SozSplashScreen({ onFinish }: { onFinish: () => void }) {
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    let finished = false;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      if (finished) return;
      finished = true;
      onFinishRef.current();
    };

    const runReduced = () => {
      logoScale.setValue(1);
      logoOpacity.setValue(1);
      glowScale.setValue(1);
      glowOpacity.setValue(1);
      titleOpacity.setValue(1);
      titleY.setValue(0);
      subtitleOpacity.setValue(1);
      lineWidth.setValue(60);
      timers.push(
        setTimeout(() => {
          Animated.timing(exitOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start(({ finished: animFinished }) => {
            if (animFinished) finish();
          });
        }, 250)
      );
      timers.push(setTimeout(finish, 700));
    };

    const runFull = () => {
      // Logo spring — 100ms
      timers.push(
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(logoScale, {
              toValue: 1,
              tension: 60,
              friction: 7,
              useNativeDriver: false,
            }),
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start();
        }, 100)
      );

      // Glow — 300ms
      timers.push(
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(glowOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: false,
            }),
            Animated.spring(glowScale, {
              toValue: 1,
              tension: 40,
              friction: 8,
              useNativeDriver: false,
            }),
          ]).start();
        }, 300)
      );

      // Başlık — 500ms
      timers.push(
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(titleOpacity, {
              toValue: 1,
              duration: 350,
              useNativeDriver: false,
            }),
            Animated.timing(titleY, {
              toValue: 0,
              duration: 350,
              useNativeDriver: false,
            }),
          ]).start();
        }, 500)
      );

      // Çizgi — 750ms (useNativeDriver:false çünkü width non-transform)
      timers.push(
        setTimeout(() => {
          Animated.timing(lineWidth, {
            toValue: 60,
            duration: 400,
            useNativeDriver: false,
          }).start();
        }, 750)
      );

      // Alt yazı — 900ms
      timers.push(
        setTimeout(() => {
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: false,
          }).start();
        }, 900)
      );

      // Çıkış — 1900ms
      timers.push(
        setTimeout(() => {
          Animated.timing(exitOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }).start(({ finished: animFinished }) => {
            if (animFinished) finish();
          });
        }, 1900)
      );

      // Animasyon callback kaçsa bile splash ekranı asla takılı kalmasın
      timers.push(setTimeout(finish, 2800));
    };

    // OS ayarını bekleyerek başlat — ilk frame'de false default ile full anim başlamasın
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      if (enabled || reduceMotionRef.current) runReduced();
      else runFull();
    });

    return () => {
      cancelled = true;
      finished = true;
      timers.forEach(clearTimeout);
    };
    // Mount'ta bir kez: OS Promise + o anki reduceMotion; yeniden başlatma yok
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      {/* Glow halka */}
      <Animated.View
        style={[
          styles.glow,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoBox}>
          <Svg width={52} height={52} viewBox="0 0 40 40" fill="none">
            <Line
              x1="13" y1="11" x2="27" y2="11"
              stroke="#C4956A" strokeWidth="1.8" strokeLinecap="round"
            />
            <Path
              d="M27 11C27 11 13 11 13 20C13 29 27 29 27 29"
              stroke="#C4956A" strokeWidth="1.8" strokeLinecap="round" fill="none"
            />
            <Line
              x1="13" y1="29" x2="27" y2="29"
              stroke="#C4956A" strokeWidth="1.8" strokeLinecap="round"
            />
            <Circle cx="20" cy="20" r="2" fill="#C4956A" />
          </Svg>
        </View>
      </Animated.View>

      {/* Söz başlığı */}
      <Animated.Text
        style={[
          styles.title,
          { opacity: titleOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        Söz
      </Animated.Text>

      {/* İnce çizgi */}
      <Animated.View style={[styles.line, { width: lineWidth }]} />

      {/* Alt yazı */}
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Türkçe İncil
      </Animated.Text>

      {/* En alt — küçük ayet */}
      <Animated.Text style={[styles.verse, { opacity: subtitleOpacity }]}>
        "Başlangıçta Söz vardı." — Yuhanna 1:1
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: '#0A0A08',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(196,149,80,0.07)',
    shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 80,
    elevation: 20,
  },
  logoWrap: {
    marginBottom: 24,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: '#111109',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 64,
    color: '#E8E0D0',
    fontFamily: fonts.thin,
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  line: {
    height: 0.5,
    backgroundColor: '#C4956A',
    opacity: 0.5,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#C4956A',
    fontFamily: fonts.italic,
    letterSpacing: 0.15,
    marginBottom: 60,
  },
  verse: {
    position: 'absolute',
    bottom: 60,
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(232,224,208,0.3)',
    fontFamily: fonts.italic,
    letterSpacing: 0.05,
    paddingHorizontal: 40,
    textAlign: 'center',
    left: 0,
    right: 0,
  },
});

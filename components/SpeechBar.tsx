import { useSpeech } from '@/context/SpeechContext';
import { fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

function PlayingDots() {
  const bars = useRef([0, 1, 2].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const loops = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(v, { toValue: 1, duration: 340, easing: Easing.linear, useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.35, duration: 340, easing: Easing.linear, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [bars]);

  return (
    <View style={styles.dotsRow}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
      ))}
    </View>
  );
}

/** Sesli okuma çalarken uygulamanın her sekmesinde görünen kalıcı durdurma barı. */
export function SpeechBar() {
  const { isSpeaking, stop } = useSpeech();
  const insets = useSafeAreaInsets();

  if (!isSpeaking) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.left}>
          <PlayingDots />
          <Text style={styles.label}>Bölüm okunuyor</Text>
        </View>
        <Pressable onPress={stop} style={styles.stopBtn} hitSlop={8}>
          <Ionicons name="stop-circle" size={18} color={ACCENT} />
          <Text style={styles.stopText}>Durdur</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(196,149,80,0.1)',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,149,80,0.25)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACCENT,
  },
  label: {
    fontFamily: fonts.italic,
    fontSize: 12.5,
    color: ACCENT,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  stopText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: ACCENT,
  },
});

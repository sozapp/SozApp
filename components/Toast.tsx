import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const TOAST_ACCENT = 'rgba(196,149,80,0.15)';
const TOAST_BORDER = 'rgba(196,149,80,0.4)';

export type ToastProps = {
  message: string;
  visible: boolean;
  onHide: () => void;
};

const DURATION_MS = 2000;

export function Toast({ message, visible, onHide }: ToastProps) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(-20);
      opacity.setValue(0);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        onHide();
      });
    }, DURATION_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible, onHide, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.card}>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    backgroundColor: TOAST_ACCENT,
    borderWidth: 0.5,
    borderColor: TOAST_BORDER,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    color: '#C4956A',
    textAlign: 'center',
  },
});

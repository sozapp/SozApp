import { useTheme } from '@/hooks/useTheme';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

export type UndoToastProps = {
  visible: boolean;
  message: string;
  undoLabel: string;
  onUndo: () => void;
};

/** Ekranın altında kısa ömürlü snackbar: mesaj + Geri Al. */
export function UndoToast({ visible, message, undoLabel, onUndo }: UndoToastProps) {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }
    translateY.setValue(80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 12) + 8,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[styles.message, { color: colors.text, fontFamily: fonts.regular }]}
          numberOfLines={2}
        >
          {message}
        </Text>
        <Pressable
          onPress={onUndo}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={undoLabel}
          style={styles.undoBtn}
        >
          <Text style={[styles.undoText, { fontFamily: fonts.medium }]}>
            {undoLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10000,
    elevation: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  message: {
    flex: 1,
    fontSize: 14,
  },
  undoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  undoText: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '600',
  },
});

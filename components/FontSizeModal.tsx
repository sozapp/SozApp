import { fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type FontSizeModalProps = {
  visible: boolean;
  onClose: () => void;
  currentSize: number;
  onSelect: (size: number) => void;
  sizes?: readonly number[];
};

const DEFAULT_SIZES = [14, 16, 18, 20, 22] as const;

const SHEET_MAX = 380;

export function FontSizeModal({
  visible,
  onClose,
  currentSize,
  onSelect,
  sizes = DEFAULT_SIZES,
}: FontSizeModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SHEET_MAX)).current;
  const closingRef = useRef(false);

  const labels: Record<number, string> = useMemo(
    () => ({
      14: t('fontSizeSmall'),
      16: t('fontSizeComfortable'),
      18: t('fontSizeNormal'),
      20: t('fontSizeLarge'),
      22: t('fontSizeLargest'),
    }),
    [t]
  );

  const runClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(slideAnim, {
      toValue: SHEET_MAX,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      closingRef.current = false;
      onClose();
    });
  }, [onClose, slideAnim]);

  const handleClose = useCallback(() => runClose(), [runClose]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      slideAnim.setValue(SHEET_MAX);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dx) < 30,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, SHEET_MAX],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="none" />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: '#C4956A' }]}>{t('fontSize').toUpperCase()}</Text>
          <View style={styles.row}>
            {sizes.map((size) => {
              const selected = currentSize === size;
              return (
                <Pressable
                  key={size}
                  onPress={() => {
                    onSelect(size);
                    try {
                      Haptics.selectionAsync();
                    } catch {
                      /* ignore */
                    }
                    handleClose();
                  }}
                  style={styles.sizeCol}
                >
                  <Animated.View
                    style={[
                      styles.sizeCircle,
                      selected && styles.sizeCircleSelected,
                      { transform: [{ scale: selected ? 1.1 : 1 }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.previewText,
                        { fontSize: size, color: colors.text },
                      ]}
                    >
                      Söz
                    </Text>
                  </Animated.View>
                  <Text
                    style={[
                      styles.sizeLabel,
                      { color: selected ? '#C4956A' : colors.textMuted },
                    ]}
                  >
                    {labels[size] ?? `${size}px`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: fonts.medium,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  sizeCol: {
    alignItems: 'center',
    minWidth: 56,
  },
  sizeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sizeCircleSelected: {
    borderWidth: 2,
    borderColor: '#C4956A',
    backgroundColor: 'rgba(196,149,80,0.08)',
  },
  previewText: {
    fontFamily: fonts.italic,
    fontStyle: 'italic',
  },
  sizeLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
});

import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type ReadingOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onTheme: () => void;
  onSpacing: () => void;
  onFont: () => void;
};

const SHEET_MAX = 280;

export function ReadingOptionsSheet({
  visible,
  onClose,
  onTheme,
  onSpacing,
  onFont,
}: ReadingOptionsSheetProps) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(SHEET_MAX)).current;
  const closingRef = useRef(false);

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

  const pick = (fn: () => void) => {
    runClose();
    setTimeout(fn, 260);
  };

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
          <Text style={[styles.title, { color: colors.textMuted }]}>Okuma ayarları</Text>
          <Pressable
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => pick(onTheme)}
          >
            <Ionicons name="contrast-outline" size={22} color="#C4956A" />
            <Text style={[styles.rowText, { color: colors.text }]}>Okuma teması</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => pick(onSpacing)}
          >
            <Ionicons name="reorder-four-outline" size={22} color="#C4956A" />
            <Text style={[styles.rowText, { color: colors.text }]}>Satır aralığı</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => pick(onFont)}>
            <Ionicons name="text-outline" size={22} color="#C4956A" />
            <Text style={[styles.rowText, { color: colors.text }]}>Yazı boyutu</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: fonts.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
});

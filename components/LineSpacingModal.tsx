import { fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
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

export type LineSpacingId = 'normal' | 'wide' | 'wider';

export type LineSpacingModalProps = {
  visible: boolean;
  onClose: () => void;
  currentSpacing: LineSpacingId;
  onSelect: (spacing: LineSpacingId) => void;
};

const SHEET_MAX = 420;

const SPACING_LINE_HEIGHTS: Record<LineSpacingId, number> = {
  normal: 1.6,
  wide: 2.0,
  wider: 2.5,
};

export function LineSpacingModal({
  visible,
  onClose,
  currentSpacing,
  onSelect,
}: LineSpacingModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SHEET_MAX)).current;
  const closingRef = useRef(false);

  const spacingOptions: Array<{
    id: LineSpacingId;
    name: string;
    lineHeight: number;
    description: string;
  }> = useMemo(
    () => [
      { id: 'normal', name: t('spacingNormal'), lineHeight: SPACING_LINE_HEIGHTS.normal, description: t('spacingDescNormal') },
      { id: 'wide', name: t('spacingWide'), lineHeight: SPACING_LINE_HEIGHTS.wide, description: t('spacingDescWide') },
      { id: 'wider', name: t('spacingWider'), lineHeight: SPACING_LINE_HEIGHTS.wider, description: t('spacingDescWider') },
    ],
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
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: '#C4956A' }]}>{t('lineSpacing').toUpperCase()}</Text>
          {spacingOptions.map((option) => {
            const selected = currentSpacing === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  onSelect(option.id);
                  try {
                    Haptics.selectionAsync();
                  } catch {
                    /* ignore */
                  }
                  handleClose();
                }}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: selected ? 1.5 : 0.5,
                    borderColor: selected ? '#C4956A' : colors.border,
                  },
                ]}
              >
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionName, { color: colors.text }]}>{option.name}</Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                    {option.description}
                  </Text>
                </View>
                <View style={styles.optionRight}>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#C4956A"
                      style={styles.optionCheck}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 14,
                      fontStyle: 'italic',
                      color: colors.textMuted,
                      lineHeight: 14 * option.lineHeight,
                      fontFamily: fonts.italic,
                    }}
                  >
                    {t('spacingSampleVerse')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
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
    paddingBottom: 36,
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
    marginBottom: 16,
    fontFamily: fonts.medium,
  },
  optionCard: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 10,
    alignItems: 'stretch',
  },
  optionLeft: {
    width: 100,
    marginRight: 12,
    justifyContent: 'center',
  },
  optionName: {
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: fonts.italic,
    marginTop: 4,
  },
  optionRight: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  optionCheck: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
});

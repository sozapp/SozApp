import { fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useTheme, themes, type ThemePaletteId, type ThemeType } from '@/hooks/useTheme';
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
  useColorScheme,
  View,
} from 'react-native';

export type ThemePickerModalProps = {
  visible: boolean;
  onClose: () => void;
};

const SHEET_MAX = 520;
const THEME_OPTIONS: ThemeType[] = ['system', 'day', 'night', 'sepia', 'black'];

export function ThemePickerModal({ visible, onClose }: ThemePickerModalProps) {
  const { activeTheme, changeTheme, colors } = useTheme();
  const systemScheme = useColorScheme();
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SHEET_MAX)).current;
  const closingRef = useRef(false);

  const themeNames: Record<ThemeType, string> = useMemo(
    () => ({
      system: t('themeSystem'),
      day: t('themeDay'),
      night: t('themeNight'),
      sepia: t('themeSepia'),
      black: t('themeBlack'),
    }),
    [t]
  );

  const previewPalette = useCallback(
    (themeId: ThemeType): ThemePaletteId => {
      if (themeId === 'system') return systemScheme === 'dark' ? 'night' : 'day';
      return themeId;
    },
    [systemScheme]
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

  const handleClose = useCallback(() => {
    runClose();
  }, [runClose]);

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
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
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
          <Text style={[styles.title, { color: '#C4956A' }]}>{t('readingTheme').toUpperCase()}</Text>
          <View style={styles.grid}>
            {THEME_OPTIONS.map((themeId) => {
              const thm = themes[previewPalette(themeId)];
              const isActive = activeTheme === themeId;
              return (
                <Pressable
                  key={themeId}
                  onPress={() => {
                    void changeTheme(themeId);
                    try {
                      Haptics.selectionAsync();
                    } catch {
                      /* ignore */
                    }
                    handleClose();
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: thm.background,
                      borderWidth: isActive ? 2 : 0.5,
                      borderColor: isActive ? '#C4956A' : 'rgba(196,149,80,0.2)',
                    },
                  ]}
                >
                  <Text style={styles.cardLabel}>{themeNames[themeId]}</Text>
                  <Text style={[styles.cardSample, { color: thm.text }]}>
                    {t('themeSampleVerse')}
                  </Text>
                  <Text style={styles.cardRef}>{t('themeSampleRef')}</Text>
                  {isActive && (
                    <View style={styles.checkWrap}>
                      <Ionicons name="checkmark" size={12} color="#0A0A08" />
                    </View>
                  )}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fonts.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  card: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
  },
  cardLabel: {
    fontSize: 12,
    letterSpacing: 0.15,
    color: '#C4956A',
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: fonts.medium,
  },
  cardSample: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
    fontFamily: fonts.italic,
  },
  cardRef: {
    fontSize: 11,
    color: '#C4956A',
    marginTop: 6,
    letterSpacing: 0.1,
    fontFamily: fonts.regular,
  },
  checkWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C4956A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

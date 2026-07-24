import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookList, getVerseTextByVerseId } from '@/constants/bible-index';
import { getVerseForDay, getWidgetVersePayload, type DailyVerse } from '@/constants/daily-verse';
import { pickRandomExploreVerse, type ExploreRandomVerse } from '@/constants/explore-random-verses';
import { loadReadHistory } from '@/constants/read-history';
import { buildShareMessage, deepLinkParamsFromVerseId } from '@/constants/share-verse';
import { colors, fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useAmbientMusic } from '@/context/AmbientMusicContext';
import { useTabPulse } from '@/context/TabPulseContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';
const BG = '#0A0A08';
const TEXT = '#E8E0D0';
const MUTED = 'rgba(232,224,208,0.5)';
const BORDER = 'rgba(196,149,80,0.15)';
const BORDER_ACCENT = 'rgba(196,149,80,0.35)';

const DURATIONS = [10, 20, 30, 60] as const;
type VerseSource = 'daily' | 'random' | 'lastRead';

type FocusVerse = {
  text: string;
  ref: string;
  verseId: string | null;
  bookId: string | null;
  chapter: number;
};

const FOCUS_SESSIONS_KEY = '@soz/focusSessions';
const FOCUS_MINUTES_KEY = '@soz/focusMinutes';

async function loadFocusStats(): Promise<{ sessions: number; minutes: number }> {
  try {
    const [s, m] = await Promise.all([
      AsyncStorage.getItem(FOCUS_SESSIONS_KEY),
      AsyncStorage.getItem(FOCUS_MINUTES_KEY),
    ]);
    return {
      sessions: s != null ? Math.max(0, parseInt(s, 10)) : 0,
      minutes: m != null ? Math.max(0, parseInt(m, 10)) : 0,
    };
  } catch {
    return { sessions: 0, minutes: 0 };
  }
}

async function saveFocusComplete(durationMinutes: number): Promise<void> {
  try {
    const { sessions, minutes } = await loadFocusStats();
    await AsyncStorage.setItem(FOCUS_SESSIONS_KEY, String(sessions + 1));
    await AsyncStorage.setItem(FOCUS_MINUTES_KEY, String(minutes + durationMinutes));
  } catch {
    /* ignore */
  }
}

function dailyToFocusVerse(v: DailyVerse): FocusVerse {
  const payload = getWidgetVersePayload(new Date());
  return {
    text: v.text,
    ref: `${v.book} ${v.chapter}:${v.verse}`,
    verseId: `${v.book}-${v.chapter}-${v.verse}`,
    bookId: payload.bookId,
    chapter: v.chapter,
  };
}

function randomToFocusVerse(v: ExploreRandomVerse | null): FocusVerse | null {
  if (!v) return null;
  const bookId = bookList.find((b) => b.name === v.book)?.id ?? null;
  return {
    text: v.text,
    ref: `${v.book} ${v.chapter}:${v.verse}`,
    verseId: v.verseId,
    bookId,
    chapter: v.chapter,
  };
}

async function getLastReadVerse(): Promise<FocusVerse | null> {
  try {
    const history = await loadReadHistory();
    const first = history[0];
    if (!first) return null;
    const verseId = `${first.bookName}-${first.chapter}-1`;
    const text = getVerseTextByVerseId(verseId);
    if (!text) return null;
    return {
      text,
      ref: `${first.bookName} ${first.chapter}:1`,
      verseId,
      bookId: first.bookId,
      chapter: first.chapter,
    };
  } catch {
    return null;
  }
}

function getVerseForSource(source: VerseSource): FocusVerse {
  const daily = getVerseForDay(new Date());
  if (source === 'daily') return dailyToFocusVerse(daily);
  if (source === 'random') {
    const r = pickRandomExploreVerse();
    return randomToFocusVerse(r) ?? dailyToFocusVerse(daily);
  }
  return dailyToFocusVerse(daily);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function makeExitSheetStyles(colors: ThemeColors) {
  return StyleSheet.create({
    modalRoot: {
      flex: 1,
    },
    exitOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    exitSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.2)',
      paddingBottom: 36,
    },
    exitHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    exitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    exitIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(196,149,80,0.1)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitTitleWrap: {
      gap: 3,
    },
    exitTitle: {
      fontSize: 17,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.01,
    },
    exitSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
    },
    exitDivider: {
      height: 0.5,
      backgroundColor: 'rgba(196,149,80,0.1)',
      marginHorizontal: 0,
      marginBottom: 6,
    },
    exitConfirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(196,149,80,0.07)',
    },
    exitConfirmIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(232,100,80,0.08)',
      borderWidth: 0.5,
      borderColor: 'rgba(232,100,80,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitConfirmText: {
      flex: 1,
      gap: 2,
    },
    exitConfirmTitle: {
      fontSize: 15,
      color: 'rgba(232,100,80,0.9)',
      fontFamily: fonts.regular,
    },
    exitConfirmDesc: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
    },
    exitContinueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(196,149,80,0.07)',
    },
    exitContinueIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(196,149,80,0.08)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitContinueTitle: {
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    exitCancelBtn: {
      marginHorizontal: 16,
      marginTop: 10,
      paddingVertical: 14,
      backgroundColor: 'rgba(196,149,80,0.06)',
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.15)',
      alignItems: 'center',
    },
    exitCancelText: {
      fontSize: 15,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
  });
}

export default function FocusScreen() {
  const router = useRouter();
  const safeBack = useSafeBack();
  const { theme } = useTheme();
  const exitSheetStyles = useMemo(() => makeExitSheetStyles(theme), [theme]);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { pulseNotesTab } = useTabPulse();
  const { playTrack, suspendPlayback } = useAmbientMusic();
  const { t } = useTranslation();

  const [phase, setPhase] = useState<'config' | 'active' | 'complete'>('config');
  const [showExitSheet, setShowExitSheet] = useState(false);
  const [duration, setDuration] = useState<number>(20);
  const [verseSource, setVerseSource] = useState<VerseSource>('daily');
  const [verse, setVerse] = useState<FocusVerse | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [completedMinutes, setCompletedMinutes] = useState(0);
  const [lastReadAvailable, setLastReadAvailable] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSecondsRef = useRef(0);
  const timeLeftRef = useRef(0);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const exitSlide = useRef(new Animated.Value(300)).current;
  const exitOverlay = useRef(new Animated.Value(0)).current;

  const totalSeconds = duration * 60;

  const resolveVerse = useCallback(() => {
    if (verseSource === 'lastRead') {
      getLastReadVerse().then((v) => {
        if (v) setVerse(v);
        else setVerse(getVerseForSource('daily'));
      });
    } else {
      setVerse(getVerseForSource(verseSource));
    }
  }, [verseSource]);

  useEffect(() => {
    if (phase !== 'config') return;
    resolveVerse();
  }, [phase, verseSource, resolveVerse]);

  useEffect(() => {
    loadReadHistory().then((h) => setLastReadAvailable(h.length > 0)).catch(() => {});
  }, []);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const track = await AsyncStorage.getItem('@soz/ambientTrack');
          if (!cancelled && track && track !== 'silence') {
            await playTrack(track);
          }
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
        void suspendPlayback();
      };
    }, [playTrack, suspendPlayback])
  );

  useEffect(() => {
    if (phase !== 'active') return;
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, isRunning, timeLeft]);

  useEffect(() => {
    if (phase !== 'active' || totalSecondsRef.current === 0) return;
    const ratio = timeLeft / totalSecondsRef.current;
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 500,
      useNativeDriver: false,
      easing: Easing.linear,
    }).start();
  }, [phase, timeLeft, progressAnim]);

  useEffect(() => {
    if (phase === 'active' && timeLeft === 0) {
      const mins = duration;
      setCompletedMinutes(mins);
      try {
        KeepAwake.deactivateKeepAwake();
      } catch {
        /* ignore */
      }
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      saveFocusComplete(mins).catch(() => {});
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* ignore */
      }
      setPhase('complete');
      Animated.spring(checkScale, {
        toValue: 1,
        useNativeDriver: false,
        friction: 6,
        tension: 80,
      }).start();
    }
  }, [phase, timeLeft, duration]);

  const startFocus = useCallback(() => {
    resolveVerse();
    setTimeLeft(duration * 60);
    totalSecondsRef.current = duration * 60;
    setPhase('active');
    setIsRunning(true);
    progressAnim.setValue(1);
    try {
      KeepAwake.activateKeepAwakeAsync?.();
    } catch {
      try {
        (KeepAwake as { activateKeepAwake?: () => void }).activateKeepAwake?.();
      } catch {
        /* ignore */
      }
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, [duration, resolveVerse, progressAnim]);

  const exitFocus = useCallback(() => {
    try {
      KeepAwake.deactivateKeepAwake?.();
    } catch {
      /* ignore */
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    setPhase('config');
  }, []);

  const openExitSheet = useCallback(() => {
    exitSlide.setValue(300);
    exitOverlay.setValue(0);
    setShowExitSheet(true);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(exitSlide, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: false,
        }),
        Animated.timing(exitOverlay, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [exitSlide, exitOverlay]);

  const closeExitSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(exitSlide, {
        toValue: 300,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(exitOverlay, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => setShowExitSheet(false));
  }, [exitSlide, exitOverlay]);

  const confirmExit = useCallback(() => {
    closeExitSheet();
    setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      void suspendPlayback();
      try {
        KeepAwake.deactivateKeepAwake?.();
      } catch {
        /* ignore */
      }
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      const elapsedSec = Math.max(0, totalSecondsRef.current - timeLeftRef.current);
      const mins = Math.floor(elapsedSec / 60);
      if (mins > 0) {
        void saveFocusComplete(mins);
      }
      safeBack();
    }, 250);
  }, [closeExitSheet, suspendPlayback, router]);

  useEffect(() => {
    if (phase !== 'active') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      openExitSheet();
      return true;
    });
    return () => sub.remove();
  }, [phase, openExitSheet]);

  const circumference = 2 * Math.PI * 85;
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const minutesLeft = Math.floor(timeLeft / 60);
  const secondsLeft = timeLeft % 60;
  const timeStr = `${minutesLeft}:${String(secondsLeft).padStart(2, '0')}`;

  if (phase === 'active') {
    const elapsedMinutes = Math.floor(
      Math.max(0, totalSecondsRef.current - timeLeft) / 60
    );

    return (
      <>
        <View style={styles.activeRoot}>
          <StatusBar hidden />
          <SafeAreaView style={styles.activeSafe} edges={['top']}>
            <View style={styles.activeHeader}>
              <View style={styles.activeHeaderSpacer} />
              <TouchableOpacity
                onPress={openExitSheet}
                style={styles.closeBtnActive}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('close')}
              >
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

          <View style={styles.timerWrap}>
            <Svg width={200} height={200} viewBox="0 0 200 200" style={styles.timerSvg}>
              <Circle
                cx="100"
                cy="100"
                r={85}
                fill="none"
                stroke={BORDER}
                strokeWidth={4}
              />
              <AnimatedCircle
                cx="100"
                cy="100"
                r={85}
                fill="none"
                stroke={ACCENT}
                strokeWidth={4}
                strokeDasharray={String(circumference)}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </Svg>
            <View style={styles.timerOverlay}>
              <Text style={styles.timerText}>{timeStr}</Text>
              <Text style={styles.timerSub}>{t('minutesLeft')}</Text>
            </View>
          </View>

          <Pressable
            style={styles.pauseBtn}
            onPress={() => setIsRunning((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={isRunning ? t('pauseFocus') : t('resumeFocus')}
          >
            <Ionicons name={isRunning ? 'pause' : 'play'} size={28} color={ACCENT} />
          </Pressable>

          {verse && (
            <View style={styles.verseBlock}>
              <Text style={styles.verseText} numberOfLines={8}>
                {verse.text}
              </Text>
              <Text style={styles.verseRef}>{verse.ref}</Text>
              <View style={styles.verseActions}>
                <Pressable
                  style={styles.verseActionBtn}
                  onPress={() => {
                    const verseId = verse.verseId;
                    if (!verseId) return;
                    void (async () => {
                      const added = await toggleFavorite(verseId, verse.text);
                      if (added) pulseNotesTab();
                    })();
                  }}
                >
                  <Ionicons
                    name={verse.verseId && isFavorite(verse.verseId) ? 'heart' : 'heart-outline'}
                    size={18}
                    color={ACCENT}
                  />
                  <Text style={styles.verseActionText}>{t('favorite')}</Text>
                </Pressable>
                <Pressable
                  style={styles.verseActionBtn}
                  onPress={() =>
                    Share.share({
                      message: buildShareMessage(
                        verse.text,
                        verse.ref,
                        verse.verseId ? deepLinkParamsFromVerseId(verse.verseId) : null
                      ),
                      title: t('appName'),
                    }).catch(() => {})
                  }
                >
                  <Ionicons name="share-outline" size={18} color={ACCENT} />
                  <Text style={styles.verseActionText}>{t('share')}</Text>
                </Pressable>
                <Pressable
                  style={styles.verseActionBtn}
                  onPress={() => {
                    if (verse.bookId != null) {
                      exitFocus();
                      router.replace({
                        pathname: '/(tabs)/read',
                        params: { bookId: verse.bookId, chapter: String(verse.chapter) },
                      });
                    }
                  }}
                >
                  <Ionicons name="book-outline" size={18} color={ACCENT} />
                  <Text style={styles.verseActionText}>{t('read')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>

        {showExitSheet && (
          <Modal
            visible={showExitSheet}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={closeExitSheet}
          >
            <View style={exitSheetStyles.modalRoot}>
              <Animated.View style={[exitSheetStyles.exitOverlay, { opacity: exitOverlay }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={closeExitSheet} activeOpacity={1} />
              </Animated.View>

              <Animated.View
                style={[
                  exitSheetStyles.exitSheet,
                  { transform: [{ translateY: exitSlide }] },
                ]}
              >
                <View style={exitSheetStyles.exitHandle} />

                <View style={exitSheetStyles.exitHeader}>
                  <View style={exitSheetStyles.exitIconWrap}>
                    <Ionicons name="moon-outline" size={24} color="#C4956A" />
                  </View>
                  <View style={exitSheetStyles.exitTitleWrap}>
                    <Text style={exitSheetStyles.exitTitle}>{t('exitFocusSheetTitle')}</Text>
                    <Text style={exitSheetStyles.exitSubtitle}>
                      {elapsedMinutes > 0
                        ? t('minutesFocused', { n: elapsedMinutes })
                        : t('justStartedFocus')}
                    </Text>
                  </View>
                </View>

                <View style={exitSheetStyles.exitDivider} />

                <TouchableOpacity
                  style={exitSheetStyles.exitConfirmBtn}
                  onPress={confirmExit}
                  activeOpacity={0.8}
                >
                  <View style={exitSheetStyles.exitConfirmIcon}>
                    <Ionicons name="exit-outline" size={18} color="rgba(232,100,80,0.9)" />
                  </View>
                  <View style={exitSheetStyles.exitConfirmText}>
                    <Text style={exitSheetStyles.exitConfirmTitle}>{t('endFocusTitle')}</Text>
                    <Text style={exitSheetStyles.exitConfirmDesc}>{t('progressWillBeSaved')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={exitSheetStyles.exitContinueBtn}
                  onPress={closeExitSheet}
                  activeOpacity={0.8}
                >
                  <View style={exitSheetStyles.exitContinueIcon}>
                    <Ionicons name="play-outline" size={18} color="#C4956A" />
                  </View>
                  <View style={exitSheetStyles.exitConfirmText}>
                    <Text style={exitSheetStyles.exitContinueTitle}>{t('keepFocusing')}</Text>
                    <Text style={exitSheetStyles.exitConfirmDesc}>{t('resumeFromWhere')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={exitSheetStyles.exitCancelBtn} onPress={closeExitSheet}>
                  <Text style={exitSheetStyles.exitCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        )}
      </>
    );
  }

  if (phase === 'complete') {
    return (
      <View style={styles.completeRoot}>
        <StatusBar hidden />
        <SafeAreaView style={styles.completeSafe} edges={['top']}>
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
            <Ionicons name="checkmark-circle" size={80} color={ACCENT} />
          </Animated.View>
          <Text style={styles.completeTitle}>{t('focusCompleted')}</Text>
          <Text style={styles.completeSub}>
            {completedMinutes} {t('focusMinutes')}
          </Text>
          <View style={styles.completeCards}>
            <View style={styles.completeCard}>
              <Ionicons name="timer-outline" size={28} color="#C4956A" style={styles.completeCardIcon} />
              <Text style={styles.completeCardText}>{t('minutesFocusCard', { n: completedMinutes })}</Text>
            </View>
            {verse && (
              <View style={styles.completeCard}>
                <Ionicons name="book-outline" size={28} color="#C4956A" style={styles.completeCardIcon} />
                <Text style={styles.completeCardText}>{t('withVerseRef', { ref: verse.ref })}</Text>
              </View>
            )}
            <View style={styles.completeCard}>
              <Ionicons name="flame-outline" size={28} color="#C4956A" style={styles.completeCardIcon} />
              <Text style={styles.completeCardText}>{t('streakKept')}</Text>
            </View>
          </View>
          <View style={styles.completeButtons}>
            <Pressable style={styles.completeBtnPrimary} onPress={startFocus}>
              <Text style={styles.completeBtnPrimaryText}>{t('restartFocus')}</Text>
            </Pressable>
            <Pressable
              style={styles.completeBtnSecondary}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.completeBtnSecondaryText}>{t('backHome')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.configRoot}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.configSafe} edges={['top']}>
        <TouchableOpacity
          style={styles.configBackBtn}
          onPress={() => safeBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textMuted} />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={styles.configScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.configHeader}>
            <Ionicons name="moon-outline" size={48} color={ACCENT} />
            <Text style={styles.configTitle}>{t('focusMode')}</Text>
            <Text style={styles.configSub}>{t('focusDesc')}</Text>
          </View>

          <Text style={styles.configLabel}>{t('focusDuration')}</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d}
                style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durationBtnText, duration === d && styles.durationBtnTextActive]}>
                  {t('durationMinutesShort', { n: d })}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.configLabel, { marginTop: 28 }]}>{t('focusVerse')}</Text>
          <Pressable
            style={[styles.verseCard, verseSource === 'daily' && styles.verseCardActive]}
            onPress={() => setVerseSource('daily')}
          >
            <Text style={styles.verseCardTitle}>{t('todayVerse')}</Text>
            <Text style={styles.verseCardHint}>{t('todaySpecialVerse')}</Text>
          </Pressable>
          <Pressable
            style={[styles.verseCard, verseSource === 'random' && styles.verseCardActive]}
            onPress={() => setVerseSource('random')}
          >
            <Text style={styles.verseCardTitle}>{t('randomVerse')}</Text>
            <Text style={styles.verseCardHint}>{t('luckyVerse')}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.verseCard,
              verseSource === 'lastRead' && styles.verseCardActive,
              !lastReadAvailable && styles.verseCardDisabled,
            ]}
            onPress={() => lastReadAvailable && setVerseSource('lastRead')}
            disabled={!lastReadAvailable}
          >
            <Text style={styles.verseCardTitle}>{t('lastRead')}</Text>
            <Text style={styles.verseCardHint}>
              {lastReadAvailable ? t('fromLastChapter') : t('noReadingYet')}
            </Text>
          </Pressable>

          <Pressable style={styles.startBtn} onPress={startFocus}>
            <Ionicons name="play" size={22} color="#0A0A08" />
            <Text style={styles.startBtnText}>{t('startFocus')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  configRoot: { flex: 1, backgroundColor: BG },
  configSafe: { flex: 1 },
  configBackBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, padding: 8 },
  configScroll: { paddingHorizontal: 24, paddingBottom: 48 },
  configHeader: { alignItems: 'center', paddingTop: 32, paddingBottom: 28 },
  configTitle: {
    fontSize: 32,
    fontFamily: fonts.thin,
    color: TEXT,
    marginTop: 16,
  },
  configSub: {
    fontSize: 15,
    fontFamily: fonts.italic,
    color: MUTED,
    marginTop: 8,
  },
  configLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: MUTED,
    marginBottom: 10,
  },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER_ACCENT,
    alignItems: 'center',
  },
  durationBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  durationBtnText: { fontSize: 15, fontFamily: fonts.regular, color: TEXT },
  durationBtnTextActive: { color: '#0A0A08', fontFamily: fonts.medium },
  verseCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    marginBottom: 10,
  },
  verseCardActive: { borderColor: ACCENT },
  verseCardDisabled: { opacity: 0.6 },
  verseCardTitle: { fontSize: 16, fontFamily: fonts.medium, color: TEXT },
  verseCardHint: { fontSize: 13, fontFamily: fonts.regular, color: MUTED, marginTop: 4 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ACCENT,
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
  },
  startBtnText: { fontSize: 17, fontFamily: fonts.medium, color: '#0A0A08' },

  activeRoot: { flex: 1, backgroundColor: BG },
  activeSafe: { flex: 1 },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  activeHeaderSpacer: { width: 32 },
  closeBtnActive: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { padding: 8 },
  timerWrap: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSvg: { position: 'absolute' },
  timerOverlay: { alignItems: 'center' },
  timerText: {
    fontSize: 28,
    fontFamily: fonts.thin,
    color: TEXT,
  },
  timerSub: {
    fontSize: 14,
    fontFamily: fonts.italic,
    color: MUTED,
    marginTop: 6,
  },
  pauseBtn: {
    alignSelf: 'center',
    marginTop: 20,
    padding: 12,
  },
  verseBlock: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 28,
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
  },
  verseText: {
    fontSize: 20,
    fontFamily: fonts.italic,
    color: TEXT,
    lineHeight: 36,
    textAlign: 'center',
  },
  verseRef: {
    fontSize: 13,
    color: ACCENT,
    letterSpacing: 0.15,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
  verseActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  verseActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: BORDER_ACCENT,
    borderRadius: 8,
  },
  verseActionText: { fontSize: 14, fontFamily: fonts.regular, color: ACCENT },

  completeRoot: { flex: 1, backgroundColor: BG },
  completeSafe: { flex: 1, paddingHorizontal: 24 },
  checkWrap: { alignSelf: 'center', marginTop: 48 },
  completeTitle: {
    fontSize: 28,
    fontFamily: fonts.thin,
    color: TEXT,
    textAlign: 'center',
    marginTop: 20,
  },
  completeSub: {
    fontSize: 18,
    fontFamily: fonts.italic,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
  },
  completeCards: { marginTop: 32, gap: 12 },
  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196,149,80,0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  completeCardIcon: { marginRight: 12 },
  completeCardText: { fontSize: 15, fontFamily: fonts.regular, color: TEXT },
  completeButtons: { marginTop: 40, gap: 12 },
  completeBtnPrimary: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  completeBtnPrimaryText: { fontSize: 17, fontFamily: fonts.medium, color: '#0A0A08' },
  completeBtnSecondary: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER_ACCENT,
    borderRadius: 12,
  },
  completeBtnSecondaryText: { fontSize: 16, fontFamily: fonts.regular, color: ACCENT },
});

// Network işlemleri XHR ile yapılır — iOS ATS uyumluluğu için
// (Bu ekranda HTTP fetch kullanılmaz; NetInfo.fetch kaldırıldı — çevrimdışı iken ağ sondası hata verebiliyordu.)
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Share,
  Animated,
  Modal,
  TextInput,
  FlatList,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { useNetwork } from '@/context/NetworkContext';
import { bookList, oldTestamentBooks } from '@/constants/bible-index';
import { newTestament } from '@/constants/new-testament';
import { loadLastRead, type LastReadPayload } from '@/constants/read-history';
import { devotionals, getTodaysDevotional } from '@/constants/devotionals';
import { fonts as appFonts } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import { useTranslation } from '@/context/LanguageContext';
import AmbientMusicModal from '@/components/AmbientMusicModal';
import ShareVerseModal from '@/components/ShareVerseModal';
import { useAmbientMusic } from '@/context/AmbientMusicContext';
import { SozAlert } from '@/components/SozAlert';
import { useSozAlert } from '@/hooks/useSozAlert';

const ACCENT = '#C4956A';
const ACCENT_LIGHT = '#FFF8EE';
const TUTORIAL_SEEN_KEY = '@soz/tutorialSeen';
const STREAK_CARD_DISMISSED_AT_KEY = '@soz/streakCardDismissedAt';
const STREAK_CARD_COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000;

const HOME_TUTORIAL_STEPS = [
  {
    id: 'daily-verse',
    message: 'Günün ayetini buradan oku veya favorile',
    target: 'verse' as const,
  },
  {
    id: 'tab-bar',
    message: '5 ana bölüm — Oku, Keşfet, Notlar, Profil',
    target: 'tabbar' as const,
  },
  {
    id: 'mood-card',
    message: 'Nasıl hissettiğini söyle, sana özel ayet al',
    target: 'mood' as const,
  },
];

type AppFonts = typeof appFonts;

const DEVOTIONAL_BG_IMAGES = [
  require('../../assets/devotional/bg1.jpg'),
  require('../../assets/devotional/bg2.jpg'),
  require('../../assets/devotional/bg3.jpg'),
];

function getDailyVerseBackground() {
  return DEVOTIONAL_BG_IMAGES[new Date().getDate() % DEVOTIONAL_BG_IMAGES.length];
}

function getBookIdByName(bookName: string): string | null {
  const fromNew = bookList.find((b) => b.name === bookName)?.id ?? null;
  if (fromNew) return fromNew;
  return oldTestamentBooks.find((b) => b.name === bookName)?.id ?? null;
}

const DEFAULT_READ_BOOK_ID = 'mat';

function getNtChapterVerseCount(bookName: string, chapterNum: number): number | null {
  const b = newTestament.find((x) => x.name === bookName);
  if (!b) return null;
  const ch = b.chapters.find((c) => c.chapter === chapterNum);
  return ch?.verses.length ?? null;
}

function getBookChapterCount(bookName: string): number | null {
  const nt = newTestament.find((x) => x.name === bookName);
  if (nt) return nt.chapters.length;
  const ot = oldTestamentBooks.find((x) => x.name === bookName);
  if (ot) return ot.chapterCount;
  return null;
}

function parseLastMoodPayload(raw: string | null): { summary: string; hasData: boolean } {
  if (!raw?.trim()) return { summary: '', hasData: false };
  try {
    const o = JSON.parse(raw) as { moods?: unknown; text?: unknown };
    const moods = Array.isArray(o.moods)
      ? o.moods.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
      : [];
    if (moods.length > 0) {
      return { summary: moods.join(', '), hasData: true };
    }
    if (typeof o.text === 'string' && o.text.trim()) {
      const t = o.text.trim();
      return { summary: t.length > 72 ? `${t.slice(0, 72)}…` : t, hasData: true };
    }
    return { summary: '', hasData: false };
  } catch {
    /* legacy düz metin */
    const t = raw.trim();
    return { summary: t.length > 72 ? `${t.slice(0, 72)}…` : t, hasData: true };
  }
}

function formatMoodRecency(iso: string | null): string {
  if (!iso?.trim()) return 'Bugün';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Bugün';
  const now = new Date();
  const sod = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((sod(now) - sod(d)) / 86400000);
  if (diffDays <= 0) return 'bugün';
  if (diffDays === 1) return 'dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function getGreetingBannerContent() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) {
    return {
      title: 'Günaydın',
      subtitle: 'Bugün Söz ile başla',
      icon: 'sunny-outline' as keyof typeof Ionicons.glyphMap,
    };
  }
  if (hour >= 12 && hour <= 17) {
    return {
      title: 'İyi günler',
      subtitle: 'Bir mola ver, bir ayet oku',
      icon: 'partly-sunny-outline' as keyof typeof Ionicons.glyphMap,
    };
  }
  if (hour >= 18 && hour <= 21) {
    return {
      title: 'İyi akşamlar',
      subtitle: "Günü Tanrı'nın Sözü ile tamamla",
      icon: 'moon-outline' as keyof typeof Ionicons.glyphMap,
    };
  }
  return {
    title: 'İyi geceler',
    subtitle: 'Yatmadan önce bir ayet',
    icon: 'moon-outline' as keyof typeof Ionicons.glyphMap,
  };
}

const MusicBar = ({ delay }: { delay: number }) => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        stylesStatic.musicWaveBar,
        { transform: [{ scaleY: anim }] },
      ]}
    />
  );
};

const makeStyles = (colors: ThemeColors, fonts: AppFonts) => {
  const textSecondary = colors.textMuted;
  const card = colors.card;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    stickyHeaderWrap: {
      backgroundColor: colors.background,
    },
    offlineBannerBelow: {
      backgroundColor: '#E5737320',
      borderRadius: 10,
      padding: 8,
      flexDirection: 'row',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      alignItems: 'center',
    },
    offlineTextBelow: {
      fontSize: 13,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    greetingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      gap: 10,
    },
    greetingBannerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    greetingBannerTitle: {
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.medium,
    },
    greetingBannerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      marginTop: 1,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
    },
    greetingPrefix: {
      fontSize: 14,
      color: textSecondary,
      fontFamily: fonts.regular,
      fontWeight: '400',
    },
    greetingName: {
      fontSize: 28,
      fontFamily: fonts.regular,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
      marginTop: 0,
    },
    headerDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    dateText: {
      fontFamily: fonts.italic ?? fonts.regular,
      fontSize: 13,
      color: textSecondary,
      fontStyle: 'italic',
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 6,
    },
    ikonBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInitialCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInitialText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontFamily: fonts.medium,
      fontWeight: '600',
    },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: 'rgba(196,149,80,0.1)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.25)',
    },
    streakText: {
      fontSize: 12,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    streakZeroCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 18,
      borderWidth: 0.5,
      borderColor: `${ACCENT}40`,
      padding: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    streakZeroCloseBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.06)',
      zIndex: 1,
    },
    streakZeroHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingRight: 30,
      marginBottom: 6,
    },
    streakZeroIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: `${ACCENT}22`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakZeroTitle: {
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.medium,
    },
    streakZeroDesc: {
      fontSize: 13,
      color: textSecondary,
      fontFamily: fonts.regular,
      lineHeight: 19,
      marginBottom: 14,
      paddingRight: 16,
    },
    streakZeroBtn: {
      alignSelf: 'flex-start',
      backgroundColor: ACCENT,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 11,
      shadowColor: ACCENT,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    streakZeroBtnText: {
      fontSize: 13.5,
      color: '#FFF8EE',
      fontFamily: fonts.medium,
    },

    scroll: { flex: 1 },
    scrollContent: {
      paddingBottom: 100,
    },

    verseCard: {
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 12,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.3)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    verseBg: {
      minHeight: 200,
      justifyContent: 'flex-end',
    },
    verseBgImage: {
      borderRadius: 18,
      opacity: 0.75,
    },
    verseOverlayGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    verseBlurLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    verseBlurLayerWeb: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(10,10,8,0.45)',
    },
    verseContent: {
      padding: 20,
      paddingTop: 24,
    },
    verseLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 12,
    },
    verseLabelLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    verseLabelDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: ACCENT,
    },
    verseLabel: {
      fontSize: 9,
      letterSpacing: 0.25,
      color: 'rgba(196,149,80,0.9)',
      fontFamily: fonts.regular,
    },
    verseDateLabel: {
      fontSize: 11,
      color: 'rgba(240,232,220,0.55)',
      fontFamily: fonts.regular,
    },
    verseQuoteMark: {
      fontSize: 48,
      color: 'rgba(196,149,80,0.35)',
      lineHeight: 36,
      marginBottom: 4,
      fontFamily: fonts.regular,
    },
    verseText: {
      fontSize: 17,
      color: '#F0E8DC',
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 28,
      marginBottom: 16,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    verseBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 0,
    },
    verseRef: {
      fontSize: 14,
      color: ACCENT,
      fontFamily: fonts.regular,
      letterSpacing: 0.05,
      flex: 1,
    },
    verseDivider: {
      height: 0.5,
      backgroundColor: 'rgba(255,255,255,0.12)',
      marginTop: 16,
      marginBottom: 12,
    },
    verseActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    verseActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
    },
    verseActionText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      fontFamily: fonts.regular,
    },
    actionDivider: {
      width: 1,
      height: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    verseCardFallback: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      overflow: 'hidden',
      borderLeftWidth: 3,
      borderLeftColor: ACCENT,
      minHeight: 200,
    },
    verseCardFallbackDecor: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: 'rgba(196,149,80,0.08)',
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },
    verseTextFallback: {
      color: colors.text,
      textShadowColor: 'transparent',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0,
    },
    verseRefFallback: {
      color: colors.textMuted,
    },
    verseDateLabelFallback: {
      color: colors.textMuted,
    },

    musicCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 10,
    },
    musicIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: 'rgba(196,149,80,0.08)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    musicTextWrap: {
      flex: 1,
      gap: 3,
    },
    musicLabel: {
      fontSize: 8,
      letterSpacing: 0.2,
      color: 'rgba(196,149,80,0.6)',
      fontFamily: fonts.regular,
    },
    musicTrackName: {
      fontSize: 13,
      color: colors.text,
      fontFamily: fonts.regular,
      fontStyle: 'italic',
    },
    musicControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    musicVolBtn: {
      padding: 4,
    },
    musicPlayBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(196,149,80,0.1)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    musicPlayBtnActive: {
      backgroundColor: ACCENT,
    },
    musicWaveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 2,
    },

    planCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    planLabel: {
      fontSize: 9,
      letterSpacing: 0.2,
      color: 'rgba(196,149,80,0.7)',
      fontFamily: fonts.regular,
      marginBottom: 3,
    },
    planTitle: {
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.01,
    },
    planDayBadge: {
      flexDirection: 'row',
      alignItems: 'baseline',
      backgroundColor: 'rgba(196,149,80,0.08)',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    planDayBadgeGreen: {
      backgroundColor: 'rgba(124,184,124,0.08)',
      borderColor: 'rgba(124,184,124,0.25)',
    },
    planDayNum: {
      fontSize: 18,
      color: ACCENT,
      fontFamily: fonts.regular,
      lineHeight: 22,
    },
    planDayOf: {
      fontSize: 11,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
    planSegments: {
      flexDirection: 'row',
      gap: 2,
      flexWrap: 'nowrap',
    },
    planSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    planSegmentDone: {
      backgroundColor: ACCENT,
    },
    planSegmentCurrent: {
      backgroundColor: 'rgba(196,149,80,0.4)',
    },
    planFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planTodayWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flex: 1,
      marginRight: 8,
    },
    planToday: {
      fontSize: 12,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    planRemaining: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
    },

    reflectionCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: ACCENT,
      overflow: 'hidden',
      shadowColor: ACCENT,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    reflectionBody: {
      flex: 1,
      padding: 16,
      gap: 8,
    },
    reflectionTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reflectionLabel: {
      fontSize: 9,
      letterSpacing: 0.2,
      color: 'rgba(196,149,80,0.7)',
      fontFamily: fonts.regular,
    },
    reflectionTimeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: `${ACCENT}20`,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    reflectionTimeText: {
      fontSize: 9,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    reflectionTitle: {
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.01,
    },
    reflectionPreview: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 20,
    },
    reflectionQuestionWrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
    },
    reflectionQuestion: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      fontFamily: fonts.regular,
      lineHeight: 19,
    },
    reflectionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    reflectionPrayerHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    reflectionPrayerText: {
      fontSize: 11,
      color: colors.textMuted,
      fontFamily: fonts.regular,
      fontStyle: 'italic',
    },
    reflectionCta: {
      fontSize: 12,
      color: ACCENT,
      fontFamily: fonts.italic ?? fonts.regular,
    },
    reflectionDoneOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#4CAF5010',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    reflectionDoneText: {
      fontSize: 13,
      color: '#4CAF50',
      fontFamily: fonts.medium,
    },

    refModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    refModalWrap: {
      maxHeight: '92%',
      width: '100%',
    },
    refModal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 0.5,
      borderTopColor: 'rgba(196,149,80,0.2)',
      maxHeight: Dimensions.get('window').height * 0.9,
    },
    refHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    refSteps: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 12,
      gap: 0,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    refStep: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    refStepActive: {
      borderBottomColor: ACCENT,
    },
    refStepText: {
      fontSize: 13,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
    refModalTitle: {
      fontSize: 22,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.02,
    },
    refVerseBox: {
      backgroundColor: colors.background,
      borderRadius: 14,
      padding: 18,
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.25)',
      gap: 6,
    },
    refVerseQuote: {
      fontSize: 40,
      color: 'rgba(196,149,80,0.2)',
      lineHeight: 32,
      fontFamily: fonts.regular,
    },
    refVerseText: {
      fontSize: 16,
      color: colors.text,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 26,
    },
    refVerseRef: {
      fontSize: 11,
      color: ACCENT,
      fontFamily: fonts.regular,
      letterSpacing: 0.05,
      marginTop: 4,
    },
    refReflection: {
      fontSize: 15,
      color: colors.textMuted,
      fontFamily: fonts.regular,
      lineHeight: 26,
      fontStyle: 'italic',
    },
    refNextBtn: {
      backgroundColor: 'rgba(196,149,80,0.1)',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.3)',
    },
    refNextBtnText: {
      fontSize: 14,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    refBigQuestion: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.2)',
    },
    refBigQuestionText: {
      fontSize: 18,
      color: colors.text,
      fontFamily: fonts.regular,
      textAlign: 'center',
      lineHeight: 28,
      letterSpacing: -0.01,
    },
    refNoteWrap: {
      gap: 8,
    },
    refNoteLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontFamily: fonts.regular,
      letterSpacing: 0.05,
    },
    refNoteInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.regular,
      fontStyle: 'italic',
      minHeight: 110,
      lineHeight: 24,
    },
    refPrayerBox: {
      backgroundColor: 'rgba(196,149,80,0.05)',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.2)',
    },
    refPrayerText: {
      fontSize: 16,
      color: colors.text,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 28,
      textAlign: 'center',
    },
    refDoneBtn: {
      backgroundColor: ACCENT,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    refDoneBtnText: {
      fontSize: 16,
      color: colors.background,
      fontFamily: fonts.medium,
    },
    refStreakNote: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      textAlign: 'center',
      lineHeight: 18,
      paddingBottom: 8,
    },

    moodCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.35)',
      overflow: 'hidden',
      position: 'relative',
    },
    moodCardContent: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingTop: 18,
      position: 'relative',
      zIndex: 1,
    },
    moodAiBadge: {
      position: 'absolute',
      top: 10,
      right: 12,
      zIndex: 2,
      backgroundColor: ACCENT,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    moodAiBadgeText: {
      fontSize: 10,
      color: ACCENT_LIGHT,
      fontFamily: fonts.medium,
      letterSpacing: 0.04,
    },
    moodCardRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingRight: 56,
    },
    moodBgCircle: {
      position: 'absolute',
      right: -30,
      top: -30,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(196,149,80,0.04)',
      borderWidth: 1,
      borderColor: 'rgba(196,149,80,0.06)',
    },
    moodIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(196,149,80,0.1)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    moodTextWrap: {
      flex: 1,
      gap: 6,
      minWidth: 0,
    },
    moodRecapTitle: {
      fontSize: 13,
      color: ACCENT,
      fontFamily: fonts.italic,
      lineHeight: 18,
    },
    moodRecapMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      marginTop: 4,
    },
    moodRecapLinkWrap: {
      alignSelf: 'flex-end',
      marginTop: 6,
    },
    moodRecapLink: {
      fontSize: 11,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    moodEmptyTitle: {
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.medium,
      letterSpacing: -0.02,
    },
    moodEmptySubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      marginTop: 4,
      lineHeight: 19,
    },
    moodCtaBtn: {
      marginTop: 12,
      alignSelf: 'flex-start',
      backgroundColor: ACCENT,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    moodCtaBtnText: {
      fontSize: 15,
      color: colors.background,
      fontFamily: fonts.medium,
    },
    churchCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      opacity: 0.85,
    },
    churchIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: `${ACCENT}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    churchTextWrap: {
      flex: 1,
      gap: 4,
    },
    churchTitle: {
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.01,
    },
    churchDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      fontFamily: fonts.regular,
    },
    recentSection: {
      marginHorizontal: 16,
      marginBottom: 12,
    },
    recentSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    recentSectionTitle: {
      fontSize: 10,
      letterSpacing: 0.2,
      color: ACCENT,
      fontFamily: fonts.medium,
    },
    recentSeeAll: {
      fontSize: 13,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    recentLastCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 12,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    recentLastIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(196,149,80,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentLastMid: { flex: 1, minWidth: 0, gap: 4 },
    recentLastTitle: {
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.medium,
      fontWeight: '600',
    },
    recentLastSub: {
      fontSize: 12,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
    recentProgressTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
      overflow: 'hidden',
      marginTop: 4,
    },
    recentProgressFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: ACCENT,
    },

    shareModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    shareModalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 48,
      alignItems: 'center',
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: 12,
      marginBottom: 20,
    },
    shareModalTitle: {
      fontSize: 11,
      letterSpacing: 0.2,
      color: ACCENT,
      marginBottom: 20,
    },
    cardPreviewWrap: {
      marginBottom: 20,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 10,
    },
    themePickerRow: {
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 8,
    },
    themeDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    themeDotActive: {
      borderWidth: 2,
      borderColor: ACCENT,
      transform: [{ scale: 1.15 }],
    },
    themeNameLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 16,
      letterSpacing: 0.1,
    },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: ACCENT,
      paddingVertical: 14,
      paddingHorizontal: 48,
      borderRadius: 10,
      marginBottom: 12,
    },
    shareBtnText: {
      fontSize: 15,
      color: colors.background,
      fontFamily: fonts.medium,
    },
    shareCancelBtn: {
      paddingVertical: 10,
    },
    shareCancelText: {
      fontSize: 14,
      color: colors.textMuted,
    },

    searchModal: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    searchInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    searchCancelBtn: {
      paddingVertical: 8,
    },
    searchCancelText: {
      fontSize: 15,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    searchEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingBottom: 80,
    },
    searchEmptyTitle: {
      fontSize: 18,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    searchEmptyDesc: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
    },
    searchResultCount: {
      fontSize: 11,
      letterSpacing: 0.15,
      color: ACCENT,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchResultItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    searchResultRef: {
      fontSize: 11,
      color: ACCENT,
      letterSpacing: 0.1,
      marginBottom: 6,
      fontFamily: fonts.medium,
    },
    searchResultText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      fontFamily: fonts.regular,
    },
    searchHighlight: {
      backgroundColor: 'rgba(196,149,80,0.25)',
      color: ACCENT,
      fontFamily: fonts.medium,
    },

    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      zIndex: 100,
      alignItems: 'flex-end',
    },
    fabShadow: {
      shadowColor: ACCENT,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    fabBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tooltip: {
      position: 'absolute',
      bottom: 10,
      right: 60,
    },
    tooltipInner: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: 'rgba(196,149,80,0.3)',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: 0,
      maxWidth: 160,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    tooltipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tooltipIconWrap: {
      width: 20,
      height: 20,
      borderRadius: 6,
      backgroundColor: 'rgba(196,149,80,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tooltipTitle: {
      fontSize: 13,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    tooltipDesc: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 17,
      paddingLeft: 34,
    },
    tooltipArrowBorder: {
      position: 'absolute',
      right: -7,
      bottom: 12,
      width: 0,
      height: 0,
      borderTopWidth: 6,
      borderBottomWidth: 6,
      borderLeftWidth: 7,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'rgba(196,149,80,0.3)',
    },
    tooltipArrowFill: {
      position: 'absolute',
      right: -5,
      bottom: 13,
      width: 0,
      height: 0,
      borderTopWidth: 5,
      borderBottomWidth: 5,
      borderLeftWidth: 6,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: colors.surface,
    },
    tutorialOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
      zIndex: 999,
    },
    tutorialTooltip: {
      position: 'absolute',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: ACCENT,
      maxWidth: 260,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
      zIndex: 1000,
    },
    tutorialArrow: {
      position: 'absolute',
      width: 0,
      height: 0,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderTopWidth: 12,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: ACCENT,
      alignSelf: 'center',
      bottom: -12,
    },
    tutorialText: {
      fontSize: 14,
      color: colors.text,
      fontFamily: fonts.regular,
      lineHeight: 20,
    },
    tutorialStepText: {
      marginTop: 6,
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
    },
    tutorialButton: {
      marginTop: 12,
      alignSelf: 'flex-end',
      backgroundColor: ACCENT,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tutorialButtonText: {
      color: '#FFF8EE',
      fontSize: 13,
      fontFamily: fonts.medium,
    },
  });
};

const stylesStatic = StyleSheet.create({
  musicWaveBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: ACCENT,
    opacity: 0.7,
  },
});

function getDailyVerse() {
  const day = new Date().getDate();
  const verses = [
    { text: 'Çünkü Tanrı dünyayı o kadar çok sevdi ki, biricik Oğlu\'nu verdi. Öyle ki, O\'na iman edenlerin hiçbiri mahvolmasın, hepsi sonsuz yaşama kavuşsun.', ref: 'Yuhanna 3:16', book: 'Yuhanna', chapter: 3, verse: 16 },
    { text: 'Ruh\'un meyvesi sevgi, sevinç, esenlik, sabır, şefkat, iyilik, bağlılık, yumuşaklık ve özdenetimdir.', ref: 'Galatyalılar 5:22', book: 'Galatyalılar', chapter: 5, verse: 22 },
    { text: 'Her şeyi beni güçlendiren Mesih aracılığıyla yapabilirim.', ref: 'Filipililere 4:13', book: 'Filipililere', chapter: 4, verse: 13 },
    { text: 'Rab benim çobanım, eksiğim olmaz.', ref: 'Mezmur 23:1', book: 'Mezmurlar', chapter: 23, verse: 1 },
    { text: 'Mesih İsa\'ya ait olanlara artık hiçbir mahkumiyet yoktur.', ref: 'Romalılar 8:1', book: 'Romalılar', chapter: 8, verse: 1 },
    { text: 'Barışı sağlayanlar ne mutlu! Onlar Tanrı\'nın oğulları olarak anılacak.', ref: 'Matta 5:9', book: 'Matta', chapter: 5, verse: 9 },
    { text: 'Tanrı bize korkaklık ruhu değil, güç, sevgi ve öz denetim ruhu vermiştir.', ref: '2. Timoteos 1:7', book: '2. Timoteos', chapter: 1, verse: 7 },
    { text: 'Her şeyde şükran sunun. Çünkü Tanrı\'nın Mesih İsa\'da sizin için istediği budur.', ref: '1. Selanikliler 5:18', book: '1. Selanikliler', chapter: 5, verse: 18 },
    { text: 'Tanrı\'ya yaklaşın, O da size yaklaşacaktır.', ref: 'Yakup 4:8', book: 'Yakup', chapter: 4, verse: 8 },
    { text: 'İsa ona, "Ben yolum, gerçeğim ve yaşamım" dedi.', ref: 'Yuhanna 14:6', book: 'Yuhanna', chapter: 14, verse: 6 },
    { text: 'Kaygılarınızın hepsini O\'na bırakın, çünkü O sizi önemsiyor.', ref: '1. Petrus 5:7', book: '1. Petrus', chapter: 5, verse: 7 },
    { text: 'Çünkü biliyorum; hakkımda olan düşünceler, esenlik düşünceleridir.', ref: 'Yeremya 29:11', book: 'Yeremya', chapter: 29, verse: 11 },
    { text: 'İmanın önderi ve tamamlayıcısı olan İsa\'ya bakalım.', ref: 'İbraniler 12:2', book: 'İbraniler', chapter: 12, verse: 2 },
    { text: 'Tanrı sevgidir. Sevgide yaşayan, Tanrı\'da yaşar, Tanrı da onda yaşar.', ref: '1. Yuhanna 4:16', book: '1. Yuhanna', chapter: 4, verse: 16 },
    { text: 'Güçlüğe uğrayan biri mi var? Dua etsin.', ref: 'Yakup 5:13', book: 'Yakup', chapter: 5, verse: 13 },
    { text: 'Her şeyde kazananlardan fazlasıyız; bunu bize sevmiş olan sayesinde başardık.', ref: 'Romalılar 8:37', book: 'Romalılar', chapter: 8, verse: 37 },
  ];
  return verses[day % verses.length];
}

function getTodayReading(planDay: number) {
  const readings = [
    'Matta 1–2', 'Matta 3–4', 'Matta 5–6',
    'Matta 7–8', 'Matta 9–10', 'Matta 11–12',
    'Matta 13–14', 'Matta 15–16', 'Matta 17–18',
    'Matta 19–20', 'Matta 21–22', 'Matta 23–24',
    'Matta 25–26', 'Matta 27–28', 'Markos 1–2',
    'Markos 3–4', 'Markos 5–6', 'Markos 7–8',
    'Markos 9–10', 'Markos 11–12', 'Markos 13–14',
    'Markos 15–16', 'Luka 1–2', 'Luka 3–4',
    'Luka 5–6', 'Luka 7–8', 'Luka 9–10',
    'Luka 11–12', 'Luka 13–14', 'Luka 15–16',
  ];
  return readings[(planDay - 1) % readings.length];
}

export default function HomeScreen() {
  const isHomeFocused = useIsFocused();
  const { colors, fonts } = useTheme();
  const { t, language } = useTranslation();
  const [userName, setUserName] = useState('');
  const [streak, setStreak] = useState(0);
  const [streakCardDismissed, setStreakCardDismissed] = useState(false);
  const { isOnline } = useNetwork();
  const [planDay, setPlanDay] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritedVerse, setFavoritedVerse] = useState(false);
  const [dailyVerseBgFailed, setDailyVerseBgFailed] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionStep, setReflectionStep] = useState<'read' | 'think' | 'pray'>('read');
  const [reflectionNote, setReflectionNote] = useState('');
  const [reflectionDoneToday, setReflectionDoneToday] = useState(false);
  const [lastRead, setLastRead] = useState<LastReadPayload | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareVerse, setShareVerse] = useState({ text: '', ref: '' });
  const [lastMood, setLastMood] = useState<string | null>(null);
  const [lastMoodAt, setLastMoodAt] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const {
    isPlaying,
    currentTrack,
    playTrack,
    stopMusic,
    volume,
    changeVolume,
    tracks,
  } = useAmbientMusic();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{ book: string; chapter: number; verse: number; text: string }[]>([]);
  const heartAnim = useRef(new Animated.Value(1)).current;
  const searchInputRef = useRef<TextInput>(null);
  const styles = useMemo(() => makeStyles(colors, fonts), [colors, fonts]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const moodPulse = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fabOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.85)).current;
  const lastScrollY = useRef(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const seen = await AsyncStorage.getItem('@soz/fabTooltipSeen');
        if (!seen) setShowTooltip(true);
      } catch (e) {
        console.log('Offline mode:', e);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const pairs = await AsyncStorage.multiGet(['@soz/lastMood', '@soz/lastMoodAt']);
        const m = pairs[0][1];
        const at = pairs[1][1];
        if (m) setLastMood(m);
        else setLastMood(null);
        if (at) setLastMoodAt(at);
        else setLastMoodAt(null);
      } catch (e) {
        console.log('Offline mode:', e);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(moodPulse, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(moodPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [moodPulse]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.7, duration: 700, useNativeDriver: false }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const dismissTooltip = () => {
    try {
      void AsyncStorage.setItem('@soz/fabTooltipSeen', 'true');
    } catch (e) {
      console.log('Offline mode:', e);
    }
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(tooltipScale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start(() => setShowTooltip(false));
  };

  useEffect(() => {
    if (showTooltip) {
      tooltipOpacity.setValue(0);
      tooltipScale.setValue(0.85);
      Animated.parallel([
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.spring(tooltipScale, {
          toValue: 1,
          tension: 70,
          friction: 9,
          useNativeDriver: false,
        }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(tooltipOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(tooltipScale, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => setShowTooltip(false));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showTooltip, tooltipOpacity, tooltipScale]);

  const handleFabPress = () => {
    if (showTooltip) dismissTooltip();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false,
      }),
    ]).start();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      router.push('/ask');
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }, 100);
    });
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > lastScrollY.current + 10) {
      Animated.timing(fabOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else if (y < lastScrollY.current - 10) {
      Animated.timing(fabOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    lastScrollY.current = y;
  };

  const dailyVerse = getDailyVerse();
  const todayVerseBg = getDailyVerseBackground();
  const isHeroVerseCard = !dailyVerseBgFailed;

  const todayDevotional = useMemo(() => {
    try {
      return getTodaysDevotional(new Date());
    } catch (e) {
      console.log('Offline mode:', e);
      return devotionals[0];
    }
  }, []);

  const reflectionSlideY = useRef(new Animated.Value(0)).current;

  const openReflection = useCallback(() => {
    setReflectionStep('read');
    reflectionSlideY.setValue(40);
    setShowReflection(true);
    Animated.spring(reflectionSlideY, {
      toValue: 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [reflectionSlideY]);

  const closeReflection = useCallback(() => {
    Animated.timing(reflectionSlideY, {
      toValue: 80,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      reflectionSlideY.setValue(0);
      setShowReflection(false);
      setReflectionStep('read');
    });
  }, [reflectionSlideY]);

  useEffect(() => {
    if (!showReflection) return;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(`@soz/reflection/${todayDevotional.day}`);
        setReflectionNote(raw ?? '');
      } catch (e) {
        console.log('Offline mode:', e);
        setReflectionNote('');
      }
    };
    void load();
  }, [showReflection, todayDevotional.day]);

  const totalPlanDays = 30;
  const safePlanDay = Math.min(Math.max(1, planDay), totalPlanDays);
  const completedPlanSegments = Math.max(0, safePlanDay - 1);
  const planRemainingDays = Math.max(0, totalPlanDays - safePlanDay);
  const planOnTrack =
    completedPlanSegments >= Math.floor((new Date().getDate() / 30) * totalPlanDays);
  const todayPlanChapter = getTodayReading(safePlanDay);

  const goToDailyVerseRead = useCallback(() => {
    router.push({
      pathname: '/(tabs)/read',
      params: {
        book: dailyVerse.book,
        chapter: String(dailyVerse.chapter),
        highlightVerse: String(dailyVerse.verse),
      },
    });
  }, [dailyVerse.book, dailyVerse.chapter, dailyVerse.verse]);

  const trimmedUserName = userName?.trim() ?? '';
  const profileInitial =
    trimmedUserName.length > 0
      ? trimmedUserName.charAt(0).toLocaleUpperCase('tr-TR')
      : '';

  const dateStr = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  const lastMoodPreview = useMemo(() => parseLastMoodPayload(lastMood), [lastMood]);
  const hasLastMoodSession = lastMoodPreview.hasData;
  const greetingBanner = useMemo(() => getGreetingBannerContent(), []);

  const SkeletonCard = () => (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, height: 120, marginBottom: 12, overflow: 'hidden' }}>
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.border,
          opacity: shimmerAnim,
        }}
      />
    </View>
  );

  const handleFavorite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1.4,
        useNativeDriver: false,
      }),
      Animated.spring(heartAnim, {
        toValue: 1.0,
        useNativeDriver: false,
      }),
    ]).start();
    const newVal = !favoritedVerse;
    setFavoritedVerse(newVal);
    try {
      await AsyncStorage.setItem('@soz/favoritedDailyVerse', newVal.toString());
      const raw = await AsyncStorage.getItem('@soz/favorites');
      const current = raw ? (JSON.parse(raw) as unknown[]) : [];
      const list = Array.isArray(current) ? current : [];
      const verseId = `${dailyVerse.book}-${dailyVerse.chapter}-${dailyVerse.verse}`;
      const exists = list.some((item) => {
        if (typeof item === 'string') return item === verseId;
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          return rec.id === verseId;
        }
        return false;
      });

      let next: unknown[] = [];
      if (exists) {
        next = list.filter((item) => {
          if (typeof item === 'string') return item !== verseId;
          if (item && typeof item === 'object') {
            const rec = item as Record<string, unknown>;
            return rec.id !== verseId;
          }
          return true;
        });
      } else {
        next = [
          {
            id: verseId,
            ref: dailyVerse.ref,
            text: dailyVerse.text,
            book: dailyVerse.book,
            chapter: dailyVerse.chapter,
            verse: dailyVerse.verse,
            addedAt: new Date().toISOString(),
          },
          ...list,
        ];
      }
      await AsyncStorage.setItem('@soz/favorites', JSON.stringify(next));
    } catch (e) {
      console.log('Offline mode:', e);
    }
  };

  const closeShareModal = () => setShareModalVisible(false);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }
    const results: { book: string; chapter: number; verse: number; text: string }[] = [];
    const query = text.toLowerCase();
    for (const book of newTestament) {
      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          if (verse.text.toLowerCase().includes(query)) {
            results.push({
              book: book.name,
              chapter: chapter.chapter,
              verse: verse.verse,
              text: verse.text,
            });
            if (results.length >= 30) break;
          }
        }
        if (results.length >= 30) break;
      }
      if (results.length >= 30) break;
    }
    setSearchResults(results);
  };

  useFocusEffect(
    useCallback(() => {
      const loadName = async () => {
        try {
          const name = await AsyncStorage.getItem('@soz/userName');
          if (name && name.trim()) {
            setUserName(name.trim());
          } else {
            setUserName('');
          }
        } catch (e) {
          console.log('Offline mode:', e);
          setUserName('');
        }
      };
      void loadName();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const checkTutorial = async () => {
        try {
          const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
          if (!seen) {
            setTutorialStep(0);
            setShowTutorial(true);
          }
        } catch {
          // ignore storage failures in offline mode
        }
      };
      void checkTutorial();
      return () => {};
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setIsHomeLoading(true);
        try {
          const vals = await AsyncStorage.multiGet([
            '@soz/streak',
            '@soz/planProgress',
            '@soz/favoritedDailyVerse',
            '@soz/lastMood',
            '@soz/lastMoodAt',
            `@soz/reflectionDone/${todayDevotional.day}`,
            STREAK_CARD_DISMISSED_AT_KEY,
          ]);
          setStreak(parseInt(vals[0][1] ?? '0', 10));
          const dismissedAt = vals[6][1] ? parseInt(vals[6][1], 10) : 0;
          setStreakCardDismissed(Boolean(dismissedAt) && Date.now() - dismissedAt < STREAK_CARD_COOLDOWN_MS);
          const planVal = vals[1][1];
          if (planVal != null) {
            try {
              const parsed = JSON.parse(planVal);
              const day = typeof parsed?.currentDay === 'number' ? parsed.currentDay : parseInt(planVal, 10) || 1;
              setPlanDay(day);
            } catch {
              setPlanDay(parseInt(planVal, 10) || 1);
            }
          }
          setFavoritedVerse(vals[2][1] === 'true');
          if (vals[3][1]) setLastMood(vals[3][1]);
          else setLastMood(null);
          if (vals[4][1]) setLastMoodAt(vals[4][1]);
          else setLastMoodAt(null);
          setReflectionDoneToday(vals[5][1] === 'true');
          setLastRead(await loadLastRead());
        } catch (e) {
          console.log('Offline mode:', e);
          setStreak(0);
          setPlanDay(1);
          setFavoritedVerse(false);
          setLastMood(null);
          setLastMoodAt(null);
          setReflectionDoneToday(false);
          setLastRead(null);
        } finally {
          setIsHomeLoading(false);
        }
      };
      void load();

      return () => {};
    }, [todayDevotional.day])
  );

  const dismissStreakCard = useCallback(() => {
    setStreakCardDismissed(true);
    AsyncStorage.setItem(STREAK_CARD_DISMISSED_AT_KEY, String(Date.now())).catch(() => {});
  }, []);

  const finishTutorial = useCallback(async () => {
    setShowTutorial(false);
    try {
      await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const nextTutorialStep = useCallback(() => {
    if (tutorialStep >= HOME_TUTORIAL_STEPS.length - 1) {
      void finishTutorial();
      return;
    }
    setTutorialStep((prev) => prev + 1);
  }, [finishTutorial, tutorialStep]);

  const tutorialPosition = useMemo(() => {
    const h = Dimensions.get('window').height;
    const currentTarget = HOME_TUTORIAL_STEPS[tutorialStep]?.target;
    if (currentTarget === 'verse') {
      return {
        cardStyle: { top: 280, left: 20 },
        showArrowDown: true,
      };
    }
    if (currentTarget === 'tabbar') {
      return {
        cardStyle: { bottom: 110, left: 20 },
        showArrowDown: false,
      };
    }
    return {
      cardStyle: { top: Math.max(320, h * 0.52), left: 20 },
      showArrowDown: true,
    };
  }, [tutorialStep]);

  useFocusEffect(
    useCallback(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
      return () => {};
    }, [fadeAnim])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await new Promise((r) => setTimeout(r, 800));
              setRefreshing(false);
            }}
            tintColor={ACCENT}
          />
        }
      >
        <View style={styles.stickyHeaderWrap}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingPrefix}>Merhaba,</Text>
              <Text style={styles.greetingName}>
                {trimmedUserName ? `${trimmedUserName}!` : 'Hoş geldin!'}
              </Text>
              <View style={styles.headerDateRow}>
                <Text style={styles.dateText}>{dateStr}</Text>
                {streak > 0 ? (
                  <View style={styles.streakPill}>
                    <Ionicons name="flame-outline" size={12} color={ACCENT} />
                    <Text style={styles.streakText}>{streak} günlük seri</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={styles.ikonBtn}
                onPress={() => {
                  router.push('/search');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="search-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ikonBtn}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.85}
              >
                {trimmedUserName ? (
                  <View style={styles.profileInitialCircle}>
                    <Text style={styles.profileInitialText}>{profileInitial}</Text>
                  </View>
                ) : (
                  <Ionicons name="person-circle-outline" size={22} color={colors.text} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {!isOnline ? (
            <View style={styles.offlineBannerBelow}>
              <Ionicons name="wifi-outline" size={16} color={colors.text} />
              <Text style={styles.offlineTextBelow}>
                Çevrimdışı mod
              </Text>
            </View>
          ) : null}
        </View>

        {streak === 0 && !streakCardDismissed ? (
          <View style={styles.streakZeroCard}>
            <LinearGradient
              colors={[`${ACCENT}22`, `${ACCENT}08`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <TouchableOpacity
              style={styles.streakZeroCloseBtn}
              onPress={dismissStreakCard}
              hitSlop={10}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.streakZeroHeaderRow}>
              <View style={styles.streakZeroIconWrap}>
                <Ionicons name="flame" size={18} color={ACCENT} />
              </View>
              <Text style={styles.streakZeroTitle}>Bugün başla!</Text>
            </View>
            <Text style={styles.streakZeroDesc}>Her gün okumak ruhsal büyümenin temelidir</Text>
            <TouchableOpacity
              style={styles.streakZeroBtn}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/read',
                  params: { bookId: DEFAULT_READ_BOOK_ID, chapter: '1' },
                })
              }
              activeOpacity={0.86}
            >
              <Text style={styles.streakZeroBtnText}>İlk Bölümü Oku →</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.greetingBanner}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/read',
              params: { bookId: DEFAULT_READ_BOOK_ID, chapter: '1' },
            })
          }
          activeOpacity={0.86}
        >
          <Ionicons name={greetingBanner.icon} size={20} color={ACCENT} />
          <View style={styles.greetingBannerTextWrap}>
            <Text style={styles.greetingBannerTitle}>{greetingBanner.title}</Text>
            <Text style={styles.greetingBannerSubtitle}>{greetingBanner.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {isHomeLoading ? (
          <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
            <SkeletonCard />
          </View>
        ) : (
        <View style={styles.verseCard}>
          {isHeroVerseCard ? (
            <ImageBackground
              source={todayVerseBg}
              style={styles.verseBg}
              imageStyle={styles.verseBgImage}
              resizeMode="cover"
              onError={() => setDailyVerseBgFailed(true)}
            >
              <LinearGradient
                colors={['rgba(10,10,8,0.2)', 'rgba(6,6,5,0.55)', 'rgba(4,4,3,0.78)']}
                locations={[0, 0.45, 1]}
                style={styles.verseOverlayGradient}
                pointerEvents="none"
              />
              {Platform.OS === 'web' ? (
                <View style={styles.verseBlurLayerWeb} pointerEvents="none" />
              ) : (
                <BlurView intensity={22} tint="dark" style={styles.verseBlurLayer} />
              )}
              <View style={[styles.verseContent, { zIndex: 2 }]}>
                <View style={styles.verseLabelRow}>
                  <View style={styles.verseLabelLeft}>
                    <View style={styles.verseLabelDot} />
                    <Text style={styles.verseLabel}>GÜNÜN AYETİ</Text>
                  </View>
                  <Text style={styles.verseDateLabel}>
                    {new Date().toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                </View>

                <Text style={styles.verseQuoteMark}>{'\u201C'}</Text>
                <Text style={styles.verseText}>{dailyVerse.text}</Text>

                <View style={styles.verseBottom}>
                  <Text style={styles.verseRef} numberOfLines={2}>
                    {dailyVerse.ref}
                  </Text>
                </View>

                <View style={styles.verseDivider} />

                <View style={styles.verseActions}>
                  <TouchableOpacity style={styles.verseActionBtn} onPress={handleFavorite}>
                    <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
                      <Ionicons
                        name={favoritedVerse ? 'heart' : 'heart-outline'}
                        size={15}
                        color={favoritedVerse ? '#E57373' : 'rgba(255,255,255,0.85)'}
                      />
                    </Animated.View>
                    <Text style={styles.verseActionText}>Favori</Text>
                  </TouchableOpacity>

                  <View style={styles.actionDivider} />

                  <TouchableOpacity
                    style={styles.verseActionBtn}
                    onPress={() => {
                      setShareVerse({
                        text: dailyVerse.text,
                        ref: `${dailyVerse.book} ${dailyVerse.chapter}:${dailyVerse.verse}`,
                      });
                      setShareModalVisible(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="share-outline" size={15} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.verseActionText}>{t('share')}</Text>
                  </TouchableOpacity>

                  <View style={styles.actionDivider} />

                  <TouchableOpacity style={styles.verseActionBtn} onPress={goToDailyVerseRead}>
                    <Ionicons name="book-outline" size={15} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.verseActionText}>{t('read')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.verseCardFallback}>
              <View style={styles.verseCardFallbackDecor} pointerEvents="none" />
              <View style={[styles.verseContent, { position: 'relative', zIndex: 1 }]}>
                <View style={styles.verseLabelRow}>
                  <View style={styles.verseLabelLeft}>
                    <View style={styles.verseLabelDot} />
                    <Text style={styles.verseLabel}>GÜNÜN AYETİ</Text>
                  </View>
                  <Text style={[styles.verseDateLabel, styles.verseDateLabelFallback]}>
                    {new Date().toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                </View>

                <Text style={[styles.verseQuoteMark, { color: 'rgba(196,149,80,0.45)' }]}>{'\u201C'}</Text>
                <Text style={[styles.verseText, styles.verseTextFallback]}>{dailyVerse.text}</Text>

                <View style={styles.verseBottom}>
                  <Text style={[styles.verseRef, styles.verseRefFallback]} numberOfLines={2}>
                    {dailyVerse.ref}
                  </Text>
                </View>

                <View style={styles.verseDivider} />

                <View style={styles.verseActions}>
                  <TouchableOpacity style={styles.verseActionBtn} onPress={handleFavorite}>
                    <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
                      <Ionicons
                        name={favoritedVerse ? 'heart' : 'heart-outline'}
                        size={15}
                        color={favoritedVerse ? '#E57373' : 'rgba(255,255,255,0.85)'}
                      />
                    </Animated.View>
                    <Text style={styles.verseActionText}>Favori</Text>
                  </TouchableOpacity>

                  <View style={styles.actionDivider} />

                  <TouchableOpacity
                    style={styles.verseActionBtn}
                    onPress={() => {
                      setShareVerse({
                        text: dailyVerse.text,
                        ref: `${dailyVerse.book} ${dailyVerse.chapter}:${dailyVerse.verse}`,
                      });
                      setShareModalVisible(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="share-outline" size={15} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.verseActionText}>{t('share')}</Text>
                  </TouchableOpacity>

                  <View style={styles.actionDivider} />

                  <TouchableOpacity style={styles.verseActionBtn} onPress={goToDailyVerseRead}>
                    <Ionicons name="book-outline" size={15} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.verseActionText}>{t('read')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
        )}

        <View style={styles.musicCard}>
          <View style={styles.musicIconWrap}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 18V5l12-2v13"
                stroke={ACCENT}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle cx="6" cy="18" r="3" stroke={ACCENT} strokeWidth="1.5" />
              <Circle cx="18" cy="16" r="3" stroke={ACCENT} strokeWidth="1.5" />
            </Svg>
          </View>

          <TouchableOpacity
            style={styles.musicTextWrap}
            onPress={() => setShowTrackPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.musicLabel}>ORTAM MÜZİĞİ</Text>
            <Text style={styles.musicTrackName}>
              {isPlaying && currentTrack && currentTrack.id !== 'silence'
                ? currentTrack.name
                : 'Gözlerini kapa, ses seç...'}
            </Text>
            {isPlaying && currentTrack?.id !== 'silence' && (
              <View style={styles.musicWaveRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <MusicBar key={i} delay={i * 80} />
                ))}
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.musicControls}>
            <TouchableOpacity
              style={styles.musicVolBtn}
              onPress={() => void changeVolume(volume > 0 ? 0 : 0.7)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={volume === 0 ? 'volume-mute-outline' : 'volume-medium-outline'}
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.musicPlayBtn, isPlaying && styles.musicPlayBtnActive]}
              onPress={() => {
                if (isPlaying) {
                  void stopMusic();
                } else {
                  void playTrack(
                    currentTrack?.id && currentTrack.id !== 'silence'
                      ? currentTrack.id
                      : (tracks.find((t) => t.id !== 'silence')?.id ?? 'silence'),
                  );
                }
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={isPlaying ? colors.background : ACCENT}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.planCard}
          onPress={() => router.push('/(tabs)/plans')}
          activeOpacity={0.88}
        >
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planLabel}>OKUMA PLANI</Text>
              <Text style={styles.planTitle}>Yeni Ahit 30 Günde</Text>
            </View>
            <View
              style={[
                styles.planDayBadge,
                planOnTrack && styles.planDayBadgeGreen,
              ]}
            >
              <Text
                style={[
                  styles.planDayNum,
                  planOnTrack && { color: '#7CB87C' },
                ]}
              >
                {safePlanDay}
              </Text>
              <Text
                style={[
                  styles.planDayOf,
                  planOnTrack && { color: '#7CB87C' },
                ]}
              >
                /{totalPlanDays}
              </Text>
            </View>
          </View>

          <View style={styles.planSegments}>
            {Array.from({ length: totalPlanDays }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.planSegment,
                  i < completedPlanSegments && styles.planSegmentDone,
                  i === completedPlanSegments && styles.planSegmentCurrent,
                ]}
              />
            ))}
          </View>

          <View style={styles.planFooter}>
            <View style={styles.planTodayWrap}>
              <Ionicons name="book-outline" size={12} color={ACCENT} />
              <Text style={styles.planToday} numberOfLines={1}>
                Bugün: {todayPlanChapter}
              </Text>
            </View>
            <Text style={styles.planRemaining}>
              {planRemainingDays > 0
                ? `${planRemainingDays} gün kaldı`
                : '✓ Tamamlandı'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reflectionCard}
          onPress={openReflection}
          activeOpacity={0.85}
        >
          <View style={styles.reflectionBody}>
            <View style={styles.reflectionTop}>
              <Text style={styles.reflectionLabel}>GÜNLÜK YANSIMA</Text>
              <View style={styles.reflectionTimeBadge}>
                <Ionicons name="timer-outline" size={12} color={ACCENT} />
                <Text style={styles.reflectionTimeText}>3 dk</Text>
              </View>
            </View>

            <Text style={styles.reflectionTitle}>{todayDevotional.title}</Text>

            <Text style={styles.reflectionPreview} numberOfLines={2}>
              {todayDevotional.reflection}
            </Text>

            <View style={[styles.reflectionQuestionWrap, { backgroundColor: colors.surface ?? colors.background }]}>
              <Ionicons name="help-circle-outline" size={16} color={ACCENT} />
              <Text style={styles.reflectionQuestion} numberOfLines={2}>
                {todayDevotional.question}
              </Text>
            </View>

            <View style={styles.reflectionFooter}>
              <View style={styles.reflectionPrayerHint}>
                <Ionicons name="hand-left-outline" size={11} color={colors.textMuted} />
                <Text style={styles.reflectionPrayerText}>Dua dahil</Text>
              </View>
              {!reflectionDoneToday ? <Text style={styles.reflectionCta}>Yansımayı Aç →</Text> : null}
            </View>
          </View>
          {reflectionDoneToday ? (
            <View style={styles.reflectionDoneOverlay} pointerEvents="none">
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.reflectionDoneText}>Bugün tamamlandı</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {isHomeLoading ? (
          <View style={{ paddingHorizontal: 16 }}>
            <SkeletonCard />
          </View>
        ) : (
        <TouchableOpacity
          style={styles.moodCard}
          onPress={() => router.push('/mood')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[colors.surfaceAlt, colors.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.moodBgCircle} pointerEvents="none" />
          <View style={styles.moodCardContent}>
            <View style={styles.moodAiBadge} pointerEvents="none">
              <Text style={styles.moodAiBadgeText}>✦ AI</Text>
            </View>

            <View style={styles.moodCardRow}>
              <Animated.View
                style={[styles.moodIconWrap, { transform: [{ scale: moodPulse }] }]}
              >
                <Ionicons name="heart" size={22} color={ACCENT} />
              </Animated.View>

              <View style={styles.moodTextWrap}>
                {hasLastMoodSession ? (
                  <>
                    <Text style={styles.moodRecapTitle} numberOfLines={2}>
                      "{lastMoodPreview.summary}"
                    </Text>
                    <Text style={styles.moodRecapMeta}>
                      {formatMoodRecency(lastMoodAt)} · 3 ayet önerildi
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/mood')}
                      activeOpacity={0.8}
                      style={styles.moodRecapLinkWrap}
                    >
                      <Text style={styles.moodRecapLink}>Tekrar Sor →</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.moodEmptyTitle}>Bugün nasılsın?</Text>
                    <Text style={styles.moodEmptySubtitle}>Ruh haline göre ayet al</Text>
                    <View style={styles.moodCtaBtn}>
                      <Text style={styles.moodCtaBtnText}>Nasılsın? →</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.churchCard}
          onPress={() => router.push('/church')}
          activeOpacity={0.85}
        >
          <View style={styles.churchIconWrap}>
            <Ionicons name="people" size={22} color={ACCENT} />
          </View>

          <View style={styles.churchTextWrap}>
            <Text style={styles.churchTitle}>Kilise Grubu</Text>
            <Text style={styles.churchDesc}>Topluluğunla birlikte oku</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={ACCENT} />
        </TouchableOpacity>

        {isHomeLoading ? (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <SkeletonCard />
          </View>
        ) : (
        <View style={styles.recentSection}>
          <View style={styles.recentSectionHeader}>
            <Text style={styles.recentSectionTitle}>{t('recentReading').toUpperCase()}</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/read')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <Text style={styles.recentSeeAll}>Tümünü Gör →</Text>
            </TouchableOpacity>
          </View>

          {lastRead && getBookIdByName(lastRead.book) ? (
            <TouchableOpacity
              style={styles.recentLastCard}
              activeOpacity={0.88}
              onPress={() => {
                const bookId = getBookIdByName(lastRead.book);
                if (!bookId) return;
                router.push({
                  pathname: '/(tabs)/read',
                  params: {
                    bookId,
                    chapter: String(lastRead.chapter),
                    ...(lastRead.verse != null
                      ? { highlightVerse: String(lastRead.verse) }
                      : {}),
                  },
                });
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.recentLastIconWrap}>
                <Ionicons name="book-outline" size={20} color={ACCENT} />
              </View>
              <View style={styles.recentLastMid}>
                <Text style={styles.recentLastTitle} numberOfLines={1}>
                  {lastRead.book}
                </Text>
                <Text style={styles.recentLastSub}>
                  {(() => {
                    const totalChapters = getBookChapterCount(lastRead.book);
                    if (totalChapters == null) return `${lastRead.chapter}. bölümdesin`;
                    const remaining = Math.max(0, totalChapters - lastRead.chapter);
                    return `${lastRead.chapter}. bölümdesin · ${remaining} bölüm kaldı`;
                  })()}
                </Text>
                <View style={styles.recentProgressTrack}>
                  <View
                    style={[
                      styles.recentProgressFill,
                      {
                        width: `${(() => {
                          const totalChapters = getBookChapterCount(lastRead.book);
                          if (totalChapters == null || totalChapters <= 0) return 6;
                          const pct = Math.round((lastRead.chapter / totalChapters) * 100);
                          return Math.max(3, Math.min(100, pct));
                        })()}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.recentLastCard}
              activeOpacity={0.88}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/read',
                  params: { bookId: DEFAULT_READ_BOOK_ID, chapter: '1' },
                });
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.recentLastIconWrap}>
                <Ionicons name="book-outline" size={20} color={ACCENT} />
              </View>
              <View style={styles.recentLastMid}>
                <Text style={styles.recentLastTitle}>Okumaya Başla</Text>
                <Text style={styles.recentLastSub}>Matta 1'den başla</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={ACCENT} />
            </TouchableOpacity>
          )}
        </View>
        )}
      </ScrollView>

      <Modal
        visible={showReflection}
        transparent
        animationType="fade"
        onRequestClose={closeReflection}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={styles.refModalBackdrop} onPress={closeReflection} />
            <Animated.View
              style={[
                styles.refModalWrap,
                { transform: [{ translateY: reflectionSlideY }], width: '100%' },
              ]}
            >
              <View style={styles.refModal}>
                <View style={styles.refHandle} />
                <View style={styles.refSteps}>
                  {(['read', 'think', 'pray'] as const).map((step, i) => {
                    const order = ['read', 'think', 'pray'] as const;
                    const currentIdx = order.indexOf(reflectionStep);
                    const label =
                      step === 'read' ? 'Oku' : step === 'think' ? 'Düşün' : 'Dua Et';
                    return (
                      <View
                        key={step}
                        style={[
                          styles.refStep,
                          i === currentIdx && styles.refStepActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.refStepText,
                            i === currentIdx && { color: ACCENT },
                            i < currentIdx && { color: colors.textMuted, opacity: 0.85 },
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <ScrollView
                  contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 36 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {reflectionStep === 'read' && (
                    <>
                      <Text style={styles.refModalTitle}>{todayDevotional.title}</Text>

                      <View style={styles.refVerseBox}>
                        <Text style={styles.refVerseQuote}>{'\u201C'}</Text>
                        <Text style={styles.refVerseText}>{todayDevotional.verse}</Text>
                        <Text style={styles.refVerseRef}>{todayDevotional.verseRef}</Text>
                      </View>

                      <Text style={styles.refReflection}>{todayDevotional.reflection}</Text>

                      <TouchableOpacity
                        style={styles.refNextBtn}
                        onPress={() => {
                          setReflectionStep('think');
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.refNextBtnText}>Düşünme Sorusuna Geç →</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {reflectionStep === 'think' && (
                    <>
                      <Text style={styles.refModalTitle}>Bugün Kendine Sor</Text>

                      <View style={styles.refBigQuestion}>
                        <Ionicons
                          name="help-circle"
                          size={28}
                          color="rgba(196,149,80,0.3)"
                          style={{ marginBottom: 8 }}
                        />
                        <Text style={styles.refBigQuestionText}>{todayDevotional.question}</Text>
                      </View>

                      <View style={styles.refNoteWrap}>
                        <Text style={styles.refNoteLabel}>Düşüncelerini yaz (isteğe bağlı)</Text>
                        <TextInput
                          style={styles.refNoteInput}
                          placeholder="Bugün aklıma gelenler..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          value={reflectionNote}
                          onChangeText={(text) => {
                            setReflectionNote(text);
                            void (async () => {
                              try {
                                await AsyncStorage.setItem(
                                  `@soz/reflection/${todayDevotional.day}`,
                                  text
                                );
                              } catch (e) {
                                console.log('Offline mode:', e);
                              }
                            })();
                          }}
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.refNextBtn}
                        onPress={() => {
                          setReflectionStep('pray');
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.refNextBtnText}>Duaya Geç →</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {reflectionStep === 'pray' && (
                    <>
                      <Text style={styles.refModalTitle}>Dua</Text>

                      <View style={styles.refPrayerBox}>
                        <Ionicons
                          name="hand-left"
                          size={20}
                          color="rgba(196,149,80,0.25)"
                          style={{ marginBottom: 12 }}
                        />
                        <Text style={styles.refPrayerText}>{todayDevotional.prayer}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.refDoneBtn}
                        onPress={async () => {
                          try {
                            await AsyncStorage.setItem(
                              `@soz/reflectionDone/${todayDevotional.day}`,
                              'true'
                            );
                          } catch (e) {
                            console.log('Offline mode:', e);
                          }
                          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          closeReflection();
                        }}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.background} />
                        <Text style={styles.refDoneBtnText}>Bugünü Tamamladım</Text>
                      </TouchableOpacity>

                      <Text style={styles.refStreakNote}>
                        Bu özelliği düzenli kullananlar imanlarında daha derin bir büyüme yaşadıklarını
                        belirtiyor.
                      </Text>
                    </>
                  )}
                </ScrollView>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

        {isHomeFocused ? (
        <Animated.View
          style={[styles.fab, { opacity: fabOpacity }]}
          pointerEvents="box-none"
        >
          {showTooltip && (
            <Animated.View
              style={[
                styles.tooltip,
                {
                  opacity: tooltipOpacity,
                  transform: [{ scale: tooltipScale }],
                },
              ]}
            >
              <TouchableOpacity onPress={dismissTooltip} activeOpacity={0.9}>
                <View style={styles.tooltipInner}>
                  <View style={styles.tooltipHeader}>
                    <View style={styles.tooltipIconWrap}>
                      <Svg width={11} height={11} viewBox="0 0 40 40" fill="none">
                        <Line x1="13" y1="11" x2="27" y2="11" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
                        <Path d="M27 11C27 11 13 11 13 20C13 29 27 29 27 29" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" fill="none" />
                        <Line x1="13" y1="29" x2="27" y2="29" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
                        <Circle cx="20" cy="20" r="2.5" fill={ACCENT} />
                      </Svg>
                    </View>
                    <Text style={styles.tooltipTitle}>{t('askSoz')}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.tooltipArrowBorder} />
              <View style={styles.tooltipArrowFill} />
            </Animated.View>
          )}
          <Animated.View
            style={[
              styles.fabShadow,
              {
                transform: [
                  { scale: pulseAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleFabPress}
              activeOpacity={1}
              style={styles.fabBtn}
            >
              <Svg width={22} height={22} viewBox="0 0 40 40" fill="none">
                <Line x1="13" y1="11" x2="27" y2="11" stroke={colors.background} strokeWidth="2.5" strokeLinecap="round" />
                <Path
                  d="M27 11C27 11 13 11 13 20C13 29 27 29 27 29"
                  stroke={colors.background}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <Line x1="13" y1="29" x2="27" y2="29" stroke={colors.background} strokeWidth="2.5" strokeLinecap="round" />
                <Circle cx="20" cy="20" r="2.5" fill={colors.background} />
              </Svg>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
        ) : null}
      </View>
      </Animated.View>

      <ShareVerseModal
        visible={shareModalVisible}
        onClose={closeShareModal}
        verseText={shareVerse.text}
        verseRef={shareVerse.ref}
      />

      <AmbientMusicModal visible={showTrackPicker} onClose={() => setShowTrackPicker(false)} />
      <SozAlert {...alertConfig} onDismiss={hideAlert} />

      <Modal
        visible={showSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowSearch(false);
          setSearchText('');
          setSearchResults([]);
        }}
      >
        <SafeAreaView style={[styles.searchModal, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.searchHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.searchInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginLeft: 12 }} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Ayet veya kelime ara..."
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchText('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  style={{ padding: 12 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchText('');
                setSearchResults([]);
              }}
              style={styles.searchCancelBtn}
            >
              <Text style={styles.searchCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>

          {searchText.length < 2 ? (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={40} color="rgba(196,149,80,0.25)" />
              <Text style={[styles.searchEmptyTitle, { color: colors.text }]}>Ayet Ara</Text>
              <Text style={[styles.searchEmptyDesc, { color: colors.textMuted }]}>Kelime veya ifade yazın</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <Text style={[styles.searchEmptyTitle, { color: colors.text }]}>Sonuç bulunamadı</Text>
              <Text style={[styles.searchEmptyDesc, { color: colors.textMuted }]}>
                {`\u201C${searchText}\u201D için eşleşme yok`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item, i) => `${item.book}-${item.chapter}-${item.verse}-${i}`}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <Text style={styles.searchResultCount}>{searchResults.length} sonuç bulundu</Text>
              }
              renderItem={({ item }) => {
                const query = searchText.toLowerCase();
                const text = item.text;
                const idx = text.toLowerCase().indexOf(query);
                const bookId = getBookIdByName(item.book);
                return (
                  <TouchableOpacity
                    style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setShowSearch(false);
                      setSearchText('');
                      setSearchResults([]);
                      if (bookId) {
                        router.push({
                          pathname: '/(tabs)/read',
                          params: {
                            bookId,
                            chapter: String(item.chapter),
                            highlightVerse: String(item.verse),
                          },
                        });
                      }
                    }}
                  >
                    <Text style={styles.searchResultRef}>
                      {item.book} {item.chapter}:{item.verse}
                    </Text>
                    <Text style={[styles.searchResultText, { color: colors.text }]} numberOfLines={3}>
                      {idx >= 0 ? text.slice(0, idx) : text}
                      {idx >= 0 && (
                        <Text style={styles.searchHighlight}>{text.slice(idx, idx + query.length)}</Text>
                      )}
                      {idx >= 0 ? text.slice(idx + query.length) : ''}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {showTutorial ? (
        <View style={styles.tutorialOverlay} pointerEvents="box-none">
          <View
            style={[
              styles.tutorialTooltip,
              tutorialPosition.cardStyle,
            ]}
          >
            {!tutorialPosition.showArrowDown ? (
              <View
                style={[
                  styles.tutorialArrow,
                  {
                    top: -12,
                    bottom: undefined,
                    transform: [{ rotate: '180deg' }],
                  },
                ]}
              />
            ) : null}
            <Text style={styles.tutorialText}>{HOME_TUTORIAL_STEPS[tutorialStep]?.message}</Text>
            <Text style={styles.tutorialStepText}>
              {tutorialStep + 1}/{HOME_TUTORIAL_STEPS.length}
            </Text>
            <TouchableOpacity style={styles.tutorialButton} onPress={nextTutorialStep} activeOpacity={0.86}>
              <Text style={styles.tutorialButtonText}>Anladım →</Text>
            </TouchableOpacity>
            {tutorialPosition.showArrowDown ? <View style={styles.tutorialArrow} /> : null}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

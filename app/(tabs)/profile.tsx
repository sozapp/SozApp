import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import {
  Animated,
  Dimensions,
  Easing,
  I18nManager,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { denominations } from '@/constants/denominations';
import { isRealAccount } from '@/constants/friend-activity';
import {
  getNtChaptersReadCount,
  getNewTestamentChapterTotal,
} from '@/constants/read-history';
import { getDailyStats } from '@/constants/stats-storage';
import type { PlanProgress } from '@/constants/storage';
import { deleteAccount, supabase } from '@/constants/supabase';
import AmbientMusicModal from '@/components/AmbientMusicModal';
import { FontSizeModal } from '@/components/FontSizeModal';
import { LineSpacingModal, type LineSpacingId } from '@/components/LineSpacingModal';
import { ThemePickerModal } from '@/components/ThemePickerModal';
import { fonts as themeFonts } from '@/constants/theme';
import { parseFavoritesRaw } from '@/hooks/useFavorites';
import { useAmbientMusic } from '@/context/AmbientMusicContext';
import { useDenomination } from '@/hooks/useDenomination';
import { usePremium } from '@/hooks/usePremium';
import { useTheme, type ThemeColors, type ThemeType } from '@/hooks/useTheme';
import { useTranslation } from '@/context/LanguageContext';
import { setI18nLocale, type Language } from '@/constants/i18n';
import type { User } from '@supabase/supabase-js';
import { useBadges } from '@/hooks/useBadges';
import { getBadgeProgress, type Badge } from '@/constants/badges';
import { exportBackup, importBackup } from '@/constants/backup';
import { SozAlert } from '@/components/SozAlert';
import { useSozAlert } from '@/hooks/useSozAlert';
import {
  requestNotificationPermission,
  scheduleDailyVerseNotification,
  scheduleStreakReminder,
} from '@/constants/notifications';

const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ku', name: 'Kurdî' },
  { code: 'hy', name: 'Հայերեն' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'ar', name: 'العربية' },
];

const LANGUAGE_LOCAL_NAME: Record<Language, string> = {
  tr: 'Turkce',
  en: 'English',
  de: 'Almanca / Deutsch',
  ku: 'Kurtce / Kurdi',
  hy: 'Ermenice / Հայերեն',
  el: 'Rumca / Ελληνικά',
  ar: 'Arapca / العربية',
};

const ACCENT = '#C4956A';
const ACCENT_LIGHT = '#FFF8EE';
const DANGER = 'rgba(220,80,60,0.7)';
const SCREEN_WIDTH = Dimensions.get('window').width;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

const themeNames: Record<ThemeType, string> = {
  day: 'Gündüz',
  night: 'Gece',
  sepia: 'Sepia',
  black: 'Siyah',
};

const STORAGE_PROFILE_IMAGE = '@soz/profileImage';
const STORAGE_USER_NAME = '@soz/userName';
const STORAGE_FONT_SIZE = '@soz/fontSize';
const STORAGE_SPEECH_RATE = '@soz/speechRate';
const STORAGE_NOTIFICATIONS = '@soz/notifications';
const STORAGE_LINE_SPACING = '@soz/lineSpacing';

const FONT_SIZE_LABELS: Record<number, string> = {
  14: 'Küçük',
  16: 'Rahat',
  18: 'Normal',
  20: 'Büyük',
  22: 'En büyük',
};

const SPACING_LABELS: Record<LineSpacingId, string> = {
  normal: 'Normal',
  wide: 'Geniş',
  wider: 'Çok Geniş',
};

function parseLineSpacingProfile(raw: string | null): LineSpacingId {
  if (raw === 'normal' || raw === 'wide' || raw === 'wider') return raw;
  if (raw === 'relaxed') return 'wide';
  return 'normal';
}
const SPEECH_OPTIONS = [
  { value: 0.7, label: 'Yavaş' },
  { value: 0.85, label: 'Normal' },
  { value: 1.1, label: 'Hızlı' },
];

const RESET_KEYS = [
  '@soz/notes',
  '@soz/noteTimestamps',
  '@soz/notesSyncSnapshot',
  '@soz/highlights',
  '@soz/highlightTimestamps',
  '@soz/highlightsSyncSnapshot',
  '@soz/favorites',
  '@soz/favoritesSyncSnapshot',
  '@soz/favoritedDailyVerse',
  '@soz/streak',
  '@soz/daysActive',
  '@soz/streakReminder',
  '@soz/planProgress',
  '@soz/memorizeList',
  '@soz/memorizeProgress',
  '@soz/memorizedVerses',
  '@soz/moodHistory',
  '@soz/lastMood',
  '@soz/lastMoodAt',
  '@soz/lastMoodResult',
  '@soz/chatHistory',
  '@soz/conversations',
  '@soz/lastAskResult',
  '@soz/savedAnswers',
  '@soz/readHistory',
  '@soz/readingHistory',
  '@soz/readNtChapters',
  '@soz/lastRead',
  '@soz/readingProgress',
  '@soz/stats/books',
  '@soz/stats/daily',
  '@soz/stats/today',
  '@soz/focusMinutes',
  '@soz/focusSessions',
  '@soz/totalGamesPlayed',
  '@soz/totalReflections',
  '@soz/earnedBadges',
  '@soz/prayers',
  '@soz/searchHistory',
  '@soz/church',
  '@soz/lastSyncTime',
  '@soz/premiumVerifiedCache',
  '@soz/shareActivity',
];

async function loadNotifications(): Promise<{
  dailyEnabled: boolean;
  streakEnabled: boolean;
  hour: number;
  minute: number;
}> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_NOTIFICATIONS);
    if (!raw) return { dailyEnabled: false, streakEnabled: true, hour: 8, minute: 0 };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      dailyEnabled: !!p.dailyEnabled,
      streakEnabled: p.streakEnabled !== false,
      hour: typeof p.hour === 'number' ? p.hour : 8,
      minute: typeof p.minute === 'number' ? p.minute : 0,
    };
  } catch {
    return { dailyEnabled: false, streakEnabled: true, hour: 8, minute: 0 };
  }
}

async function saveNotifications(prefs: { dailyEnabled: boolean; streakEnabled: boolean }): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_NOTIFICATIONS);
    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    await AsyncStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify({ ...prev, ...prefs }));
  } catch {
    /* ignore */
  }
}

function getMaxStreakFromPlans(data: Record<string, PlanProgress>): number {
  let max = 0;
  for (const p of Object.values(data)) {
    if (p?.streak > max) max = p.streak;
  }
  return max;
}

function getReadingProgressCount(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'number') return Math.max(0, Math.floor(parsed));
    if (typeof parsed === 'string') {
      const n = parseInt(parsed, 10);
      return Number.isNaN(n) ? 0 : Math.max(0, n);
    }
    if (parsed && typeof parsed === 'object') {
      const values = Object.values(parsed as Record<string, unknown>);
      let total = 0;
      for (const value of values) {
        if (typeof value === 'number' && Number.isFinite(value)) total += value;
        else if (value && typeof value === 'object') {
          for (const nested of Object.values(value as Record<string, unknown>)) {
            if (typeof nested === 'number' && Number.isFinite(nested)) total += nested;
          }
        }
      }
      return Math.max(0, Math.floor(total));
    }
  } catch {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return Math.max(0, n);
  }
  return 0;
}

function getPlanCompletedChapters(raw: string | null): number {
  if (!raw) return 0;
  try {
    const data = JSON.parse(raw) as Record<string, PlanProgress>;
    let total = 0;
    for (const value of Object.values(data)) {
      if (value?.completedDays && Array.isArray(value.completedDays)) {
        total += value.completedDays.length;
      }
    }
    return Math.max(0, total);
  } catch {
    return 0;
  }
}

function makeStyles(colors: ThemeColors, fonts: typeof themeFonts, bottomInset: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    header: {
      backgroundColor: colors.surface,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    avatarWrap: {
      position: 'relative' as const,
      width: 90,
      height: 90,
      borderRadius: 45,
      alignSelf: 'center',
      marginBottom: 12,
    },
    avatarCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: `${ACCENT}30`,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      overflow: 'hidden' as const,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: { width: 90, height: 90, borderRadius: 45 },
    avatarInitial: {
      fontSize: 32,
      color: ACCENT,
      fontFamily: fonts.regular,
    },
    premiumAvatarBadge: {
      position: 'absolute' as const,
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: ACCENT,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userName: {
      fontSize: 22,
      fontFamily: fonts.thin,
      color: colors.text,
      textAlign: 'center',
    },
    userEmail: {
      fontSize: 13,
      color: colors.textMuted,
      fontFamily: fonts.italic,
      textAlign: 'center',
      marginTop: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
      flexWrap: 'wrap',
    },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 4,
      paddingHorizontal: 10,
      gap: 4,
      backgroundColor: colors.card,
    },
    badgePillPremium: {
      borderColor: ACCENT,
      backgroundColor: `${ACCENT}20`,
    },
    badgePillPremiumRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    badgePillText: { fontSize: 12, color: ACCENT, fontFamily: fonts.regular },
    editBtn: {
      marginTop: 12,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    editBtnText: { fontSize: 13, color: ACCENT, fontFamily: fonts.regular },

    statsSection: { marginHorizontal: 16, marginTop: 20 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
      width: STAT_CARD_WIDTH,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      alignItems: 'flex-start',
    },
    statIcon: { marginBottom: 8 },
    statValue: {
      fontSize: 28,
      fontFamily: fonts.regular,
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'left',
      marginTop: 4,
      fontFamily: fonts.regular,
    },
    ntCard: {
      marginTop: 10,
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
    },
    ntRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ntTitle: { fontSize: 14, color: colors.text, fontFamily: fonts.medium },
    ntSub: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.regular },
    ntHint: { marginTop: 8, fontSize: 12, color: colors.textSecondary, fontFamily: fonts.regular },
    progressTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 2 },

    badgesSection: { marginHorizontal: 16, marginTop: 20 },
    sectionAccent: {
      fontSize: 10,
      letterSpacing: 2,
      color: ACCENT,
      fontFamily: fonts.medium,
      marginBottom: 8,
    },
    badgeScrollContent: { gap: 12, paddingVertical: 8 },
    badgeItem: { width: 70, alignItems: 'center', gap: 6 },
    badgeRingWrap: {
      width: 58,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeCircleEarned: {
      backgroundColor: `${ACCENT}20`,
      borderWidth: 2,
      borderColor: ACCENT,
    },
    badgeCircleLocked: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeLockOverlay: {
      position: 'absolute' as const,
      right: -2,
      bottom: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeName: {
      fontSize: 11,
      textAlign: 'center',
      fontFamily: fonts.regular,
    },
    badgeNameEarned: { color: colors.text },
    badgeNameLocked: { color: colors.textSecondary },

    settingsSection: { marginHorizontal: 16, marginTop: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.border,
      marginTop: 12,
    },
    cardTitle: {
      fontSize: 10,
      letterSpacing: 2,
      color: ACCENT,
      fontFamily: fonts.medium,
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: { width: 32, alignItems: 'center' },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.regular },
    rowTitleDimmed: { opacity: 0.6 },
    rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fonts.regular },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowValue: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    settingRowBorder: { borderTopWidth: 0 },
    settingIconWrap: { width: 32, alignItems: 'center', marginRight: 12 },
    settingContent: { flex: 1 },
    settingTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.regular },
    settingSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fonts.regular },
    settingValue: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular, marginRight: 4 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    timePickerSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textMuted,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    reminderSheetCaption: {
      fontSize: 10,
      letterSpacing: 2,
      color: colors.textMuted,
      fontFamily: fonts.medium,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    timeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    timeOptionActive: {
      backgroundColor: 'rgba(196,149,80,0.06)',
    },
    timeOptionText: {
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    timeOptionTextActive: {
      color: ACCENT,
      fontFamily: fonts.medium,
    },
    segmentRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    segmentBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    segmentBtnActive: { backgroundColor: ACCENT },
    segmentBtnText: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
    segmentBtnTextActive: { color: '#fff' },
    authCtaTitle: { fontSize: 15, color: ACCENT, fontFamily: fonts.medium },
    dangerText: { fontSize: 15, color: DANGER, fontFamily: fonts.regular },

    footer: { marginHorizontal: 16, marginTop: 20, marginBottom: 40 },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 0.5,
      borderColor: colors.borderStrong,
      borderRadius: 10,
      padding: 14,
    },
    shareBtnText: { fontSize: 15, color: ACCENT, fontFamily: fonts.regular },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
      maxHeight: '80%',
    },
    langSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: bottomInset + 16,
      maxHeight: '84%',
    },
    langDragHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    langSheetTitle: {
      fontSize: 18,
      fontFamily: fonts.regular,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      color: colors.text,
      fontFamily: fonts.medium,
      textAlign: 'center',
      marginBottom: 16,
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    langRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    langRowActive: {
      backgroundColor: `${ACCENT}10`,
      borderLeftWidth: 3,
      borderLeftColor: ACCENT,
    },
    langIconWrap: {
      width: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    langBody: {
      flex: 1,
    },
    langLocalName: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    langName: {
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    langNameActive: {
      color: ACCENT,
      fontFamily: fonts.medium,
    },
    sheetRowText: { fontSize: 17, color: colors.text, fontFamily: fonts.regular },
    inputLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6, fontFamily: fonts.regular },
    input: {
      borderWidth: 0.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: fonts.regular,
      color: colors.text,
    },
    inputDisabled: { opacity: 0.6 },
    saveBtn: {
      backgroundColor: ACCENT,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    saveBtnText: { fontSize: 16, color: '#fff', fontFamily: fonts.medium },
    cancelBtn: { alignItems: 'center', paddingVertical: 16 },
    badgeTipBox: {
      marginHorizontal: 24,
      padding: 24,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    badgeTipName: { fontSize: 18, color: colors.text, fontFamily: fonts.medium, marginBottom: 8 },
    badgeTipDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fonts.regular },
    langToast: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: bottomInset + 20,
      backgroundColor: `${ACCENT}E6`,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    langToastText: {
      color: '#FFF8EE',
      fontSize: 13,
      fontFamily: fonts.regular,
    },
  });
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language, changeLanguage } = useTranslation();
  const { colors, fonts, activeTheme, changeTheme, loadFromStorage } = useTheme();
  const { isPremium } = usePremium();
  const { denomination, changeDenomination } = useDenomination();

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState('Misafir Kullanıcı');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [totalVerses, setTotalVerses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [streakNotif, setStreakNotif] = useState(true);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState('Normal');
  const [lineSpacing, setLineSpacing] = useState<LineSpacingId>('normal');
  const [churchGroupName, setChurchGroupName] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [ntChaptersRead, setNtChaptersRead] = useState(0);
  const [planChaptersRead, setPlanChaptersRead] = useState(0);

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [denomModalVisible, setDenomModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNameDraft, setEditNameDraft] = useState('');
  const [badgeTip, setBadgeTip] = useState<Badge | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSpacingPicker, setShowSpacingPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [langToastVisible, setLangToastVisible] = useState(false);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const { currentTrack: ambientTrack, isPlaying: ambientPlaying } = useAmbientMusic();
  const { earnedBadges, checkBadges, stats: badgeStats, ALL_BADGES } = useBadges();
  const progressAnim = useMemo(() => new Animated.Value(0), []);

  const styles = useMemo(() => makeStyles(colors, fonts, insets.bottom), [colors, fonts, insets.bottom]);

  useFocusEffect(
    useCallback(() => {
      loadFromStorage();
    }, [loadFromStorage])
  );

  const ntTotal = useMemo(() => getNewTestamentChapterTotal(), []);
  const progressPct = ntTotal > 0 ? Math.min(100, Math.round((planChaptersRead / ntTotal) * 100)) : 0;
  const remainingChapters = Math.max(0, ntTotal - planChaptersRead);
  const dailyChapterGoal = 2;
  const estimatedDays = Math.ceil(remainingChapters / dailyChapterGoal);
  const denomMeta = useMemo(
    () => denominations.find((d) => d.id === denomination),
    [denomination]
  );
  const denomName = denomMeta?.name ?? 'Diğer';

  const loadAll = useCallback(async () => {
    let avatarFromServer = false;
    try {
      if (!supabase) {
        console.log('Supabase not available, using local storage');
        setUser(null);
        setUserEmail(null);
        try {
          const name = await AsyncStorage.getItem(STORAGE_USER_NAME);
          setUserName(name?.trim() || 'Misafir Kullanıcı');
        } catch {
          setUserName('Misafir Kullanıcı');
        }
        setFriendCount(0);
      } else {
        const { data: { user: u } } = await supabase.auth.getUser();
        setUser(u ?? null);
        const email = u?.email?.trim() ?? null;
        setUserEmail(email);

        if (u && isRealAccount(u)) {
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', u.id)
              .maybeSingle();
            const name =
              (prof?.display_name as string)?.trim() ||
              (u.user_metadata?.display_name as string)?.trim() ||
              u.email?.split('@')[0] ||
              'Kullanıcı';
            setUserName(name);
            if (prof?.avatar_url) {
              avatarFromServer = true;
              setProfileImage(prof.avatar_url as string);
              await AsyncStorage.setItem(STORAGE_PROFILE_IMAGE, prof.avatar_url as string).catch(() => {});
            }
          } catch {
            setUserName(u.email?.split('@')[0] ?? 'Kullanıcı');
          }
          try {
            const { data, error } = await supabase
              .from('friendships')
              .select('id')
              .eq('status', 'accepted')
              .or(`user_id.eq.${u.id},friend_id.eq.${u.id}`);
            if (!error && data) setFriendCount(data.length);
            else setFriendCount(0);
          } catch {
            setFriendCount(0);
          }
        } else {
          try {
            const name = await AsyncStorage.getItem(STORAGE_USER_NAME);
            setUserName(name?.trim() || 'Misafir Kullanıcı');
          } catch {
            setUserName('Misafir Kullanıcı');
          }
          setFriendCount(0);
        }
      }

      if (!avatarFromServer) {
        try {
          const img = await AsyncStorage.getItem(STORAGE_PROFILE_IMAGE);
          setProfileImage(img ?? null);
        } catch {
          setProfileImage(null);
        }
      }

      try {
        const rp = await AsyncStorage.getItem('@soz/readingProgress');
        const countFromProgress = getReadingProgressCount(rp);
        if (countFromProgress > 0) {
          setTotalVerses(countFromProgress);
        } else {
          const daily = await getDailyStats();
          let sum = 0;
          for (const k of Object.keys(daily)) sum += daily[k] ?? 0;
          setTotalVerses(sum);
        }
      } catch {
        setTotalVerses(0);
      }

      try {
        const str = await AsyncStorage.getItem('@soz/streak');
        if (str != null) {
          const n = parseInt(str, 10);
          setStreak(Number.isNaN(n) ? 0 : n);
        } else {
          try {
            const raw = await AsyncStorage.getItem('@soz/plan-progress');
            const data = raw ? (JSON.parse(raw) as Record<string, PlanProgress>) : {};
            setStreak(getMaxStreakFromPlans(data));
          } catch {
            setStreak(0);
          }
        }
      } catch {
        setStreak(0);
      }

      try {
        const favRaw = await AsyncStorage.getItem('@soz/favorites');
        const items = parseFavoritesRaw(favRaw);
        setFavCount(items.length);
      } catch {
        setFavCount(0);
      }

      try {
        const fm = await AsyncStorage.getItem('@soz/focusMinutes');
        setFocusMinutes(fm != null ? Math.max(0, parseInt(fm, 10)) : 0);
      } catch {
        setFocusMinutes(0);
      }

      try {
        const fs = await AsyncStorage.getItem(STORAGE_FONT_SIZE);
        if (fs != null) {
          const n = parseInt(fs, 10);
          if (n >= 14 && n <= 22) setFontSize(n);
        }
      } catch {
        /* ignore */
      }

      try {
        const notifData = await AsyncStorage.multiGet([
          '@soz/dailyReminder',
          '@soz/reminderTime',
          '@soz/streakNotif',
        ]);
        setDailyReminder(notifData[0][1] === 'true');
        setReminderTime(notifData[1][1] || '08:00');
        setStreakNotif(notifData[2][1] !== 'false');
      } catch {
        /* ignore */
      }

      try {
        const ls = await AsyncStorage.getItem(STORAGE_LINE_SPACING);
        setLineSpacing(parseLineSpacingProfile(ls));
      } catch {
        setLineSpacing('normal');
      }

      try {
        const sr = await AsyncStorage.getItem(STORAGE_SPEECH_RATE);
        const v = sr != null ? parseFloat(sr) : 0.85;
        const opt = SPEECH_OPTIONS.find((o) => Math.abs(o.value - v) < 0.02);
        setSpeechSpeed(opt?.label ?? 'Normal');
      } catch {
        setSpeechSpeed('Normal');
      }

      try {
        const raw = await AsyncStorage.getItem('@soz/church');
        if (raw) {
          const data = JSON.parse(raw) as { groupName?: string };
          setChurchGroupName(data?.groupName ?? null);
        } else {
          setChurchGroupName(null);
        }
      } catch {
        setChurchGroupName(null);
      }

      try {
        const [modernRaw, legacyRaw] = await AsyncStorage.multiGet(['@soz/planProgress', '@soz/plan-progress']);
        const planRaw = modernRaw[1] ?? legacyRaw[1];
        const planChapters = getPlanCompletedChapters(planRaw);
        const readChapters = await getNtChaptersReadCount();
        const chapters = Math.max(planChapters, readChapters);
        setPlanChaptersRead(chapters);
        setNtChaptersRead(chapters);
      } catch {
        setPlanChaptersRead(0);
        setNtChaptersRead(0);
      }

      await checkBadges();
    } catch {
      /* ignore */
    }
  }, [checkBadges]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useFocusEffect(
    useCallback(() => {
      Animated.timing(progressAnim, {
        toValue: ntTotal > 0 ? Math.min(1, planChaptersRead / ntTotal) : 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, [planChaptersRead, ntTotal, progressAnim])
  );

  const pickImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert(t('permTitle'), t('permGallery'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      // Sunucuya yüklenene kadar ekranda hemen görünsün diye önce yerel gösterim.
      setProfileImage(uri);
      try {
        await AsyncStorage.setItem(STORAGE_PROFILE_IMAGE, uri);
      } catch {
        /* ignore */
      }

      if (!supabase) return;
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u || !isRealAccount(u)) return;

      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const path = `${u.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        // Aynı yoldaki eski dosyanın cache'lenmiş görüntüsü yerine yenisi gösterilsin.
        const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: bustedUrl })
          .eq('id', u.id);
        if (updateError) throw updateError;

        setProfileImage(bustedUrl);
        await AsyncStorage.setItem(STORAGE_PROFILE_IMAGE, bustedUrl).catch(() => {});
      } catch (e) {
        console.log('Avatar upload error:', e);
        showAlert('Yüklenemedi', 'Fotoğraf sunucuya yüklenemedi, bu cihazda görünmeye devam edecek.');
      }
    } catch {
      /* ignore */
    }
  }, [t, showAlert]);

  const openEditProfile = useCallback(() => {
    setEditNameDraft(userName);
    setEditModalVisible(true);
  }, [userName]);

  const saveEditProfile = useCallback(async () => {
    const trimmed = editNameDraft.trim();
    if (!trimmed) return;
    setSavingProfile(true);
    try {
      if (user && isRealAccount(user)) {
        if (!supabase) {
          console.log('Supabase not available, using local storage');
          await AsyncStorage.setItem(STORAGE_USER_NAME, trimmed);
        } else {
          const { error } = await supabase
            .from('profiles')
            .update({ display_name: trimmed })
            .eq('id', user.id);
          if (error) throw error;
        }
      } else {
        await AsyncStorage.setItem(STORAGE_USER_NAME, trimmed);
      }
      setUserName(trimmed);
      setEditModalVisible(false);
    } catch {
      showAlert('Söz', 'Kaydedilemedi.');
    } finally {
      setSavingProfile(false);
    }
  }, [editNameDraft, user]);

  const handleFontSize = useCallback(async (size: number) => {
    setFontSize(size);
    try {
      await AsyncStorage.setItem(STORAGE_FONT_SIZE, String(size));
    } catch {
      /* ignore */
    }
  }, []);

  const handleSpeechSpeed = useCallback(async (value: number, label: string) => {
    setSpeechSpeed(label);
    try {
      await AsyncStorage.setItem(STORAGE_SPEECH_RATE, String(value));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleDailyNotification = useCallback(
    async (value: boolean) => {
      setDailyReminder(value);
      try {
        if (value) {
          const granted = await requestNotificationPermission();
          if (granted) {
            const hour = Number(reminderTime.split(':')[0] ?? '8');
            await scheduleDailyVerseNotification(Number.isNaN(hour) ? 8 : hour);
            await AsyncStorage.setItem('@soz/dailyNotification', 'true');
            await AsyncStorage.setItem('@soz/dailyReminder', 'true');
          } else {
            setDailyReminder(false);
          }
        } else {
          await Notifications.cancelAllScheduledNotificationsAsync();
          await AsyncStorage.setItem('@soz/dailyNotification', 'false');
          await AsyncStorage.setItem('@soz/dailyReminder', 'false');
        }
        Haptics.selectionAsync();
      } catch {
        /* ignore */
      }
    },
    [reminderTime]
  );

  const toggleStreakReminder = useCallback(async (value: boolean) => {
    setStreakNotif(value);
    try {
      if (value) {
        await scheduleStreakReminder();
        await AsyncStorage.setItem('@soz/streakReminder', 'true');
        await AsyncStorage.setItem('@soz/streakNotif', 'true');
      } else {
        await AsyncStorage.setItem('@soz/streakReminder', 'false');
        await AsyncStorage.setItem('@soz/streakNotif', 'false');
      }
      Haptics.selectionAsync();
    } catch {
      /* ignore */
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        ...RESET_KEYS,
        '@soz/onboarded',
        '@soz/onboardingComplete',
        '@soz/onboardingSeen',
      ]);
    } catch {
      /* ignore */
    }
    router.replace('/onboarding');
  }, [router]);

  const handleReset = useCallback(() => {
    showAlert('Tüm Veriyi Sıfırla', 'Notların, favorilerin ve ilerlemen silinecek. Bu işlem geri alınamaz.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: clearAllData },
    ]);
  }, [clearAllData, showAlert]);

  const handleDeleteAccount = useCallback(() => {
    showAlert(
      'Hesabı Sil',
      'Hesabın ve sunucudaki tüm verilerin (notlar, favoriler, ilerleme, kilise grubu üyeliği) kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAccount();
            if (!result.ok) {
              showAlert('Silinemedi', result.error ?? 'Bir hata oluştu, tekrar dene.');
              return;
            }
            try {
              if (supabase) await supabase.auth.signOut();
            } catch {
              /* ignore */
            }
            await clearAllData();
          },
        },
      ]
    );
  }, [clearAllData, showAlert]);

  const shareProgress = useCallback(() => {
    Share.share({
      message: `Söz uygulamasında ${streak} günlük serim var! 📖 sozapp.com`,
      title: 'Söz — Türkçe İncil',
    }).catch(() => {});
  }, [streak]);

  const initials = useMemo(() => {
    const n = userName.trim() || userEmail?.split('@')[0] || '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [userName, userEmail]);

  const currentLang = LANGUAGES.find((o) => o.code === language);

  useEffect(() => {
    console.log('Current language:', language);
  }, [language]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BÖLÜM 1 — Profil Header */}
        <View style={styles.header}>
          <Pressable style={styles.avatarWrap} onPress={pickImage}>
            <View style={styles.avatarCircle}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>{initials}</Text>
              )}
            </View>
            {isPremium ? (
              <View style={styles.premiumAvatarBadge}>
                <Ionicons name="star" size={13} color={colors.background} />
              </View>
            ) : null}
          </Pressable>
          <Text style={styles.userName}>{userName}</Text>
          {userEmail ? <Text style={styles.userEmail}>{userEmail}</Text> : null}

          <View style={styles.badgeRow}>
            <View style={styles.badgePill}>
              <Ionicons
                name={(denomMeta?.icon ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap}
                size={12}
                color={ACCENT}
              />
              <Text style={styles.badgePillText}>{denomName}</Text>
            </View>
            {isPremium ? (
              <View style={[styles.badgePill, styles.badgePillPremium]}>
                <View style={styles.badgePillPremiumRow}>
                <Ionicons name="star" size={14} color={ACCENT} />
                <Text style={styles.badgePillText}>Premium</Text>
              </View>
              </View>
            ) : null}
          </View>

          <Pressable style={styles.editBtn} onPress={openEditProfile}>
            <Ionicons name="pencil-outline" size={14} color={ACCENT} />
            <Text style={styles.editBtnText}>Düzenle</Text>
          </Pressable>
        </View>

        {/* BÖLÜM 2 — İstatistikler */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="book-outline" size={22} color={ACCENT} style={styles.statIcon} />
              <Text style={styles.statValue}>{totalVerses}</Text>
              <Text style={styles.statLabel}>Okunan Ayet</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star-outline" size={22} color={ACCENT} style={styles.statIcon} />
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>En Uzun Seri</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="heart-outline" size={22} color={ACCENT} style={styles.statIcon} />
              <Text style={styles.statValue}>{favCount}</Text>
              <Text style={styles.statLabel}>Favori Ayet</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="moon-outline" size={22} color={ACCENT} style={styles.statIcon} />
              <Text style={styles.statValue}>{focusMinutes}</Text>
              <Text style={styles.statLabel}>Odak Modu</Text>
            </View>
          </View>

          <View style={styles.ntCard}>
            <View style={styles.ntRow}>
              <Text style={styles.ntTitle}>Yeni Ahit</Text>
              <Text style={styles.ntSub}>{planChaptersRead} / {ntTotal} bölüm</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.ntHint}>
              {remainingChapters} bölüm kaldı · ~{estimatedDays} gün
            </Text>
          </View>
        </View>

        {/* BÖLÜM 3 — Rozetler */}
        <View style={styles.badgesSection}>
          <Text style={styles.sectionAccent}>{t('badges')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgeScrollContent}
          >
            {ALL_BADGES.map((b) => {
              const earned = earnedBadges.includes(b.id);
              const progress = earned ? 1 : getBadgeProgress(b, badgeStats);
              const ringRadius = 27;
              const ringCircumference = 2 * Math.PI * ringRadius;
              return (
                <Pressable key={b.id} style={styles.badgeItem} onPress={() => setBadgeTip(b)}>
                  <View style={styles.badgeRingWrap}>
                    <Svg width={58} height={58} style={StyleSheet.absoluteFillObject}>
                      <Circle
                        cx={29}
                        cy={29}
                        r={ringRadius}
                        stroke={colors.border}
                        strokeWidth={3}
                        fill="none"
                      />
                      {progress > 0 && (
                        <Circle
                          cx={29}
                          cy={29}
                          r={ringRadius}
                          stroke={ACCENT}
                          strokeWidth={3}
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                          strokeDashoffset={ringCircumference * (1 - progress)}
                          rotation={-90}
                          origin={[29, 29]}
                        />
                      )}
                    </Svg>
                    <View
                      style={[
                        styles.badgeCircle,
                        earned ? styles.badgeCircleEarned : styles.badgeCircleLocked,
                      ]}
                    >
                      <Ionicons
                        name={b.icon as keyof typeof Ionicons.glyphMap}
                        size={26}
                        color={earned ? ACCENT : colors.border}
                      />
                      {!earned ? (
                        <View style={styles.badgeLockOverlay}>
                          <Ionicons name="lock-closed-outline" size={14} color={colors.border} />
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text
                    style={[styles.badgeName, earned ? styles.badgeNameEarned : styles.badgeNameLocked]}
                    numberOfLines={2}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* BÖLÜM 4 — Ayarlar */}
        <View style={styles.settingsSection}>
          {/* Kart 1 — Okuma */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('readingSettings')}</Text>
            <Pressable style={styles.row} onPress={() => setShowThemePicker(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="contrast-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('readingTheme')}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{themeNames[activeTheme]}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
            <Pressable style={styles.row} onPress={() => setShowFontPicker(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="text-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('fontSize')}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>
                  {FONT_SIZE_LABELS[fontSize] ?? `${fontSize}px`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
            <Pressable style={styles.row} onPress={() => setShowSpacingPicker(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="reorder-four-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('lineSpacing')}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{SPACING_LABELS[lineSpacing]}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
            <Pressable style={[styles.row, styles.rowLast]} onPress={() => setShowMusicModal(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="musical-notes-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Ortam Müziği</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {ambientPlaying && ambientTrack?.id !== 'silence'
                    ? ambientTrack?.name ?? '—'
                    : 'Kapalı'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>

          {/* Kart 2 — Kişiselleştirme */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('personalization')}</Text>
            <Pressable style={styles.row} onPress={() => setLangModalVisible(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="language-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('language')}</Text>
                <Text style={styles.rowSub}>{currentLang ? currentLang.name : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable style={styles.row} onPress={() => setDenomModalVisible(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="triangle-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('denomination')}</Text>
                <Text style={styles.rowSub}>{denomName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() => router.push('/church')}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="people-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('churchGroupSetting')}</Text>
                <Text style={styles.rowSub}>{churchGroupName ?? 'Yok'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable style={[styles.row, styles.rowLast]} onPress={() => router.push('/reading-history')}>
              <View style={styles.rowIcon}>
                <Ionicons name="time-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Okuma Geçmişi</Text>
                <Text style={styles.rowSub}>Tüm okunanlar</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Kart 3 — Bildirimler */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('notifications')}</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="notifications-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('dailyReminder')}</Text>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={toggleDailyNotification}
                trackColor={{
                  false: colors.border,
                  true: 'rgba(196,149,80,0.4)',
                }}
                thumbColor={dailyReminder ? ACCENT : colors.surface}
              />
            </View>
            {dailyReminder && (
              <TouchableOpacity
                style={[styles.settingRow, styles.settingRowBorder]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconWrap}>
                  <Ionicons name="time-outline" size={18} color={ACCENT} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('reminderTime')}</Text>
                </View>
                <Text style={styles.settingValue}>{reminderTime}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="flame-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('streakNotif')}</Text>
                <Text style={styles.settingSubtitle}>Seriyi korumak için hatırlat</Text>
              </View>
              <Switch
                value={streakNotif}
                onValueChange={toggleStreakReminder}
                trackColor={{
                  false: colors.border,
                  true: 'rgba(196,149,80,0.4)',
                }}
                thumbColor={streakNotif ? ACCENT : colors.surface}
              />
            </View>
          </View>

          {/* Kart 4 — Hesap */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>HESAP</Text>
            {userEmail ? (
              <>
                <Pressable style={styles.row} onPress={() => router.push('/change-email')}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="person-outline" size={18} color={ACCENT} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{userEmail}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
                <Pressable style={styles.row} onPress={() => router.push('/change-password')}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="key-outline" size={18} color={ACCENT} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>Şifremi Değiştir</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  style={[styles.row, isPremium && styles.rowLast]}
                  onPress={async () => {
                    try {
                      if (supabase) await supabase.auth.signOut();
                      else console.log('Supabase not available, using local storage');
                      router.replace('/auth');
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name="log-out-outline" size={18} color={DANGER} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.dangerText}>{t('signOut')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[styles.row, styles.rowLast]}
                onPress={() => router.push('/auth')}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="person-add-outline" size={18} color={ACCENT} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.authCtaTitle}>{t('signIn')}</Text>
                  <Text style={styles.rowSub}>{t('signInDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )}

            {!isPremium && (
              <Pressable style={[styles.row, styles.rowLast]} onPress={() => router.push('/paywall')}>
                <View style={styles.rowIcon}>
                  <Ionicons name="diamond-outline" size={18} color={ACCENT} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.authCtaTitle}>{t('goPremium')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Kart 5 — Veri */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>VERİ</Text>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  await exportBackup();
                } catch {
                  showAlert('Hata', 'Yedek oluşturulamadı.');
                }
              }}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="cloud-upload-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Yedeği Dışa Aktar</Text>
                <Text style={styles.rowSub}>Notlar, favoriler ve ilerleme</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  const result = await DocumentPicker.getDocumentAsync({
                    type: 'application/json',
                  });
                  if (!result.canceled && result.assets[0]) {
                    await importBackup(result.assets[0].uri);
                    showAlert('Başarılı', 'Veriler geri yüklendi!');
                    await loadAll();
                  }
                } catch (e: any) {
                  showAlert('Hata', e?.message ?? 'Geri yükleme başarısız.');
                }
              }}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="cloud-download-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Yedeği İçe Aktar</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <Pressable style={[styles.row, !userEmail && styles.rowLast]} onPress={handleReset}>
              <View style={styles.rowIcon}>
                <Ionicons name="trash-outline" size={18} color={DANGER} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.dangerText}>Veriyi Sıfırla</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            {userEmail ? (
              <Pressable style={[styles.row, styles.rowLast]} onPress={handleDeleteAccount}>
                <View style={styles.rowIcon}>
                  <Ionicons name="person-remove-outline" size={18} color={DANGER} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.dangerText}>Hesabı Sil</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Kart 6 — Destek & Hakkında */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>DESTEK & HAKKINDA</Text>
            <Pressable style={styles.row} onPress={() => router.push('/donate')}>
              <View style={styles.rowIcon}>
                <Ionicons name="heart-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('donate')}</Text>
                <Text style={styles.rowSub}>{t('donateDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() =>
                Share.share({ message: 'Söz İncil uygulamasını dene: sozapp.com' }).catch(() => {})
              }
            >
              <View style={styles.rowIcon}>
                <Ionicons name="share-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('inviteFriend')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={async () => {
                try {
                  if (await StoreReview.isAvailableAsync()) {
                    await StoreReview.requestReview();
                  }
                } catch {
                  /* ignore */
                }
              }}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="star-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('rateApp')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() => Linking.openURL('https://sozapp.com/gizlilik').catch(() => {})}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="shield-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() => Linking.openURL('https://sozapp.com/kosullar').catch(() => {})}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('termsOfUse')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowIcon}>
                <Ionicons name="information-circle-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{t('aboutApp')}</Text>
              </View>
              <Text style={styles.rowValue}>
                v{Constants.expoConfig?.version ?? '1.0.0'} · Söz
              </Text>
            </View>
          </View>
        </View>

        {/* BÖLÜM 5 — Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.shareBtn} onPress={shareProgress}>
            <Ionicons name="share-outline" size={18} color={ACCENT} />
            <Text style={styles.shareBtnText}>İlerlemeni Paylaş</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal visible={langModalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setLangModalVisible(false)}>
          <Pressable style={styles.langSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.langDragHandle} />
            <Text style={styles.langSheetTitle}>Dil Sec</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  onPress={async () => {
                    try {
                      await AsyncStorage.setItem('@soz/language', item.code);
                      setI18nLocale(item.code);
                      await changeLanguage(item.code);
                      I18nManager.forceRTL(item.code === 'ar');
                      setLangModalVisible(false);
                      setLangToastVisible(true);
                      setTimeout(() => setLangToastVisible(false), 1200);
                      Haptics.selectionAsync();
                    } catch (e) {
                      console.log('Language change error:', e);
                    }
                  }}
                  style={[
                    styles.langRow,
                    language === item.code && styles.langRowActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.langIconWrap}>
                    <Ionicons
                      name="language-outline"
                      size={20}
                      color={language === item.code ? ACCENT : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.langBody}>
                    <Text
                      style={[
                        styles.langName,
                        language === item.code && styles.langNameActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.langLocalName}>{LANGUAGE_LOCAL_NAME[item.code]}</Text>
                  </View>
                  {language === item.code ? <Ionicons name="checkmark" size={18} color={ACCENT} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      {langToastVisible ? (
        <View pointerEvents="none" style={styles.langToast}>
          <Text style={styles.langToastText}>Dil degistirildi ✓</Text>
        </View>
      ) : null}

      <Modal visible={denomModalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setDenomModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Mezhep</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {denominations.map((d) => (
                <Pressable
                  key={d.id}
                  style={styles.sheetRow}
                  onPress={() => {
                    try {
                      changeDenomination(d.id);
                      setDenomModalVisible(false);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  <Text style={styles.sheetRowText}>{d.name}</Text>
                  {denomination === d.id ? (
                    <Ionicons name="checkmark-circle" size={22} color={ACCENT} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setEditModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Profili Düzenle</Text>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>İsim</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={editNameDraft}
              onChangeText={setEditNameDraft}
              placeholder="Adınız"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>E-posta</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={userEmail ?? '—'}
              editable={false}
            />
            <Pressable
              style={styles.saveBtn}
              onPress={saveEditProfile}
              disabled={savingProfile}
            >
              <Text style={styles.saveBtnText}>{savingProfile ? 'Kaydediliyor…' : 'Kaydet'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
              <Text style={[styles.rowValue, { color: colors.textMuted }]}>İptal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={badgeTip != null} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setBadgeTip(null)}>
          <Pressable style={styles.badgeTipBox} onPress={(e) => e.stopPropagation()}>
            {badgeTip ? (
              <>
                <View style={{ marginBottom: 8 }}>
                  <Ionicons name={badgeTip.icon} size={40} color={ACCENT} />
                </View>
                <Text style={styles.badgeTipName}>{badgeTip.name}</Text>
                <Text style={styles.badgeTipDesc}>{badgeTip.description}</Text>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {showTimePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showTimePicker}
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={() => setShowTimePicker(false)}>
              <View style={[styles.modalBackdrop, { flex: 1 }]} />
            </TouchableWithoutFeedback>
            <View style={styles.timePickerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.reminderSheetCaption}>HATIRLATMA SAATİ</Text>
            {['06:00', '07:00', '08:00', '09:00', '10:00', '20:00', '21:00', '22:00'].map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeOption,
                  reminderTime === time && styles.timeOptionActive,
                ]}
                onPress={async () => {
                  setReminderTime(time);
                  try {
                    await AsyncStorage.setItem('@soz/reminderTime', time);
                    if (dailyReminder) {
                      const hour = Number(time.split(':')[0] ?? '8');
                      await scheduleDailyVerseNotification(Number.isNaN(hour) ? 8 : hour);
                    }
                    setShowTimePicker(false);
                    Haptics.selectionAsync();
                  } catch {
                    /* ignore */
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    { color: colors.text },
                    reminderTime === time && styles.timeOptionTextActive,
                  ]}
                >
                  {time}
                </Text>
                {reminderTime === time && (
                  <Ionicons name="checkmark" size={18} color={ACCENT} />
                )}
              </TouchableOpacity>
            ))}
            </View>
          </View>
        </Modal>
      )}
      <ThemePickerModal visible={showThemePicker} onClose={() => setShowThemePicker(false)} />
      <LineSpacingModal
        visible={showSpacingPicker}
        onClose={() => setShowSpacingPicker(false)}
        currentSpacing={lineSpacing}
        onSelect={async (s) => {
          setLineSpacing(s);
          try {
            await AsyncStorage.setItem(STORAGE_LINE_SPACING, s);
          } catch {
            /* ignore */
          }
        }}
      />
      <FontSizeModal
        visible={showFontPicker}
        onClose={() => setShowFontPicker(false)}
        currentSize={fontSize}
        onSelect={(size) => handleFontSize(size)}
      />
      <AmbientMusicModal visible={showMusicModal} onClose={() => setShowMusicModal(false)} />
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
}

import { bookList, getBookIndex, getVerseRefFromVerseId, oldTestamentBooks } from '@/constants/bible-index';
import { getPsalmByNumber, psalmNumbers } from '@/constants/psalms';
import { sampleChapter1878 } from '@/constants/bible-1878';
import { getContextNote } from '@/constants/context-notes';
import { ChapterContextModal } from '@/components/ChapterContextModal';
import {
  getHighlightPaletteEntry,
  HIGHLIGHT_COLORS,
} from '@/constants/highlight-colors';
import {
  bibleLanguageNames,
  getBibleChapter,
  TR_TO_EN_NAME,
  type BibleLanguage,
} from '@/constants/multilingual-bible';
import { getEnglishChapterTexts } from '@/constants/bibleLoader';
import {
  type BibleVersion,
  getTTSLanguage,
  STORAGE_BIBLE_VERSION,
  STORAGE_PARALLEL_EN,
  VERSION_LABELS,
} from '@/constants/bibleVersions';
import { newTestament } from '@/constants/new-testament';
import { FREE_LIMITS } from '@/constants/premium';
import { logFriendActivity } from '@/constants/friend-activity';
import { trackEvent } from '@/constants/analytics';
import { addToReadHistory, saveLastRead } from '@/constants/read-history';
import { buildShareMessage } from '@/constants/share-verse';
import { supabase } from '@/constants/supabase';
import { recordVerseViews } from '@/constants/stats-storage';
import { colors, fonts } from '@/constants/theme';
import { type ThemeType } from '@/hooks/useTheme';
import { useFavorites } from '@/hooks/useFavorites';
import { useHaptics } from '@/hooks/useHaptics';
import { usePremium } from '@/hooks/usePremium';
import { useSpeech } from '@/context/SpeechContext';
import { useSync } from '@/hooks/useSync';
import { useAmbientMusic } from '@/context/AmbientMusicContext';
import { useNetwork } from '@/context/NetworkContext';
import { useTabPulse } from '@/context/TabPulseContext';
import { useTranslation } from '@/context/LanguageContext';
import AmbientMusicModal, { MiniWaveBar } from '@/components/AmbientMusicModal';
import { useTheme } from '@/hooks/useTheme';
import { useAnalyticsScreen } from '@/hooks/useAnalyticsScreen';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FontSizeModal } from '@/components/FontSizeModal';
import { LineSpacingModal } from '@/components/LineSpacingModal';
import { ReadingOptionsSheet } from '@/components/ReadingOptionsSheet';
import { ReadScreenSkeleton } from '@/components/skeletons/ReadScreenSkeleton';
import ShareVerseModal from '@/components/ShareVerseModal';
import { ThemePickerModal } from '@/components/ThemePickerModal';
import { Toast } from '@/components/Toast';

type VerseItem = { number: number; text: string };

const ACCENT = '#C4956A';

/**
 * Tek dokunma (ses ikonu) ile çift dokunmayı (favori) Exclusive ile ayırır.
 * Uzun basma Pressable'da kalır — Exclusive(tap, longPress) uzun basmayı geciktirdiği için.
 */
function VerseGesturePressable({
  style,
  onSingleTap,
  onDoubleTap,
  onLongPress,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  onSingleTap: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
  children: ReactNode;
}) {
  const onSingleTapRef = useRef(onSingleTap);
  const onDoubleTapRef = useRef(onDoubleTap);
  onSingleTapRef.current = onSingleTap;
  onDoubleTapRef.current = onDoubleTap;

  const composed = useMemo(() => {
    const fireSingle = () => onSingleTapRef.current();
    const fireDouble = () => onDoubleTapRef.current();

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((_e, success) => {
        if (success) runOnJS(fireDouble)();
      });

    const singleTap = Gesture.Tap().onEnd((_e, success) => {
      if (success) runOnJS(fireSingle)();
    });

    return Gesture.Exclusive(doubleTap, singleTap);
  }, []);

  return (
    <GestureDetector gesture={composed}>
      <Pressable style={style} onLongPress={onLongPress} delayLongPress={400}>
        {children}
      </Pressable>
    </GestureDetector>
  );
}
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 22;
const STORAGE_LINE_SPACING = '@soz/lineSpacing';

type LineSpacingId = 'normal' | 'wide' | 'wider';

const LINE_SPACING_MULT: Record<LineSpacingId, number> = {
  normal: 1.6,
  wide: 2.0,
  wider: 2.5,
};

function parseLineSpacing(raw: string | null): LineSpacingId {
  if (raw === 'normal' || raw === 'wide' || raw === 'wider') return raw;
  if (raw === 'relaxed') return 'wide';
  return 'normal';
}

const STORAGE_HIGHLIGHTS = '@soz/highlights';
const STORAGE_NOTES = '@soz/notes';
const STORAGE_NOTE_TIMESTAMPS = '@soz/noteTimestamps';
const STORAGE_FONT_SIZE = '@soz/fontSize';
const STORAGE_TOOLBAR_VISIBLE = '@soz/toolbarVisible';

type Highlights = { [verseId: string]: string };
type Notes = { [verseId: string]: string };

function getVerseId(book: string, chapterNumber: number, verseNumber: number): string {
  return `${book}-${chapterNumber}-${verseNumber}`;
}

const saveToHistory = async (book: string, chapter: number) => {
  try {
    const raw = await AsyncStorage.getItem('@soz/readingHistory');
    const history = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];

    const existing = history.findIndex(
      (h) => h.book === book && Number(h.chapter) === chapter
    );

    const entry = {
      id: `${book}-${chapter}-${Date.now()}`,
      book,
      chapter,
      readAt: new Date().toISOString(),
    };

    if (existing >= 0) history[existing] = entry;
    else history.unshift(entry);

    const trimmed = history.slice(0, 100);
    await AsyncStorage.setItem('@soz/readingHistory', JSON.stringify(trimmed));
  } catch (e) {
    console.error('saveToHistory error:', e);
  }
};

const CHAPTER_NAV_COLOR = '#C4956A';

const DEFAULT_BOOK_INDEX = 0;

function SoundBars() {
  const a1 = useRef(new Animated.Value(0.4)).current;
  const a2 = useRef(new Animated.Value(0.5)).current;
  const a3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration,
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: 0.35,
            duration,
            useNativeDriver: false,
          }),
        ])
      );
    const s1 = anim(a1, 400);
    const s2 = anim(a2, 600);
    const s3 = anim(a3, 500);
    s1.start();
    s2.start();
    s3.start();
    return () => {
      s1.stop();
      s2.stop();
      s3.stop();
    };
  }, [a1, a2, a3]);

  return (
    <View style={styles.soundBars}>
      <Animated.View style={[styles.soundBar, { opacity: a1 }]} />
      <Animated.View style={[styles.soundBar, { opacity: a2 }]} />
      <Animated.View style={[styles.soundBar, { opacity: a3 }]} />
    </View>
  );
}

function ListeningDot() {
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.4, duration: 400, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[styles.listeningDot, { opacity }]} />;
}

export default function ReadScreen() {
  useAnalyticsScreen('read');
  const { theme } = useTheme();
  const { t: tx } = useTranslation();
  const [bookIndex, setBookIndex] = useState(0);
  const [chapterIndexInBook, setChapterIndexInBook] = useState(0);
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [readingOptionsVisible, setReadingOptionsVisible] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSpacingPicker, setShowSpacingPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [lineSpacing, setLineSpacing] = useState<LineSpacingId>('normal');
  const [fontSize, setFontSize] = useState(18);
  const [selectedVerse, setSelectedVerse] = useState<VerseItem | null>(null);
  const [tappedVerseId, setTappedVerseId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareVerse, setShareVerse] = useState<{
    text: string;
    ref: string;
    bookId?: string;
    chapter?: number;
    verse?: number;
  }>({ text: '', ref: '' });
  const [showShareCard, setShowShareCard] = useState(false);
  const [highlights, setHighlights] = useState<Highlights>({});
  const [notes, setNotes] = useState<Notes>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [verseCopied, setVerseCopied] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>('TR');
  const [parallelRead, setParallelRead] = useState(false);
  const [parallelEnVersion, setParallelEnVersion] = useState<'WEB' | 'KJV'>('WEB');
  const [secondLang, setSecondLang] = useState<BibleLanguage>('en');
  const [readProgress, setReadProgress] = useState(0);
  const readProgressAnim = useRef(new Animated.Value(0)).current;
  const [isPsalmMode, setIsPsalmMode] = useState(false);
  const [selectedPsalmIndex, setSelectedPsalmIndex] = useState(0);
  const { isOnline } = useNetwork();
  const { isPremium } = usePremium();
  const { isSpeaking, currentVerseId, speak, speakChapter, stop } = useSpeech();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { pulseNotesTab } = useTabPulse();
  const { syncNotes, syncHighlights, syncFavorites } = useSync();
  const haptics = useHaptics();
  const { currentTrack: ambientTrack, isPlaying: ambientPlaying } = useAmbientMusic();
  const [showMusicModal, setShowMusicModal] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{
    book?: string;
    bookId?: string;
    chapter?: string;
    highlightVerse?: string;
    verse?: string;
  }>();
  const highlightRaw =
    (Array.isArray(params.highlightVerse) ? params.highlightVerse[0] : params.highlightVerse) ??
    (Array.isArray(params.verse) ? params.verse[0] : params.verse);
  const highlightVerseParam = highlightRaw != null ? parseInt(String(highlightRaw), 10) : null;
  const highlightVerseNum = Number.isNaN(highlightVerseParam) ? null : highlightVerseParam;

  const resolvedBookIdFromParams = useMemo(() => {
    const bookIdParam = Array.isArray(params.bookId) ? params.bookId[0] : params.bookId;
    if (bookIdParam) return bookIdParam;
    const bookNameParam = Array.isArray(params.book) ? params.book[0] : params.book;
    const bn = bookNameParam?.trim();
    if (bn) {
      const lower = bn.toLowerCase();
      if (lower === 'mezmurlar' || lower === 'mez') return 'psalms';
      const found = newTestament.find(
        (b) => b.name === bn || b.name.toLowerCase() === lower
      );
      return found?.id ?? null;
    }
    return null;
  }, [params.bookId, params.book]);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<VerseItem>>(null);
  const readPositionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartScale = useRef(new Animated.Value(1)).current;
  const doubleTapHeartScale = useRef(new Animated.Value(0)).current;
  const doubleTapHeartOpacity = useRef(new Animated.Value(0)).current;
  const [doubleTapHeartVisible, setDoubleTapHeartVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleVerseIndex, setVisibleVerseIndex] = useState(1);
  const [loading, setLoading] = useState(true);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const PADDING_TO_EDGE = 20;
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [pullUpAmount, setPullUpAmount] = useState(0);
  const [pullDownAmount, setPullDownAmount] = useState(0);
  const pullDownAmountRef = useRef(0);
  const lastScrollY = useRef(0);
  const lastContentOffset = useRef(0);
  const lastProgressRef = useRef(0);
  const isScrollingDown = useRef(false);
  const isTransitioning = useRef(false);

  // Sayfa çevirme animasyonu
  const [isPageTurning, setIsPageTurning] = useState(false);
  const pageTranslateX = useRef(new Animated.Value(0)).current;
  const pageOpacity = useRef(new Animated.Value(1)).current;
  const pageScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const swipeHintAnim = useRef(new Animated.Value(0)).current;
  const pullUpThreshold = 60;
  const pullDownThreshold = 60;
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const topBannerOpacity = useRef(new Animated.Value(0)).current;
  const [showTopBanner, setShowTopBanner] = useState(false);
  const [bannerPrevChapterName, setBannerPrevChapterName] = useState('');
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const toolbarAnim = useRef(new Animated.Value(1)).current;
  const topBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPsalm = isPsalmMode ? getPsalmByNumber(psalmNumbers[selectedPsalmIndex]) : null;
  const currentBook = isPsalmMode
    ? { id: 'psalms', name: 'Mezmurlar', shortName: 'Mez', chapters: [] as Array<{ chapter: number; verses: Array<{ verse: number; text: string }> }> }
    : newTestament[bookIndex] ?? newTestament[0];
  const safeBookChapters = useMemo(() => currentBook?.chapters ?? [], [currentBook]);
  const safeCurrentChapterInBook = useMemo(
    () => safeBookChapters?.[chapterIndexInBook] ?? null,
    [safeBookChapters, chapterIndexInBook]
  );
  const currentChapterData = isPsalmMode
    ? {
        chapter: currentPsalm?.number ?? 1,
        verses: currentPsalm?.verses?.map((v) => ({ verse: v.number, text: v.text })) ?? [],
      }
    : safeCurrentChapterInBook
      ? {
          chapter: chapterIndexInBook + 1,
          verses: safeCurrentChapterInBook?.verses ?? [],
        }
      : { chapter: 1, verses: [] as Array<{ verse: number; text: string }> };
  const chapterVerses = currentChapterData?.verses ?? [];

  const chapter = useMemo(() => {
    if (isPsalmMode && currentPsalm) {
      return {
        book: 'Mezmurlar',
        chapterNumber: currentPsalm.number,
        verses: currentPsalm.verses.map((v) => ({ number: v.number, text: v.text })),
      };
    }
    const bookTr = currentBook?.name ?? newTestament[0]?.name ?? 'Matta';
    const chNum = currentChapterData?.chapter ?? 1;
    const baseVerses = chapterVerses.map((v) => ({ number: v.verse, text: v.text ?? '—' }));

    if (bibleVersion === 'TR_1878' && currentBook?.id === 'joh' && chNum === 3) {
      return {
        book: bookTr,
        chapterNumber: chNum,
        verses: sampleChapter1878.verses.map((v) => ({ number: v.number, text: v.text })),
      };
    }
    if (bibleVersion === 'WEB' || bibleVersion === 'KJV') {
      const enName = TR_TO_EN_NAME[bookTr];
      if (enName) {
        const en = getEnglishChapterTexts(bibleVersion, enName, chNum);
        if (en.length > 0) {
          return { book: bookTr, chapterNumber: chNum, verses: en };
        }
      }
    }
    return {
      book: bookTr,
      chapterNumber: chNum,
      verses: baseVerses,
    };
  }, [
    isPsalmMode,
    currentPsalm,
    currentBook,
    currentChapterData,
    chapterVerses,
    bibleVersion,
    bookIndex,
    chapterIndexInBook,
  ]);

  /** Paralel sol: her zaman Türkçe 2001 */
  const parallelLeftChapter = useMemo(() => {
    if (isPsalmMode && currentPsalm) {
      return {
        book: 'Mezmurlar',
        chapterNumber: currentPsalm.number,
        verses: currentPsalm.verses.map((v) => ({ number: v.number, text: v.text })),
      };
    }
    const bookTr = currentBook?.name ?? newTestament[0]?.name ?? 'Matta';
    const chNum = currentChapterData?.chapter ?? 1;
    const baseVerses = chapterVerses.map((v) => ({ number: v.verse, text: v.text ?? '—' }));
    return { book: bookTr, chapterNumber: chNum, verses: baseVerses };
  }, [isPsalmMode, currentPsalm, currentBook, currentChapterData, chapterVerses, bookIndex, chapterIndexInBook]);

  const parallelRightChapter = useMemo(() => {
    if (isPsalmMode) {
      return { book: '', chapterNumber: 0, verses: [] as VerseItem[] };
    }
    const bookTr = currentBook?.name ?? newTestament[0]?.name ?? 'Matta';
    const chNum = currentChapterData?.chapter ?? 1;
    const enName = TR_TO_EN_NAME[bookTr];
    if (!enName) {
      return { book: bookTr, chapterNumber: chNum, verses: [] as VerseItem[] };
    }
    const en = getEnglishChapterTexts(parallelEnVersion, enName, chNum);
    return { book: bookTr, chapterNumber: chNum, verses: en };
  }, [isPsalmMode, currentBook, currentChapterData, chapterVerses, parallelEnVersion, bookIndex, chapterIndexInBook]);

  const listChapter = useMemo(
    () => (parallelRead && !isPsalmMode ? parallelLeftChapter : chapter),
    [parallelRead, isPsalmMode, parallelLeftChapter, chapter]
  );

  const isFirstChapter = isPsalmMode
    ? selectedPsalmIndex === 0
    : bookIndex === 0 && chapterIndexInBook === 0;
  const isLastChapter = isPsalmMode
    ? selectedPsalmIndex === psalmNumbers.length - 1
    : bookIndex === newTestament.length - 1 &&
      chapterIndexInBook === (currentBook?.chapters?.length ?? 1) - 1;

  const currentContextNote = isPsalmMode ? null : getContextNote(currentBook?.id ?? '', chapter.chapterNumber);

  useEffect(() => {
    setVisibleVerseIndex(1);
  }, [chapter.chapterNumber, listChapter.verses.length]);

  useEffect(() => {
    const chapterParam = Array.isArray(params.chapter) ? params.chapter[0] : params.chapter;
    if (resolvedBookIdFromParams === 'psalms') {
      setIsPsalmMode(true);
      if (chapterParam != null) {
        const ch = parseInt(String(chapterParam), 10);
        const idx = psalmNumbers.indexOf(ch);
        if (idx >= 0) setSelectedPsalmIndex(idx);
        else setSelectedPsalmIndex(0);
      } else {
        setSelectedPsalmIndex(0);
      }
      return;
    }
    if (resolvedBookIdFromParams != null) {
      setIsPsalmMode(false);
      const bIdx = getBookIndex(resolvedBookIdFromParams);
      if (bIdx >= 0) {
        setBookIndex(bIdx);
        if (chapterParam != null) {
          const ch = parseInt(String(chapterParam), 10);
          if (!Number.isNaN(ch) && ch >= 1 && ch <= (newTestament[bIdx]?.chapters?.length ?? 0)) {
            setChapterIndexInBook(ch - 1);
          } else {
            setChapterIndexInBook(0);
          }
        } else {
          setChapterIndexInBook(0);
        }
      }
    }
  }, [resolvedBookIdFromParams, params.chapter]);

  const startHighlight = useCallback(
    (verseNum: number) => {
      setHighlightedVerse(verseNum);
      highlightAnim.setValue(0);
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0.3, duration: 300, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0.3, duration: 300, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ]).start(() => {
        setHighlightedVerse(null);
      });
    },
    [highlightAnim]
  );

  useEffect(() => {
    if (loading || highlightVerseNum == null) return;

    const chapterParam = Array.isArray(params.chapter) ? params.chapter[0] : params.chapter;
    const expectedChapter = chapterParam != null ? parseInt(String(chapterParam), 10) : null;

    if (isPsalmMode) {
      if (resolvedBookIdFromParams !== 'psalms') return;
      if (expectedChapter != null && chapter.chapterNumber !== expectedChapter) return;
    } else {
      if (resolvedBookIdFromParams != null && currentBook.id !== resolvedBookIdFromParams) return;
      if (expectedChapter != null && chapter.chapterNumber !== expectedChapter) return;
    }

    const verses = listChapter.verses;
    if (verses.length === 0) return;

    let t2: ReturnType<typeof setTimeout> | null = null;
    const t1 = setTimeout(() => {
      const idx = verses.findIndex((v) => v.number === highlightVerseNum);
      if (idx >= 0) {
        try {
          flatListRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.35,
          });
        } catch {
          /* ignore */
        }
      }
      t2 = setTimeout(() => {
        startHighlight(highlightVerseNum);
      }, 600);
    }, 400);

    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
      highlightAnim.stopAnimation();
    };
  }, [
    loading,
    highlightVerseNum,
    isPsalmMode,
    resolvedBookIdFromParams,
    params.chapter,
    currentBook.id,
    chapter.chapterNumber,
    listChapter,
    startHighlight,
    highlightAnim,
  ]);

  const loadStored = useCallback(async () => {
    try {
      const [hRaw, nRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_HIGHLIGHTS),
        AsyncStorage.getItem(STORAGE_NOTES),
      ]);
      if (hRaw != null) {
        const parsed = JSON.parse(hRaw) as Highlights;
        setHighlights(parsed);
      }
      if (nRaw != null) {
        const parsed = JSON.parse(nRaw) as Notes;
        setNotes(parsed);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadStored(),
      new Promise((r) => setTimeout(r, 80)),
    ]).then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadStored]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_FONT_SIZE).then((raw) => {
      if (raw != null) {
        const n = parseInt(raw, 10);
        if (n >= MIN_FONT_SIZE && n <= MAX_FONT_SIZE) setFontSize(n);
      }
    });
    AsyncStorage.getItem(STORAGE_LINE_SPACING).then((raw) => {
      setLineSpacing(parseLineSpacing(raw));
    });
    AsyncStorage.getItem(STORAGE_BIBLE_VERSION).then((raw) => {
      if (raw === 'TR' || raw === 'TR_1878' || raw === 'WEB' || raw === 'KJV') {
        setBibleVersion(raw);
      }
    });
    AsyncStorage.getItem(STORAGE_PARALLEL_EN).then((raw) => {
      if (raw === 'WEB' || raw === 'KJV') setParallelEnVersion(raw);
    });
    AsyncStorage.getItem(STORAGE_TOOLBAR_VISIBLE).then((raw) => {
      const visible = raw !== 'false';
      setToolbarVisible(visible);
      toolbarAnim.setValue(visible ? 1 : 0);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_BIBLE_VERSION, bibleVersion).catch(() => {});
  }, [bibleVersion]);

  useEffect(() => {
    if (isSpeaking) {
      void stop();
    }
    // Stop TTS when Bible version changes; do not depend on isSpeaking/stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bibleVersion]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_PARALLEL_EN, parallelEnVersion).catch(() => {});
  }, [parallelEnVersion]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_TOOLBAR_VISIBLE, toolbarVisible ? 'true' : 'false').catch(() => {});
  }, [toolbarVisible]);

  const toggleToolbar = useCallback(() => {
    const toValue = toolbarVisible ? 0 : 1;
    Animated.timing(toolbarAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setToolbarVisible(!toolbarVisible);
  }, [toolbarVisible, toolbarAnim]);

  useEffect(() => {
    if (isPsalmMode) {
      setParallelRead(false);
      setBibleVersion((v) => (v === 'WEB' || v === 'KJV' ? 'TR' : v));
    }
  }, [isPsalmMode]);

  const lineSpacingMult = LINE_SPACING_MULT[lineSpacing];
  const verseRowEstimate = Math.max(
    72,
    Math.round(44 + fontSize * lineSpacingMult * 2.2)
  );

  const animateFavorite = useCallback(() => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        useNativeDriver: false,
        friction: 5,
        tension: 120,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: false,
        friction: 4,
        tension: 80,
      }),
    ]).start();
  }, [heartScale]);

  /** Instagram tarzı ortada büyüyüp kaybolan kalp (~600ms). */
  const playDoubleTapHeart = useCallback(() => {
    setDoubleTapHeartVisible(true);
    doubleTapHeartScale.setValue(0);
    doubleTapHeartOpacity.setValue(1);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(doubleTapHeartScale, {
          toValue: 1.2,
          friction: 4,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.timing(doubleTapHeartScale, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(320),
        Animated.timing(doubleTapHeartOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) setDoubleTapHeartVisible(false);
    });
  }, [doubleTapHeartScale, doubleTapHeartOpacity]);

  const handleVerseDoubleTapFavorite = useCallback(
    async (verseId: string, verseText: string) => {
      setTappedVerseId(null);
      const wasFav = isFavorite(verseId);
      playDoubleTapHeart();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await toggleFavorite(verseId, verseText);
      if (!wasFav) {
        animateFavorite();
        pulseNotesTab();
        trackEvent('favorite_added', { book: chapter.book });
        try {
          if (supabase) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            await logFriendActivity(supabase, user, isOnline, {
              type: 'verse_favorite',
              verse_id: verseId,
              book: chapter.book,
              chapter: chapter.chapterNumber,
            });
          }
        } catch {
          /* ignore */
        }
      }
      syncFavorites();
    },
    [
      isFavorite,
      playDoubleTapHeart,
      toggleFavorite,
      animateFavorite,
      pulseNotesTab,
      isOnline,
      chapter.book,
      chapter.chapterNumber,
      syncFavorites,
    ]
  );

  useEffect(() => {
    if (loading) return;
    setReadProgress(0);
    readProgressAnim.setValue(0);
    lastProgressRef.current = 0;
    setTappedVerseId(null);
    const posKey = `@soz/readPosition/${currentBook.id}/${chapter.chapterNumber}`;
    let cancelled = false;
    AsyncStorage.getItem(posKey).then((raw) => {
      if (cancelled) return;
      if (raw != null) {
        const idx = parseInt(raw, 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < listChapter.verses.length) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: idx,
              animated: false,
              viewPosition: 0,
            });
          }, 300);
          return;
        }
      }
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return () => {
      cancelled = true;
    };
  }, [
    loading,
    currentBook.id,
    chapter.chapterNumber,
    listChapter.verses.length,
    readProgressAnim,
    bookIndex,
    chapterIndexInBook,
    selectedPsalmIndex,
    isPsalmMode,
    parallelRead,
  ]);

  useEffect(() => {
    Animated.timing(readProgressAnim, {
      toValue: readProgress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [readProgress, readProgressAnim]);

  // Ekran odaklanınca (örn. ask.tsx'ten geri dönünce) progress bar'ı koru
  useFocusEffect(
    useCallback(() => {
      readProgressAnim.setValue(lastProgressRef.current);
    }, [readProgressAnim])
  );

  // Bölüm sonu footer'ında zıplayan ok animasyonu
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(swipeHintAnim, {
          toValue: 6,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(swipeHintAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [swipeHintAnim]);

  useEffect(() => {
    addToReadHistory({
      bookId: currentBook.id,
      bookName: currentBook.name,
      chapter: chapter.chapterNumber,
      timestamp: Date.now(),
    });
    void saveToHistory(chapter.book, chapter.chapterNumber);
    trackEvent('chapter_read', { book: chapter.book, chapter: chapter.chapterNumber });
    (async () => {
      try {
        if (!supabase) {
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const vid = isPsalmMode
          ? `Mezmurlar-${chapter.chapterNumber}-1`
          : getVerseId(chapter.book, chapter.chapterNumber, 1);
        await logFriendActivity(supabase, user, isOnline, {
          type: 'chapter_read',
          book: chapter.book,
          chapter: chapter.chapterNumber,
          verse_id: vid,
        });
      } catch {
        /* ignore */
      }
    })();
  }, [currentBook.id, currentBook.name, chapter.chapterNumber, chapter.book, isPsalmMode, isOnline]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      void saveLastRead({
        book: chapter.book,
        chapter: chapter.chapterNumber,
        verse: visibleVerseIndex,
        readAt: new Date().toISOString(),
      });
    }, 450);
    return () => clearTimeout(t);
  }, [loading, chapter.book, chapter.chapterNumber, visibleVerseIndex]);

  const goPrevChapter = () => {
    if (isPsalmMode) {
      if (selectedPsalmIndex > 0) setSelectedPsalmIndex((i) => i - 1);
    } else if (chapterIndexInBook > 0) {
      setChapterIndexInBook((c) => c - 1);
    } else if (bookIndex > 0) {
      setBookIndex((b) => b - 1);
      setChapterIndexInBook((newTestament[bookIndex - 1]?.chapters?.length ?? 1) - 1);
    }
  };

  const goNextChapter = useCallback(() => {
    if (isPsalmMode) {
      if (selectedPsalmIndex < psalmNumbers.length - 1) setSelectedPsalmIndex((i) => i + 1);
    } else if (chapterIndexInBook < (currentBook?.chapters?.length ?? 1) - 1) {
      setChapterIndexInBook((c) => c + 1);
    } else if (bookIndex < newTestament.length - 1) {
      setBookIndex((b) => b + 1);
      setChapterIndexInBook(0);
    }
  }, [
    isPsalmMode,
    selectedPsalmIndex,
    chapterIndexInBook,
    currentBook,
    bookIndex,
  ]);

  const hapticPageTurn = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise<void>((r) => setTimeout(r, 60));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const animatePageTurn = useCallback(
    (direction: 'next' | 'prev', onComplete: () => void) => {
      setIsPageTurning(true);
      const sw = Dimensions.get('window').width;
      const toX = direction === 'next' ? -sw * 0.15 : sw * 0.15;

      Animated.parallel([
        Animated.timing(pageTranslateX, {
          toValue: toX,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pageScale, {
          toValue: 0.96,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pageOpacity, {
          toValue: 0.3,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
        const fromX = direction === 'next' ? sw * 0.12 : -sw * 0.12;
        pageTranslateX.setValue(fromX);
        pageScale.setValue(0.97);
        pageOpacity.setValue(0.2);

        Animated.parallel([
          Animated.spring(pageTranslateX, {
            toValue: 0,
            tension: 70,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.spring(pageScale, {
            toValue: 1,
            tension: 70,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.timing(pageOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setIsPageTurning(false));
      });
    },
    [pageTranslateX, pageScale, pageOpacity, overlayOpacity]
  );

  const goToNextChapter = useCallback(() => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    hapticPageTurn();
    animatePageTurn('next', () => {
      goNextChapter();
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setPullUpAmount(0);
      setTimeout(() => {
        isTransitioning.current = false;
      }, 300);
    });
  }, [goNextChapter, hapticPageTurn, animatePageTurn]);

  const showTopBannerTemporary = useCallback((prevName: string) => {
    if (topBannerTimeoutRef.current) clearTimeout(topBannerTimeoutRef.current);
    setBannerPrevChapterName(prevName);
    setShowTopBanner(true);
    topBannerOpacity.setValue(1);
    topBannerTimeoutRef.current = setTimeout(() => {
      topBannerTimeoutRef.current = null;
      Animated.timing(topBannerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start(() => setShowTopBanner(false));
    }, 2000);
  }, [topBannerOpacity]);

  const triggerNextChapter = useCallback(() => {
    const ntBook = currentBook as typeof newTestament[0];
    const movingToNextBook =
      !isPsalmMode &&
      isLastChapter &&
      bookIndex < newTestament.length - 1;
    const nextBook = movingToNextBook ? newTestament[bookIndex + 1] : null;
    const prevChapterNameForBanner = isPsalmMode
      ? tx('psalmName', { n: chapter.chapterNumber })
      : `${chapter.book} ${chapter.chapterNumber}`;
    addToReadHistory({
      bookId: currentBook.id,
      bookName: chapter.book,
      chapter: chapter.chapterNumber,
      timestamp: Date.now(),
    }).catch(() => {});
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    goToNextChapter();
    showTopBannerTemporary(prevChapterNameForBanner);
    if (movingToNextBook && nextBook) {
      haptics.success();
      setToastMessage(tx('switchedToBookMsg', { name: nextBook.name }));
      setToastVisible(true);
    }
  }, [
    currentBook,
    chapter.book,
    chapter.chapterNumber,
    isLastChapter,
    bookIndex,
    isPsalmMode,
    goToNextChapter,
    flashOpacity,
    showTopBannerTemporary,
    tx,
  ]);

  const triggerPrevChapter = useCallback(() => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    addToReadHistory({
      bookId: currentBook.id,
      bookName: chapter.book,
      chapter: chapter.chapterNumber,
      timestamp: Date.now(),
    }).catch(() => {});
    hapticPageTurn();
    animatePageTurn('prev', () => {
      goPrevChapter();
      setPullDownAmount(0);
      setTimeout(() => {
        isTransitioning.current = false;
      }, 300);
    });
  }, [currentBook, chapter.book, chapter.chapterNumber, goPrevChapter, hapticPageTurn, animatePageTurn]);

  useEffect(() => {
    return () => {
      if (topBannerTimeoutRef.current) clearTimeout(topBannerTimeoutRef.current);
    };
  }, []);

  const nextChapterLabel = (() => {
    if (isLastChapter) return null;
    if (isPsalmMode) {
      const nextIdx = selectedPsalmIndex + 1;
      if (nextIdx < psalmNumbers.length) {
        const n = psalmNumbers[nextIdx];
        return `${tx('psalmName', { n })} →`;
      }
      return null;
    }
    const ntBook = currentBook;
    if (chapterIndexInBook < (ntBook?.chapters?.length ?? 0) - 1) {
      const nextCh = ntBook?.chapters?.[chapterIndexInBook + 1];
      return `${chapter.book} ${nextCh.chapter} →`;
    }
    if (bookIndex < newTestament.length - 1) {
      return `${tx('goToBookName', { name: newTestament[bookIndex + 1].name })} →`;
    }
    return null;
  })();

  const prevChapterLabel = (() => {
    if (isFirstChapter) return null;
    if (isPsalmMode) {
      if (selectedPsalmIndex > 0) {
        const n = psalmNumbers[selectedPsalmIndex - 1];
        return `← ${tx('backToPsalmName', { n })}`;
      }
      return null;
    }
    if (chapterIndexInBook > 0) {
      const ntBook = currentBook;
      const prevCh = ntBook?.chapters?.[chapterIndexInBook - 1];
      return `← ${tx('backToChapterName', { book: chapter.book, chapter: prevCh.chapter })}`;
    }
    if (bookIndex > 0) {
      const prevBook = newTestament[bookIndex - 1];
      return `← ${tx('backToBookName', { name: prevBook.name })}`;
    }
    return null;
  })();

  const triggerNextChapterRef = useRef(triggerNextChapter);
  const triggerPrevChapterRef = useRef(triggerPrevChapter);
  const goToNextChapterRef = useRef(goToNextChapter);
  goToNextChapterRef.current = goToNextChapter;
  const isAtBottomRef = useRef(false);
  isAtBottomRef.current = isAtBottom;

  const footerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isAtBottomRef.current,
      onMoveShouldSetPanResponder: (_, g) => isAtBottomRef.current && g.dy < -8,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, g) => {
        const amount = Math.min(pullUpThreshold, Math.max(0, -g.dy));
        setPullUpAmount(amount);
      },
      onPanResponderRelease: (_, g) => {
        const amount = Math.min(pullUpThreshold, Math.max(0, -g.dy));
        if (amount >= pullUpThreshold) {
          triggerNextChapterRef.current();
        }
        setPullUpAmount(0);
      },
    })
  ).current;

  const leftArrowOpacity = useRef(new Animated.Value(0)).current;
  const rightArrowOpacity = useRef(new Animated.Value(0)).current;
  const swipeStartXRef = useRef(0);
  const screenWidth = Dimensions.get('window').width;
  const TAB_EDGE = 32;

  const chapterSwipePanResponder = useRef(
    PanResponder.create({
      onPanResponderGrant: (e) => {
        swipeStartXRef.current = e.nativeEvent.pageX;
      },
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && Math.abs(g.dy) < 50,
      onPanResponderMove: (_, g) => {
        if (g.dx > 25) {
          Animated.timing(leftArrowOpacity, {
            toValue: 0.6,
            duration: 100,
            useNativeDriver: false,
          }).start();
          Animated.timing(rightArrowOpacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: false,
          }).start();
        } else if (g.dx < -25) {
          Animated.timing(rightArrowOpacity, {
            toValue: 0.6,
            duration: 100,
            useNativeDriver: false,
          }).start();
          Animated.timing(leftArrowOpacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: false,
          }).start();
        } else {
          Animated.timing(leftArrowOpacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: false,
          }).start();
          Animated.timing(rightArrowOpacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderRelease: (_, g) => {
        Animated.parallel([
          Animated.timing(leftArrowOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(rightArrowOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start();
        const startX = swipeStartXRef.current;
        if (startX < TAB_EDGE && g.dx > 60) {
          try {
            haptics.light();
            router.replace('/(tabs)/index' as any);
          } catch {
            /* ignore */
          }
          return;
        }
        if (startX > screenWidth - TAB_EDGE && g.dx < -60) {
          try {
            haptics.light();
            router.replace('/(tabs)/explore' as any);
          } catch {
            /* ignore */
          }
          return;
        }
        if (g.dx < -60) {
          goNextChapter();
          haptics.light();
        } else if (g.dx > 60) {
          goPrevChapter();
          haptics.light();
        }
      },
    })
  ).current;

  const handleLongPress = (verse: VerseItem) => {
    haptics.medium();
    setSelectedVerse(verse);
    setShowColorPicker(false);
    setShowNoteInput(false);
    const id = getVerseId(listChapter.book, listChapter.chapterNumber, verse.number);
    setNoteDraft(notes[id] ?? '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVerse(null);
    setShowColorPicker(false);
    setShowNoteInput(false);
    setNoteDraft('');
    setVerseCopied(false);
  };

  const saveHighlights = useCallback(async (next: Highlights) => {
    setHighlights(next);
    try {
      await AsyncStorage.setItem(STORAGE_HIGHLIGHTS, JSON.stringify(next));
      syncHighlights();
    } catch (_) {
      // ignore
    }
  }, [syncHighlights]);

  const saveNotes = useCallback(async (next: Notes) => {
    setNotes(next);
    try {
      await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(next));
      syncNotes();
    } catch (_) {
      // ignore
    }
  }, [syncNotes]);

  const handleHighlightColor = (colorId: string) => {
    if (!selectedVerse) return;
    haptics.light();
    const id = getVerseId(listChapter.book, listChapter.chapterNumber, selectedVerse.number);
    const next = { ...highlights, [id]: colorId };
    saveHighlights(next);
    pulseNotesTab();
    trackEvent('highlight_added', { book: listChapter.book });
    (async () => {
      try {
        if (!supabase) {
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await logFriendActivity(supabase, user, isOnline, {
          type: 'verse_highlight',
          verse_id: id,
          book: listChapter.book,
          chapter: listChapter.chapterNumber,
        });
      } catch {
        /* ignore */
      }
    })();
    setShowColorPicker(false);
    setTimeout(() => closeModal(), 300);
  };

  const handleSaveNote = () => {
    if (!selectedVerse) return;
    const id = getVerseId(listChapter.book, listChapter.chapterNumber, selectedVerse.number);
    const trimmed = noteDraft.trim();
    const isNewNote = !(id in notes) && Boolean(trimmed);
    if (!isPremium && isNewNote && Object.keys(notes).length >= FREE_LIMITS.notesLimit) {
      router.push('/paywall');
      return;
    }
    const next = trimmed ? { ...notes, [id]: trimmed } : { ...notes };
    if (!trimmed) delete next[id];
    saveNotes(next);
    if (trimmed) {
      if (isNewNote) trackEvent('note_added', { book: listChapter.book });
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_NOTE_TIMESTAMPS);
          const ts: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {};
          ts[id] = new Date().toISOString();
          await AsyncStorage.setItem(STORAGE_NOTE_TIMESTAMPS, JSON.stringify(ts));
        } catch {
          /* ignore */
        }
      })();
      (async () => {
        try {
          if (!supabase) {
            return;
          }
          const {
            data: { user },
          } = await supabase.auth.getUser();
          await logFriendActivity(supabase, user, isOnline, {
            type: 'note_added',
            verse_id: id,
            book: listChapter.book,
            chapter: listChapter.chapterNumber,
          });
        } catch {
          /* ignore */
        }
      })();
    }
    setShowNoteInput(false);
    setNoteDraft('');
    haptics.success();
    setTimeout(() => closeModal(), 300);
  };

  const handleShare = () => {
    if (!selectedVerse) return;
    const text = selectedVerse.text;
    const refStr = `${listChapter.book} ${listChapter.chapterNumber}:${selectedVerse.number}`;
    const bookId = currentBook.id;
    const chapterNum = listChapter.chapterNumber;
    const verseNum = selectedVerse.number;
    setSelectedVerse(null);
    closeModal();
    setTimeout(() => {
      setShareVerse({
        text,
        ref: refStr,
        bookId,
        chapter: chapterNum,
        verse: verseNum,
      });
      setShowShareOptions(true);
      haptics.light();
    }, 300);
  };

  const handleShareHighlight = () => {
    if (!selectedVerse || !selectedVerseId) return;
    const refStr = getVerseRefFromVerseId(selectedVerseId);
    const message = buildShareMessage(selectedVerse.text, refStr, {
      bookId: currentBook.id,
      chapter: listChapter.chapterNumber,
      verse: selectedVerse.number,
    });
    Share.share({ message });
    setTimeout(() => closeModal(), 300);
  };

  const handleCopyVerse = async () => {
    if (!selectedVerse || !selectedVerseId) return;
    const refStr = getVerseRefFromVerseId(selectedVerseId);
    await Clipboard.setStringAsync(`${selectedVerse.text} — ${refStr}`);
    haptics.light();
    setVerseCopied(true);
    setTimeout(() => setVerseCopied(false), 1500);
  };

  const bumpFontSize = useCallback((delta: number) => {
    setFontSize((s) => {
      const n = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, s + delta));
      AsyncStorage.setItem(STORAGE_FONT_SIZE, String(n)).catch(() => {});
      return n;
    });
  }, []);

  const decreaseFont = () => bumpFontSize(-2);
  const increaseFont = () => bumpFontSize(2);

  const showCompare =
    compareMode &&
    bibleVersion !== 'TR_1878' &&
    currentBook.id === 'joh' &&
    chapter.chapterNumber === 3;
  const getVerse1878 = useCallback((verseNumber: number) => {
    return sampleChapter1878.verses.find((v) => v.number === verseNumber)?.text ?? null;
  }, []);

  const secondLangChapter = (() => {
    if (!compareMode || isPsalmMode || parallelRead) return null;
    if (bibleVersion === 'WEB' || bibleVersion === 'KJV') return null;
    try {
      return getBibleChapter(secondLang, chapter.book, chapter.chapterNumber);
    } catch {
      return null;
    }
  })();

  const handleSpeakChapter = useCallback(() => {
    if (isSpeaking) stop();
    else speakChapter(parallelRead ? parallelLeftChapter.verses : chapter.verses);
  }, [isSpeaking, speakChapter, stop, chapter.verses, parallelRead, parallelLeftChapter.verses]);

  const onScrollList = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const currentOffset = contentOffset.y;
      const maxOffset = Math.max(0, contentSize.height - layoutMeasurement.height);

      isScrollingDown.current = currentOffset > lastContentOffset.current;
      lastContentOffset.current = currentOffset;

      contentHeightRef.current = contentSize.height;
      layoutHeightRef.current = layoutMeasurement.height;
      const p = maxOffset > 0 ? Math.min(1, Math.max(0, currentOffset / maxOffset)) : 0;
      setScrollProgress(p);

      // Scroll-bazlı progress bar güncelleme (viewable items'dan daha kararlı)
      if (maxOffset > 0) {
        if (Math.abs(p - lastProgressRef.current) > 0.005) {
          lastProgressRef.current = p;
          Animated.timing(readProgressAnim, {
            toValue: p,
            duration: 100,
            useNativeDriver: false,
          }).start();
        }
      } else if (contentSize.height > 0 && lastProgressRef.current !== 1) {
        lastProgressRef.current = 1;
        Animated.timing(readProgressAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }

      const atBottom = currentOffset >= maxOffset - 50;
      setIsAtBottom(atBottom);
      const atTop = contentOffset.y <= PADDING_TO_EDGE;
      setIsAtTop(atTop);
      lastScrollY.current = contentOffset.y;
      if (!atBottom) setPullUpAmount(0);
      if (!atTop) {
        pullDownAmountRef.current = 0;
        setPullDownAmount(0);
      }
      if (atTop && contentOffset.y < 0) {
        const amt = Math.min(pullDownThreshold, -contentOffset.y);
        pullDownAmountRef.current = amt;
        setPullDownAmount(amt);
      }
    },
    [pullDownThreshold, readProgressAnim]
  );

  const onScrollEndDrag = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
        velocity?: { y: number };
      };
    }) => {
      const { contentOffset, layoutMeasurement, contentSize, velocity } = e.nativeEvent;
      const maxOffset = contentSize.height - layoutMeasurement.height;
      const atBottom = contentOffset.y >= maxOffset - 50;
      const swipingDown = (velocity?.y ?? 0) > 0.3;
      if (atBottom && swipingDown) {
        goToNextChapterRef.current();
      }
      if (pullDownAmountRef.current >= pullDownThreshold) {
        triggerPrevChapterRef.current();
      }
      pullDownAmountRef.current = 0;
      setPullDownAmount(0);
    },
    [pullDownThreshold]
  );

  const onMomentumScrollEnd = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const maxOffset = contentSize.height - layoutMeasurement.height;
      const atBottom = contentOffset.y >= maxOffset - 20;
      if (atBottom && isScrollingDown.current) {
        setTimeout(() => {
          if (isAtBottomRef.current) {
            goToNextChapterRef.current();
          }
        }, 300);
      }
    },
    []
  );
  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeightRef.current = h;
    const maxScroll = Math.max(0, h - layoutHeightRef.current);
    if (maxScroll <= 0) setScrollProgress(0);
  }, []);
  const onLayoutList = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    layoutHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: Array<{ item: VerseItem; index: number | null }> }) => {
      const items = info.viewableItems;
      const verseIds = items.map((v) =>
        getVerseId(listChapter.book, listChapter.chapterNumber, v.item.number)
      );
      if (verseIds.length > 0) recordVerseViews(verseIds, currentBook.id);
      if (items.length > 0 && listChapter.verses.length > 0) {
        const firstVisible = items[0];
        const firstIdx = firstVisible.index ?? 0;
        setVisibleVerseIndex(firstIdx + 1);
        const lastVisible = items[items.length - 1];
        const idx = lastVisible.index ?? 0;
        const posKey = `@soz/readPosition/${currentBook.id}/${listChapter.chapterNumber}`;
        if (readPositionSaveTimer.current) clearTimeout(readPositionSaveTimer.current);
        readPositionSaveTimer.current = setTimeout(() => {
          AsyncStorage.setItem(posKey, String(firstIdx)).catch(() => {});
        }, 450);
      }
    },
    [listChapter.book, listChapter.chapterNumber, listChapter.verses.length, currentBook.id]
  );

  const onScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    const wait = new Promise<void>((resolve) => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.35,
      });
    });
  }, []);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const footerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(footerOpacity, {
      toValue: isAtBottom && nextChapterLabel != null ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isAtBottom, nextChapterLabel, footerOpacity]);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: isAtTop && prevChapterLabel != null ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isAtTop, prevChapterLabel, headerOpacity]);

  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isAtBottom || nextChapterLabel == null) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -6,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isAtBottom, nextChapterLabel, bounceAnim]);

  const renderListHeader = useCallback(() => {
    const showPrevBanner = chapterIndexInBook > 0 && prevChapterLabel != null;
    return (
      <View style={styles.listHeaderWrap} collapsable={false}>
        {showTopBanner && bannerPrevChapterName ? (
          <Animated.View style={[styles.topBanner, { opacity: topBannerOpacity }]}>
            <Ionicons name="chevron-up" size={14} color={theme.textMuted} />
            <Text style={styles.topBannerText}>
              ← {tx('backToTopName', { name: bannerPrevChapterName ?? '' })}
            </Text>
          </Animated.View>
        ) : null}
        {showPrevBanner ? (
          <Animated.View style={[styles.prevChapterWrap, { opacity: headerOpacity }]}>
            <TouchableOpacity
              onPress={triggerPrevChapter}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: theme.surface,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                alignSelf: 'center',
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 8,
              }}
            >
              <Ionicons name="chevron-up" size={14} color={theme.textMuted} />
              <Text
                style={{
                  fontSize: 13,
                  color: theme.textMuted,
                  fontFamily: fonts.italic ?? fonts.regular,
                }}
              >
                {prevChapterLabel}
              </Text>
            </TouchableOpacity>
            {pullDownAmount > 0 && (
              <View style={styles.pullProgressWrap}>
                <View style={styles.pullProgressBg}>
                  <View
                    style={[
                      styles.pullProgressFill,
                      {
                        width: `${Math.min(100, (pullDownAmount / pullDownThreshold) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </Animated.View>
        ) : null}
      </View>
    );
  }, [
    showTopBanner,
    bannerPrevChapterName,
    topBannerOpacity,
    prevChapterLabel,
    chapterIndexInBook,
    headerOpacity,
    pullDownAmount,
    pullDownThreshold,
    triggerPrevChapter,
    theme.surface,
    theme.border,
    theme.textMuted,
  ]);

  const renderListFooter = useCallback(() => {
    const atLastBook = !isPsalmMode && bookIndex >= newTestament.length - 1;
    const isAbsoluteEnd = isLastChapter && atLastBook;

    let nextLabel = '';
    if (!isLastChapter) {
      if (isPsalmMode) {
        const nextIdx = selectedPsalmIndex + 1;
        if (nextIdx < psalmNumbers.length) {
          nextLabel = tx('psalmName', { n: psalmNumbers[nextIdx] });
        }
      } else {
        const ntBook = currentBook;
        if (chapterIndexInBook < (ntBook?.chapters?.length ?? 0) - 1) {
          const nextCh = ntBook?.chapters?.[chapterIndexInBook + 1];
          nextLabel = `${chapter.book} ${nextCh.chapter}`;
        } else if (bookIndex < newTestament.length - 1) {
          nextLabel = newTestament[bookIndex + 1].name;
        }
      }
    }
    if (nextLabel === '' && !atLastBook) {
      const nextBook = newTestament[bookIndex + 1];
      nextLabel = nextBook ? tx('nextBookFirstChapter', { name: nextBook.name }) : '';
    }

    return (
      <View style={styles.chapterFooter}>
        <View style={styles.footerDivider} />

        <View style={styles.footerBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#C4956A" />
          <Text style={styles.footerBadgeText}>
            {chapter.book} {chapter.chapterNumber}. {tx('chapterCompleted')}
          </Text>
        </View>

        <Text style={[styles.footerVerseCount, { color: theme.textMuted }]}>
          {listChapter.verses.length} {tx('versesRead')}
        </Text>

        {!isAbsoluteEnd && nextLabel !== '' && (
          <View style={styles.footerNext}>
            <Text style={[styles.footerNextLabel, { color: theme.textMuted }]}>{tx('next')}</Text>
            <Text style={[styles.footerNextBook, { color: theme.text }]}>{nextLabel}</Text>
          </View>
        )}

        {isAbsoluteEnd && (
          <Text style={[styles.footerNextBook, { color: theme.text }]}>
            {tx('ntCompleted')}
          </Text>
        )}

        {!isAbsoluteEnd && (
          <View style={styles.footerSwipeHint}>
            <Animated.View style={{ transform: [{ translateY: swipeHintAnim }] }}>
              <Ionicons name="chevron-down" size={20} color="rgba(196,149,80,0.5)" />
            </Animated.View>
            <Text style={styles.footerSwipeText}>{tx('swipeForNext')}</Text>
          </View>
        )}
      </View>
    );
  }, [
    chapter.book,
    chapter.chapterNumber,
    listChapter,
    isLastChapter,
    isPsalmMode,
    bookIndex,
    selectedPsalmIndex,
    psalmNumbers,
    currentBook,
    chapterIndexInBook,
    swipeHintAnim,
    theme.text,
    theme.textMuted,
    tx,
  ]);

  const renderVerse = ({ item }: { item: VerseItem }) => {
    const verseId = getVerseId(listChapter.book, listChapter.chapterNumber, item.number);
    const highlightStored = highlights[verseId];
    const highlightEntry = highlightStored != null ? getHighlightPaletteEntry(highlightStored) : null;
    const hasNote = Boolean(notes[verseId]);
    const favorite = isFavorite(verseId);
    const isSelected = selectedVerse?.number === item.number;
    const isSpeakingThis = currentVerseId === verseId;
    const isHighlightedFromParams = highlightedVerse === item.number;
    const text1878 = showCompare ? getVerse1878(item.number) : null;
    const secondLangText = secondLangChapter?.verses?.find((v) => v.verse === item.number)?.text ?? null;

    const rowContent = (
      <VerseGesturePressable
        style={[
          styles.verseRow,
          highlightEntry != null && {
            backgroundColor: highlightEntry.background,
            borderLeftWidth: 3,
            borderLeftColor: highlightEntry.border,
            borderTopRightRadius: 6,
            borderBottomRightRadius: 6,
            paddingLeft: 12,
          },
          highlightEntry == null && !isHighlightedFromParams && {
            backgroundColor: 'transparent',
            borderLeftWidth: 0,
          },
          isSelected && highlightEntry == null && !isHighlightedFromParams && styles.verseRowSelected,
          isSpeakingThis && styles.verseRowSpeaking,
        ]}
        onSingleTap={() => setTappedVerseId((prev) => (prev === verseId ? null : verseId))}
        onDoubleTap={() => void handleVerseDoubleTapFavorite(verseId, item.text)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.verseNumberRow}>
          {isSpeakingThis && (
            <View style={styles.soundBarsWrap}>
              <SoundBars />
            </View>
          )}
          {!isSpeakingThis && tappedVerseId === verseId && (
            <Pressable
              style={styles.verseSpeakBtn}
              onPress={() => {
                setTappedVerseId(null);
                speak(item.text, verseId);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tx('listen')}
            >
              <Ionicons name="volume-medium-outline" size={16} color={ACCENT} />
            </Pressable>
          )}
          <Text
            style={[
              styles.verseNumber,
              isHighlightedFromParams && styles.verseNumberHighlight,
            ]}
          >
            {item.number}
          </Text>
        </View>
        <View style={styles.verseTextBlock}>
          <Text
            style={[
              styles.verseText,
              {
                color: theme.text,
                fontSize,
                lineHeight: fontSize * lineSpacingMult,
              },
            ]}
          >
            {item.text}
          </Text>
          {text1878 != null && (
            <>
              <View style={styles.compareDivider} />
              <Text
                style={[
                  styles.verseText1878,
                  { color: theme.textMuted },
                ]}
              >
                {text1878}
              </Text>
            </>
          )}
          {secondLangText != null && (
            <>
              <View style={styles.compareDivider} />
              <Text
                style={[
                  styles.verseText1878,
                  { color: theme.textMuted },
                  secondLang === 'ar' && {
                    writingDirection: 'rtl' as const,
                    textAlign: 'right' as const,
                  },
                ]}
              >
                {secondLangText}
              </Text>
            </>
          )}
        </View>
        {hasNote && (
          <View style={styles.noteBadge}>
            <Ionicons name="chatbubble-ellipses" size={12} color="#C4956A" />
          </View>
        )}
        {favorite && <Text style={styles.verseFavoriteIcon}>♥</Text>}
      </VerseGesturePressable>
    );

    if (isHighlightedFromParams) {
      return (
        <View style={styles.verseHighlightWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.verseHighlightOverlay,
              { opacity: highlightAnim },
            ]}
          />
          {rowContent}
        </View>
      );
    }
    return rowContent;
  };

  const renderParallelRightVerse = ({ item }: { item: VerseItem }) => {
    const verseId = getVerseId(listChapter.book, listChapter.chapterNumber, item.number);
    const highlightStored = highlights[verseId];
    const highlightEntry = highlightStored != null ? getHighlightPaletteEntry(highlightStored) : null;
    const hasNote = Boolean(notes[verseId]);
    const favorite = isFavorite(verseId);
    const isSelected = selectedVerse?.number === item.number;
    const isSpeakingThis = currentVerseId === verseId;
    const isHighlightedFromParams = highlightedVerse === item.number;

    const rowContent = (
      <VerseGesturePressable
        style={[
          styles.verseRow,
          styles.compareVerse,
          highlightEntry != null && {
            backgroundColor: highlightEntry.background,
            borderLeftWidth: 3,
            borderLeftColor: highlightEntry.border,
            borderTopRightRadius: 6,
            borderBottomRightRadius: 6,
            paddingLeft: 12,
          },
          highlightEntry == null && !isHighlightedFromParams && {
            backgroundColor: 'transparent',
            borderLeftWidth: 0,
          },
          isSelected && highlightEntry == null && !isHighlightedFromParams && styles.verseRowSelected,
          isSpeakingThis && styles.verseRowSpeaking,
        ]}
        onSingleTap={() => setTappedVerseId((prev) => (prev === verseId ? null : verseId))}
        onDoubleTap={() => void handleVerseDoubleTapFavorite(verseId, item.text)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.verseNumberRow}>
          {isSpeakingThis && (
            <View style={styles.soundBarsWrap}>
              <SoundBars />
            </View>
          )}
          {!isSpeakingThis && tappedVerseId === verseId && (
            <Pressable
              style={styles.verseSpeakBtn}
              onPress={() => {
                setTappedVerseId(null);
                speak(item.text, verseId);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tx('listen')}
            >
              <Ionicons name="volume-medium-outline" size={16} color={ACCENT} />
            </Pressable>
          )}
          <Text
            style={[
              styles.verseNumber,
              isHighlightedFromParams && styles.verseNumberHighlight,
            ]}
          >
            {item.number}
          </Text>
        </View>
        <View style={styles.verseTextBlock}>
          <Text
            style={[
              styles.verseText,
              {
                color: theme.text,
                fontSize: Math.min(fontSize, 15),
                lineHeight: Math.min(fontSize, 15) * lineSpacingMult,
              },
            ]}
          >
            {item.text}
          </Text>
        </View>
        {hasNote && (
          <View style={styles.noteBadge}>
            <Ionicons name="chatbubble-ellipses" size={12} color="#C4956A" />
          </View>
        )}
        {favorite && <Text style={styles.verseFavoriteIcon}>♥</Text>}
      </VerseGesturePressable>
    );

    if (isHighlightedFromParams) {
      return (
        <View style={styles.verseHighlightWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.verseHighlightOverlay,
              { opacity: highlightAnim },
            ]}
          />
          {rowContent}
        </View>
      );
    }
    return rowContent;
  };

  const selectedVerseId = selectedVerse
    ? getVerseId(listChapter.book, listChapter.chapterNumber, selectedVerse.number)
    : null;
  const selectedHighlight = selectedVerseId ? highlights[selectedVerseId] : undefined;

  if (loading) {
    return <ReadScreenSkeleton />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.background, opacity: flashOpacity },
          styles.flashOverlay,
        ]}
        pointerEvents="none"
      />
      {doubleTapHeartVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.doubleTapHeartOverlay,
            {
              opacity: doubleTapHeartOpacity,
              transform: [{ scale: doubleTapHeartScale }],
            },
          ]}
        >
          <Ionicons name="heart" size={96} color="#E57373" />
        </Animated.View>
      ) : null}
      <View style={[styles.headerWrap, { backgroundColor: theme.background }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={triggerPrevChapter}
            disabled={isFirstChapter || isPageTurning}
            style={[styles.chapterNavBtn, (isFirstChapter || isPageTurning) && styles.chapterNavBtnDisabled]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tx('prevChapter')}
          >
            <Ionicons name="chevron-back" size={24} color={CHAPTER_NAV_COLOR} />
          </Pressable>
          <Pressable
            style={styles.headerTitleBlock}
            onPress={() => setBookPickerVisible(true)}
          >
            <Text style={[styles.headerBookName, { color: theme.text }]} numberOfLines={1}>
              {currentBook.name}
            </Text>
            <View style={styles.headerChapterRow}>
              <Text style={styles.headerChapterLabel}>
                {isPsalmMode
                  ? tx('psalmName', { n: chapter.chapterNumber })
                  : tx('chapterOrdinalLabel', { n: chapterIndexInBook + 1 })}
              </Text>
              <Text style={styles.headerChevron}>▾</Text>
            </View>
            <Text style={[styles.headerVerseCount, { color: theme.textMuted }]}>
              {visibleVerseIndex} / {listChapter.verses.length} {tx('verse')}
            </Text>
          </Pressable>
          <Pressable
            onPress={triggerNextChapter}
            disabled={isLastChapter || isPageTurning}
            style={[styles.chapterNavBtn, (isLastChapter || isPageTurning) && styles.chapterNavBtnDisabled]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tx('nextChapter')}
          >
            <Ionicons name="chevron-forward" size={24} color={CHAPTER_NAV_COLOR} />
          </Pressable>
        </View>

        <View style={styles.readProgressWrap}>
          <View style={styles.readProgressBg}>
            <Animated.View
              style={[
                styles.readProgressFill,
                {
                  width: readProgressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {!isPsalmMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.versionBar, { borderBottomColor: theme.border, overflow: 'visible', flexGrow: 0 }]}
            contentContainerStyle={styles.versionBarContent}
          >
            {(['TR', 'TR_1878', 'WEB', 'KJV'] as BibleVersion[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.versionBtn,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  bibleVersion === v && styles.versionBtnActive,
                ]}
                onPress={() => {
                  setBibleVersion(v);
                  void Haptics.selectionAsync();
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.versionBtnText,
                    { color: theme.textMuted },
                    bibleVersion === v && styles.versionBtnTextActive,
                  ]}
                >
                  {VERSION_LABELS[v]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.versionBtn,
                styles.parallelVersionBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                parallelRead && styles.versionBtnActive,
              ]}
              onPress={() => {
                setParallelRead((p) => !p);
                void Haptics.selectionAsync();
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.versionBtnText,
                  { color: theme.textMuted },
                  parallelRead && styles.versionBtnTextActive,
                ]}
              >
                Paralel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
        {parallelRead && !isPsalmMode && (
          <View
            style={[
              styles.parallelEnRow,
              { backgroundColor: theme.surface, borderBottomColor: theme.border },
            ]}
          >
            <Text style={[styles.parallelEnLabel, { color: theme.textMuted }]}>EN</Text>
            {(['WEB', 'KJV'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.versionBtn,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  parallelEnVersion === v && styles.versionBtnActive,
                ]}
                onPress={() => {
                  setParallelEnVersion(v);
                  void Haptics.selectionAsync();
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.versionBtnText,
                    { color: theme.textMuted },
                    parallelEnVersion === v && styles.versionBtnTextActive,
                  ]}
                >
                  {VERSION_LABELS[v]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={toggleToolbar}
          style={{
            alignSelf: 'center',
            backgroundColor: theme.surface,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 3,
            marginBottom: 2,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons
            name={toolbarVisible ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={theme.textMuted}
          />
        </TouchableOpacity>
        <Animated.View
          style={{
            overflow: 'hidden',
            maxHeight: toolbarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 56],
            }),
            opacity: toolbarAnim,
          }}
        >
          <View
            style={[
              styles.toolbar,
              {
                backgroundColor: theme.surface,
                borderTopColor: 'rgba(196,149,80,0.15)',
                borderBottomColor: 'rgba(196,149,80,0.15)',
              },
            ]}
          >
            <Pressable style={styles.toolbarIcon} onPress={() => router.push('/search')} hitSlop={8}>
              <Ionicons name="search" size={20} color={theme.textMuted} />
              <Text style={[styles.toolbarLabel, { color: theme.textMuted }]}>{tx('search')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.toolbarIcon,
                ambientTrack?.id !== 'silence' && ambientPlaying && styles.toolbarBtnActive,
              ]}
              onPress={() => setShowMusicModal(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tx('ambientMusic')}
            >
              {ambientTrack?.id !== 'silence' && ambientPlaying ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  {[0, 1, 2].map((i) => (
                    <MiniWaveBar key={i} index={i} color="#C4956A" />
                  ))}
                </View>
              ) : (
                <Ionicons name="musical-note-outline" size={20} color={theme.textMuted} />
              )}
              <Text style={[styles.toolbarLabel, { color: theme.textMuted }]}>Ortam</Text>
            </Pressable>
            <Pressable
              style={styles.toolbarIcon}
              onPress={() => setCompareMode((c) => !c)}
              hitSlop={8}
            >
              <Ionicons
                name="swap-horizontal"
                size={20}
                color={compareMode ? CHAPTER_NAV_COLOR : theme.textMuted}
              />
              <Text style={[styles.toolbarLabel, { color: compareMode ? CHAPTER_NAV_COLOR : theme.textMuted }]}>
                {tx('compare')}
              </Text>
            </Pressable>
            <Pressable style={styles.toolbarIcon} onPress={handleSpeakChapter} hitSlop={8}>
              <View style={styles.toolbarListenWrap}>
                <Ionicons
                  name={isSpeaking ? 'stop' : 'play'}
                  size={20}
                  color={isSpeaking ? CHAPTER_NAV_COLOR : theme.textMuted}
                />
                {isSpeaking && <ListeningDot />}
              </View>
              <Text style={[styles.toolbarLabel, { color: isSpeaking ? CHAPTER_NAV_COLOR : theme.textMuted }]}>
                {tx('listen')}
              </Text>
              <Text style={[styles.toolbarLangHint, { color: theme.textMuted }]}>
                {getTTSLanguage(bibleVersion) === 'tr-TR' ? 'TR' : 'EN'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.toolbarIcon}
              onPress={() => setReadingOptionsVisible(true)}
              hitSlop={8}
            >
              <Text style={[styles.toolbarAaIcon, { color: theme.textMuted }]}>Aa</Text>
              <Text style={[styles.toolbarLabel, { color: theme.textMuted }]}>{tx('theme')}</Text>
            </Pressable>
            <Pressable
              style={[styles.toolbarIcon, currentContextNote == null && styles.toolbarIconDimmed]}
              onPress={() => currentContextNote != null && setContextModalVisible(true)}
              hitSlop={8}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={currentContextNote != null ? theme.textMuted : theme.textMuted}
              />
              <Text style={[styles.toolbarLabel, { color: theme.textMuted }]}>{tx('context')}</Text>
            </Pressable>
          </View>
        </Animated.View>
        {compareMode && !isPsalmMode && bibleVersion !== 'WEB' && bibleVersion !== 'KJV' && (
          <View style={[styles.langSelectorRow, { backgroundColor: theme.surface, borderTopColor: 'rgba(196,149,80,0.15)' }]}>
            <Text style={[styles.langSelectorLabel, { color: theme.textMuted }]}>{tx('compareColonLabel')}</Text>
            <View style={styles.langSelectorBtns}>
              {(['en', 'de', 'ar'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setSecondLang(lang)}
                  style={[
                    styles.langBtn,
                    secondLang === lang ? styles.langBtnActive : {},
                    secondLang === lang && { backgroundColor: CHAPTER_NAV_COLOR },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      { color: secondLang === lang ? colors.white : theme.textMuted },
                      lang === 'ar' && styles.langBtnTextRtl,
                    ]}
                  >
                    {bibleLanguageNames[lang]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.listWrap} {...chapterSwipePanResponder.panHandlers}>
        <Animated.View
          style={[
            styles.pageContainer,
            {
              transform: [{ translateX: pageTranslateX }, { scale: pageScale }],
              opacity: pageOpacity,
            },
          ]}
        >
          {parallelRead && !isPsalmMode ? (
            <View style={styles.parallelRow}>
              <FlatList
                style={styles.parallelColumn}
                ref={flatListRef}
                data={listChapter.verses}
                keyExtractor={(item) => String(item.number)}
                renderItem={renderVerse}
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={renderListFooter}
                getItemLayout={(_, index) => ({
                  length: verseRowEstimate,
                  offset: verseRowEstimate * index,
                  index,
                })}
                onScrollToIndexFailed={onScrollToIndexFailed}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScrollList}
                onScrollEndDrag={onScrollEndDrag}
                onMomentumScrollEnd={onMomentumScrollEnd}
                onContentSizeChange={onContentSizeChange}
                onLayout={onLayoutList}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                scrollEventThrottle={16}
                scrollEnabled={!isPageTurning}
              />
              <View style={[styles.parallelDivider, { backgroundColor: theme.border }]} />
              <FlatList
                style={styles.parallelColumn}
                data={parallelRightChapter.verses}
                keyExtractor={(item) => String(item.number)}
                renderItem={renderParallelRightVerse}
                ListFooterComponent={() => <View style={styles.parallelRightFooterPad} />}
                getItemLayout={(_, index) => ({
                  length: verseRowEstimate,
                  offset: verseRowEstimate * index,
                  index,
                })}
                onScrollToIndexFailed={onScrollToIndexFailed}
                contentContainerStyle={[styles.listContent, styles.parallelRightListContent]}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isPageTurning}
              />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={listChapter.verses}
              keyExtractor={(item) => String(item.number)}
              renderItem={renderVerse}
              ListHeaderComponent={renderListHeader}
              ListFooterComponent={renderListFooter}
              getItemLayout={(_, index) => ({
                length: verseRowEstimate,
                offset: verseRowEstimate * index,
                index,
              })}
              onScrollToIndexFailed={onScrollToIndexFailed}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={onScrollList}
              onScrollEndDrag={onScrollEndDrag}
              onMomentumScrollEnd={onMomentumScrollEnd}
              onContentSizeChange={onContentSizeChange}
              onLayout={onLayoutList}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              scrollEventThrottle={16}
              scrollEnabled={!isPageTurning}
            />
          )}
        </Animated.View>
        <Animated.View
          style={[styles.transitionOverlay, { opacity: overlayOpacity, backgroundColor: theme.background }]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.swipeArrowLeft, { opacity: leftArrowOpacity }]} pointerEvents="none">
          <Ionicons name="chevron-back" size={28} color={CHAPTER_NAV_COLOR} />
        </Animated.View>
        <Animated.View style={[styles.swipeArrowRight, { opacity: rightArrowOpacity }]} pointerEvents="none">
          <Ionicons name="chevron-forward" size={28} color={CHAPTER_NAV_COLOR} />
        </Animated.View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedVerse && (
              <>
                <Text style={[styles.modalVerse, { color: theme.text }]}>
                  {selectedVerse.number}. {selectedVerse.text}
                </Text>

                {showNoteInput ? (
                  <View style={styles.noteInputSection}>
                    <TextInput
                      style={[styles.noteInput, { backgroundColor: theme.background, color: theme.text }]}
                      placeholder={tx('notePlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      value={noteDraft}
                      onChangeText={setNoteDraft}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.noteInputActions}>
                      <Pressable
                        style={[styles.noteInputBtn, { backgroundColor: theme.textMuted }]}
                        onPress={() => { setShowNoteInput(false); setNoteDraft(notes[selectedVerseId ?? ''] ?? ''); }}
                      >
                        <Text style={[styles.modalBtnText, { color: theme.text }]}>{tx('cancel')}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.noteInputBtn, { backgroundColor: ACCENT }]}
                        onPress={handleSaveNote}
                      >
                        <Text style={[styles.modalBtnText, { color: colors.white }]}>{tx('save')}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : showColorPicker ? (
                  <View style={styles.colorPickerSection}>
                    <Text style={[styles.colorPickerLabel, { color: theme.textMuted }]}>{tx('chooseColorLabel')}</Text>
                    <View style={styles.colorPickerRow}>
                      {HIGHLIGHT_COLORS.map((h) => (
                        <Pressable
                          key={h.id}
                          style={[
                            styles.colorCard,
                            {
                              backgroundColor: h.background,
                              borderColor: h.border,
                              borderWidth: selectedHighlight === h.id ? 2 : 1.5,
                            },
                          ]}
                          onPress={() => handleHighlightColor(h.id)}
                          accessibilityRole="button"
                          accessibilityLabel={h.label}
                        >
                          <Text style={[styles.colorCardLabel, { color: h.border }]}>{h.label}</Text>
                          {selectedHighlight === h.id && (
                            <View style={styles.colorCardCheckWrap}>
                              <Ionicons name="checkmark" size={14} color={h.border} />
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                      accessibilityRole="button"
                      accessibilityLabel={isFavorite(selectedVerseId ?? '') ? tx('removeFromFavorites') : tx('addToFavorites')}
                      onPress={async () => {
                        if (selectedVerseId) {
                          const wasFav = isFavorite(selectedVerseId);
                          await toggleFavorite(selectedVerseId, selectedVerse.text);
                          if (!wasFav) {
                            animateFavorite();
                            pulseNotesTab();
                            haptics.success();
                            try {
                              if (!supabase) {
                                return;
                              }
                              const {
                                data: { user },
                              } = await supabase.auth.getUser();
                              await logFriendActivity(supabase, user, isOnline, {
                                type: 'verse_favorite',
                                verse_id: selectedVerseId,
                                book: chapter.book,
                                chapter: chapter.chapterNumber,
                              });
                            } catch {
                              /* ignore */
                            }
                          }
                          syncFavorites();
                          setTimeout(() => closeModal(), 500);
                        }
                      }}
                    >
                      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, transform: [{ scale: heartScale }] }}>
                        <Ionicons
                          name={isFavorite(selectedVerseId ?? '') ? 'heart' : 'heart-outline'}
                          size={18}
                          color={isFavorite(selectedVerseId ?? '') ? CHAPTER_NAV_COLOR : theme.textMuted}
                        />
                        <Text
                          style={[
                            styles.modalBtnText,
                            { color: isFavorite(selectedVerseId ?? '') ? CHAPTER_NAV_COLOR : theme.textMuted },
                          ]}
                        >
                          {isFavorite(selectedVerseId ?? '') ? tx('removeFromFavorites') : tx('addToFavorites')}
                        </Text>
                      </Animated.View>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                      onPress={handleCopyVerse}
                      accessibilityRole="button"
                      accessibilityLabel={verseCopied ? tx('copied') : tx('copyVerse')}
                    >
                      <Ionicons
                        name={verseCopied ? 'checkmark-outline' : 'copy-outline'}
                        size={20}
                        color={verseCopied ? CHAPTER_NAV_COLOR : theme.text}
                      />
                      <Text
                        style={[
                          styles.modalBtnText,
                          { color: verseCopied ? CHAPTER_NAV_COLOR : theme.text },
                        ]}
                      >
                        {verseCopied ? tx('copied') : tx('copyVerse')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                      accessibilityRole="button"
                      accessibilityLabel={tx('memorize')}
                      onPress={() => {
                        if (selectedVerseId && selectedVerse) {
                          closeModal();
                          router.push({
                            pathname: '/memorize',
                            params: {
                              verseId: selectedVerseId,
                              ref: getVerseRefFromVerseId(selectedVerseId),
                              text: selectedVerse.text,
                            },
                          });
                        }
                      }}
                    >
                      <Ionicons name="book-outline" size={20} color={theme.text} />
                      <Text style={[styles.modalBtnText, { color: theme.text }]}>{tx('memorize')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                      onPress={() => { setShowNoteInput(true); setShowColorPicker(false); }}
                      accessibilityRole="button"
                      accessibilityLabel={tx('addNote')}
                    >
                      <Ionicons name="create-outline" size={20} color={theme.text} />
                      <Text style={[styles.modalBtnText, { color: theme.text }]}>{tx('addNote')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                      onPress={() => { setShowColorPicker(true); setShowNoteInput(false); }}
                      accessibilityRole="button"
                      accessibilityLabel={tx('highlight')}
                    >
                      <Ionicons name="brush-outline" size={20} color={theme.text} />
                      <Text style={[styles.modalBtnText, { color: theme.text }]}>{tx('highlight')}</Text>
                    </Pressable>
                    {selectedHighlight != null && (
                      <Pressable
                        style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                        onPress={handleShareHighlight}
                        accessibilityRole="button"
                        accessibilityLabel={tx('shareHighlight')}
                      >
                        <Ionicons name="share-outline" size={20} color={theme.text} />
                        <Text style={[styles.modalBtnText, { color: theme.text }]}>{tx('shareHighlight')}</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnAccent]}
                      onPress={handleShare}
                      accessibilityRole="button"
                      accessibilityLabel={tx('share')}
                    >
                      <Ionicons name="share-outline" size={20} color={colors.white} />
                      <Text style={[styles.modalBtnText, { color: colors.white }]}>{tx('share')}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ChapterContextModal
        visible={contextModalVisible}
        onClose={() => setContextModalVisible(false)}
        contextNote={currentContextNote}
        bookId={currentBook.id}
        bookName={currentBook.name}
        chapterNumber={chapter.chapterNumber}
      />

      <Modal
        visible={bookPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBookPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBookPickerVisible(false)}
        >
          <Pressable
            style={[styles.bookPickerContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.bookPickerTitle, { color: theme.text }]}>
              {tx('chooseBookTitle')}
            </Text>
            <FlatList
              data={[
                { type: 'header' as const, label: tx('newTestamentProgress') },
                ...bookList.map((item, index) => ({ type: 'book' as const, item, index })),
                { type: 'header' as const, label: tx('oldTestamentLabel') },
                ...oldTestamentBooks.map((item) => ({ type: 'oldBook' as const, item })),
              ]}
              keyExtractor={(entry) =>
                entry.type === 'header' ? entry.label : entry.type === 'book' ? entry.item.id : entry.item.id
              }
              style={styles.bookPickerList}
              renderItem={({ item: entry }) => {
                if (entry.type === 'header') {
                  return (
                    <Text style={[styles.bookPickerSectionHeader, { color: theme.textMuted }]}>
                      {entry.label}
                    </Text>
                  );
                }
                if (entry.type === 'oldBook') {
                  const selected = isPsalmMode;
                  return (
                    <Pressable
                      style={[
                        styles.bookPickerRow,
                        { borderBottomColor: colors.accentBorder },
                        selected && { backgroundColor: colors.accentBadgeBg },
                      ]}
                      onPress={() => {
                        setIsPsalmMode(true);
                        setSelectedPsalmIndex(0);
                        setBookPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.bookPickerName, { color: theme.text }]}>
                        {entry.item.name}
                      </Text>
                      <Text style={[styles.bookPickerChapters, { color: theme.textMuted }]}>
                        {tx('psalmsCountLabel', { count: entry.item.chapterCount })}
                      </Text>
                    </Pressable>
                  );
                }
                const { item, index } = entry;
                return (
                  <Pressable
                    style={[
                      styles.bookPickerRow,
                      { borderBottomColor: colors.accentBorder },
                      !isPsalmMode && index === bookIndex && { backgroundColor: colors.accentBadgeBg },
                    ]}
                    onPress={() => {
                      setIsPsalmMode(false);
                      setBookIndex(index);
                      setChapterIndexInBook(0);
                      setBookPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.bookPickerName, { color: theme.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.bookPickerChapters, { color: theme.textMuted }]}>
                      {tx('chaptersCountLabel', { count: item.chapterCount })}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <ReadingOptionsSheet
        visible={readingOptionsVisible}
        onClose={() => setReadingOptionsVisible(false)}
        onTheme={() => setShowThemePicker(true)}
        onSpacing={() => setShowSpacingPicker(true)}
        onFont={() => setShowFontPicker(true)}
      />
      <ThemePickerModal
        visible={showThemePicker}
        onClose={() => setShowThemePicker(false)}
      />
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
          try {
            haptics.selection();
          } catch {
            /* ignore */
          }
        }}
      />
      <FontSizeModal
        visible={showFontPicker}
        onClose={() => setShowFontPicker(false)}
        currentSize={fontSize}
        onSelect={async (size) => {
          setFontSize(size);
          try {
            await AsyncStorage.setItem(STORAGE_FONT_SIZE, String(size));
          } catch {
            /* ignore */
          }
          try {
            haptics.selection();
          } catch {
            /* ignore */
          }
        }}
      />
      <Modal
        visible={showShareOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareOptions(false)}
      >
        <TouchableOpacity
          style={styles.shareOverlay}
          activeOpacity={1}
          onPress={() => setShowShareOptions(false)}
        />
        <View style={[styles.shareSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.shareHandle, { backgroundColor: theme.border }]} />
          <Text style={[styles.shareTitle, { color: theme.text }]}>{tx('shareVerseTitle')}</Text>
          <Text style={styles.shareRef}>{shareVerse.ref}</Text>
          <TouchableOpacity
            style={[styles.shareOption, { borderColor: theme.border }]}
            onPress={async () => {
              setShowShareOptions(false);
              haptics.light();
              await Share.share({
                message: buildShareMessage(
                  shareVerse.text,
                  shareVerse.ref,
                  shareVerse.bookId != null &&
                    shareVerse.chapter != null &&
                    shareVerse.verse != null
                    ? {
                        bookId: shareVerse.bookId,
                        chapter: shareVerse.chapter,
                        verse: shareVerse.verse,
                      }
                    : null
                ),
              });
            }}
          >
            <View style={styles.shareOptionIcon}>
              <Ionicons name="text-outline" size={20} color="#C4956A" />
            </View>
            <View style={styles.shareOptionText}>
              <Text style={[styles.shareOptionTitle, { color: theme.text }]}>{tx('shareAsTextTitle')}</Text>
              <Text style={[styles.shareOptionDesc, { color: theme.textMuted }]}>
                {tx('shareAsTextDesc')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareOption, { borderColor: theme.border }]}
            onPress={() => {
              setShowShareOptions(false);
              setTimeout(() => setShowShareCard(true), 300);
            }}
          >
            <View style={styles.shareOptionIcon}>
              <Ionicons name="image-outline" size={20} color="#C4956A" />
            </View>
            <View style={styles.shareOptionText}>
              <Text style={[styles.shareOptionTitle, { color: theme.text }]}>{tx('shareAsCardTitle')}</Text>
              <Text style={[styles.shareOptionDesc, { color: theme.textMuted }]}>
                {tx('shareAsCardDesc')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareCancelBtn} onPress={() => setShowShareOptions(false)}>
            <Text style={[styles.shareCancelText, { color: theme.textMuted }]}>{tx('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ShareVerseModal
        visible={showShareCard}
        onClose={() => setShowShareCard(false)}
        verseText={shareVerse.text}
        verseRef={shareVerse.ref}
        deepLinkParams={
          shareVerse.bookId != null && shareVerse.chapter != null && shareVerse.verse != null
            ? {
                bookId: shareVerse.bookId,
                chapter: shareVerse.chapter,
                verse: shareVerse.verse,
              }
            : null
        }
      />

      <AmbientMusicModal visible={showMusicModal} onClose={() => setShowMusicModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerWrap: {
    borderBottomWidth: 0,
    paddingBottom: 4,
    overflow: 'visible',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  chapterNavBtn: {
    padding: 4,
  },
  chapterNavBtnDisabled: {
    opacity: 0.3,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerBookName: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  headerChapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 4,
  },
  headerChapterLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: CHAPTER_NAV_COLOR,
    letterSpacing: 0.1,
  },
  headerChevron: {
    fontSize: 10,
    color: CHAPTER_NAV_COLOR,
  },
  headerVerseCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  toolbarIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  toolbarBtnActive: {
    backgroundColor: 'rgba(196,149,80,0.12)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  toolbarIconDimmed: {
    opacity: 0.3,
  },
  toolbarListenWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: CHAPTER_NAV_COLOR,
  },
  toolbarAaIcon: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  toolbarLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    letterSpacing: 0.45,
    marginTop: 2,
  },
  toolbarLangHint: {
    fontFamily: fonts.regular,
    fontSize: 9,
    marginTop: 0,
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 10,
  },
  langSelectorLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  langSelectorBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(196,149,80,0.15)',
  },
  langBtnActive: {},
  langBtnText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  langBtnTextRtl: {
    writingDirection: 'rtl',
  },
  readProgressWrap: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  readProgressBg: {
    height: 3,
    backgroundColor: 'rgba(196,149,80,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  readProgressFill: {
    height: '100%',
    backgroundColor: CHAPTER_NAV_COLOR,
    borderRadius: 2,
    shadowColor: CHAPTER_NAV_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  listWrap: {
    flex: 1,
    position: 'relative',
  },
  versionBar: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
    overflow: 'visible',
  },
  versionBarContent: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  versionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  parallelVersionBtn: {
    marginLeft: 4,
  },
  versionBtnActive: {
    backgroundColor: 'rgba(196,149,80,0.12)',
    borderColor: 'rgba(196,149,80,0.4)',
  },
  versionBtnText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  versionBtnTextActive: {
    color: '#C4956A',
  },
  parallelEnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  parallelEnLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginRight: 4,
  },
  parallelRow: {
    flex: 1,
    flexDirection: 'row',
  },
  parallelColumn: {
    flex: 1,
  },
  parallelDivider: {
    width: StyleSheet.hairlineWidth,
  },
  parallelRightListContent: {
    paddingTop: 96,
  },
  parallelRightFooterPad: {
    height: 200,
  },
  compareVerse: {
    paddingVertical: 2,
  },
  swipeArrowLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(196,149,106,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeArrowRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(196,149,106,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  flashOverlay: {
    zIndex: 9998,
  },
  doubleTapHeartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  pageContainer: {
    flex: 1,
  },
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  chapterFooter: {
    paddingTop: 32,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerDivider: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(196,149,80,0.4)',
    marginBottom: 8,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(196,149,80,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  footerBadgeText: {
    fontSize: 13,
    color: '#C4956A',
    fontFamily: fonts.regular,
  },
  footerVerseCount: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: fonts.italic,
  },
  footerNext: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  footerNextLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    fontFamily: fonts.regular,
  },
  footerNextBook: {
    fontSize: 18,
    fontFamily: fonts.regular,
    letterSpacing: -0.01,
  },
  footerSwipeHint: {
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  footerSwipeText: {
    fontSize: 12,
    color: 'rgba(196,149,80,0.5)',
    fontStyle: 'italic',
    fontFamily: fonts.italic,
  },
  listHeaderWrap: {
    width: '100%',
  },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(196,149,80,0.06)',
    borderRadius: 8,
    marginHorizontal: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.15)',
  },
  topBannerText: {
    fontSize: 13,
    color: 'rgba(232,224,208,0.55)',
    fontStyle: 'italic',
  },
  prevChapterWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  prevChapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(196,149,80,0.06)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,149,80,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  prevChapterLabel: {
    fontSize: 13,
    color: '#C4956A',
    fontStyle: 'italic',
  },
  nextChapterWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  nextChapterCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(196,149,80,0.15)',
    width: '100%',
  },
  nextChapterLabel: {
    fontSize: 11,
    letterSpacing: 0.15,
    color: 'rgba(232,224,208,0.55)',
    textTransform: 'uppercase',
  },
  nextChapterName: {
    fontSize: 20,
    color: '#E8E0D0',
    fontFamily: fonts.regular,
  },
  nextChapterButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.4)',
    borderRadius: 20,
    backgroundColor: 'rgba(196,149,80,0.06)',
  },
  nextChapterButtonText: {
    fontSize: 14,
    color: '#C4956A',
    fontFamily: fonts.regular,
  },
  nextChapterHint: {
    fontSize: 13,
    color: 'rgba(196,149,80,0.55)',
    fontStyle: 'italic',
    marginTop: 6,
  },
  nextChapterTitle: {
    fontSize: 15,
    color: '#C4956A',
    marginTop: 4,
    fontFamily: fonts.medium,
  },
  pullProgressWrap: {
    width: '100%',
    marginTop: 12,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  pullProgressBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(196,149,80,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  pullProgressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(196,149,80,0.35)',
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 6,
  },
  verseHighlightWrap: {
    position: 'relative',
    marginHorizontal: 4,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  verseHighlightOverlay: {
    backgroundColor: 'rgba(196,149,80,0.15)',
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: CHAPTER_NAV_COLOR,
  },
  verseNumberHighlight: {
    fontWeight: '600',
    color: CHAPTER_NAV_COLOR,
  },
  verseRowSelected: {
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  verseRowSpeaking: {
    backgroundColor: 'rgba(196,149,80,0.15)',
  },
  verseNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    minWidth: 28,
    marginRight: 12,
    gap: 4,
    paddingTop: 3,
  },
  verseNumber: {
    fontSize: 11,
    color: ACCENT,
    fontFamily: fonts.regular,
    marginRight: 6,
    opacity: 0.8,
    lineHeight: 24,
    minWidth: 28,
    textAlign: 'right',
    flexShrink: 0,
  },
  noteBadge: {
    backgroundColor: 'rgba(196,149,80,0.12)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    opacity: 0.8,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  verseFavoriteIcon: {
    fontSize: 10,
    color: CHAPTER_NAV_COLOR,
    opacity: 0.7,
    marginLeft: 6,
    alignSelf: 'center',
  },
  soundBarsWrap: {
    marginRight: 4,
  },
  verseSpeakBtn: {
    marginRight: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196,149,80,0.12)',
  },
  soundBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 20,
    width: 24,
    justifyContent: 'center',
  },
  soundBar: {
    width: 4,
    height: 14,
    backgroundColor: CHAPTER_NAV_COLOR,
    borderRadius: 2,
  },
  verseTextBlock: {
    flex: 1,
  },
  verseText: {
    fontFamily: fonts.regular,
    flex: 1,
    paddingRight: 16,
  },
  compareDivider: {
    height: 0.5,
    backgroundColor: 'rgba(196,149,106,0.3)',
    marginVertical: 8,
  },
  verseText1878: {
    fontFamily: fonts.italic,
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
  },
  modalVerse: {
    fontFamily: fonts.italic,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 10,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
  },
  modalBtnSurface: {},
  modalBtnAccent: {
    backgroundColor: ACCENT,
  },
  modalBtnText: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  noteInputSection: {
    marginTop: 4,
  },
  noteInput: {
    fontFamily: fonts.regular,
    fontSize: 15,
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
    marginBottom: 12,
  },
  noteInputActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  noteInputBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  colorPickerSection: {
    marginTop: 4,
  },
  colorPickerLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 12,
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorCard: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCardLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
  },
  colorCardCheckWrap: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  bookPickerContent: {
    borderRadius: 20,
    padding: 16,
    maxHeight: '80%',
    marginHorizontal: 24,
  },
  bookPickerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 12,
  },
  bookPickerSectionHeader: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  bookPickerList: {
    maxHeight: 400,
  },
  bookPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  bookPickerName: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  bookPickerChapters: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  themePickerContent: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
  },
  themePickerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
  },
  themeCardAa: {
    fontFamily: fonts.medium,
    fontSize: 24,
    marginBottom: 6,
  },
  themeCardName: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  themeFontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0.5,
  },
  themeFontLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  themeFontBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeFontBtn: {
    padding: 4,
  },
  themeFontBtnText: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  themeFontSize: {
    fontFamily: fonts.regular,
    fontSize: 14,
    minWidth: 24,
    textAlign: 'center',
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shareSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  shareHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  shareTitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
  shareRef: {
    fontSize: 12,
    color: '#C4956A',
    fontFamily: fonts.regular,
    letterSpacing: 0.08,
    marginBottom: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    marginBottom: 10,
  },
  shareOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(196,149,80,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionText: { flex: 1 },
  shareOptionTitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  shareOptionDesc: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: fonts.italic,
    marginTop: 2,
  },
  shareCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  shareCancelText: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
});

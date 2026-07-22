import {
  bookList,
  getBookIdByBookName,
  getVerseRefFromVerseId,
  getVerseTextByVerseId,
  parseVerseIdComponents,
} from '@/constants/bible-index';
import {
  getHighlightPaletteEntry,
  HIGHLIGHT_COLORS,
  type HighlightColorId,
} from '@/constants/highlight-colors';
import {
  createPrayerId,
  type PrayerEntry,
  STORAGE_PRAYERS,
} from '@/constants/prayer-journal';
import { FREE_LIMITS } from '@/constants/premium';
import { colors as palette, fonts as sheetFonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useFavorites, type FavoriteItem } from '@/hooks/useFavorites';
import { useHaptics } from '@/hooks/useHaptics';
import { usePremium } from '@/hooks/usePremium';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useSync } from '@/hooks/useSync';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ShareVerseModal from '@/components/ShareVerseModal';
import { SozAlert } from '@/components/SozAlert';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

const STORAGE_NOTES = '@soz/notes';
const STORAGE_NOTE_TIMESTAMPS = '@soz/noteTimestamps';
const STORAGE_HIGHLIGHTS = '@soz/highlights';
const STORAGE_HIGHLIGHT_TIMESTAMPS = '@soz/highlightTimestamps';

const ACCENT = '#C4956A';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Vurgu paleti (Kehribar / Adaçayı / Gül / Gökyüzü) — sol şerit ve filtre chip'leri */
const HIGHLIGHT_HEX: Record<HighlightColorId, string> = {
  amber: '#C4956A',
  sage: '#7C9A7C',
  rose: '#9A7C7C',
  sky: '#7C8A9A',
};

function highlightLeftColor(stored: string): string {
  return HIGHLIGHT_HEX[getHighlightPaletteEntry(stored).id];
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getBookFromVerseId(verseId: string): string {
  const parts = verseId.split('-');
  return parts.length >= 3 ? parts.slice(0, -2).join('-') : verseId;
}

function bookOrderIndex(bookName: string): number {
  const idx = bookList.findIndex((b) => b.name === bookName);
  return idx >= 0 ? idx : 999;
}

type NotesMap = Record<string, string>;
type NoteTimestampsMap = Record<string, string>;
type HighlightsMap = Record<string, string>;

type NoteSort = 'newest' | 'oldest' | 'book' | 'length';
type HighlightSort = 'newest' | 'oldest' | 'book';

function parseVerseId(verseId: string): { book: string; ch: number; v: number } | null {
  const p = parseVerseIdComponents(verseId);
  if (!p) return null;
  return { book: p.book, ch: p.chapter, v: p.verse };
}

function sortNoteEntries(
  entries: [string, string][],
  mode: NoteSort,
  ts: NoteTimestampsMap
): [string, string][] {
  const list = [...entries];
  const time = (id: string) => new Date(ts[id] ?? 0).getTime();
  if (mode === 'newest') return list.sort((a, b) => time(b[0]) - time(a[0]));
  if (mode === 'oldest') return list.sort((a, b) => time(a[0]) - time(b[0]));
  if (mode === 'length') return list.sort((a, b) => (b[1]?.length ?? 0) - (a[1]?.length ?? 0));
  return list.sort((a, b) => {
    const pa = parseVerseId(a[0]);
    const pb = parseVerseId(b[0]);
    if (!pa || !pb) return 0;
    const ia = bookOrderIndex(pa.book);
    const ib = bookOrderIndex(pb.book);
    if (ia !== ib) return ia - ib;
    if (pa.ch !== pb.ch) return pa.ch - pb.ch;
    return pa.v - pb.v;
  });
}

function sortHighlightEntries(
  entries: [string, string][],
  mode: HighlightSort,
  ts: Record<string, string>
): [string, string][] {
  const list = [...entries];
  const time = (id: string) => new Date(ts[id] ?? 0).getTime();
  if (mode === 'newest') return list.sort((a, b) => time(b[0]) - time(a[0]));
  if (mode === 'oldest') return list.sort((a, b) => time(a[0]) - time(b[0]));
  return list.sort((a, b) => {
    const pa = parseVerseId(a[0]);
    const pb = parseVerseId(b[0]);
    if (!pa || !pb) return 0;
    const ia = bookOrderIndex(pa.book);
    const ib = bookOrderIndex(pb.book);
    if (ia !== ib) return ia - ib;
    if (pa.ch !== pb.ch) return pa.ch - pb.ch;
    return pa.v - pb.v;
  });
}

type NotesScreenRouteProps = { asTab?: boolean };

export default function NotesScreenRoute({ asTab = false }: NotesScreenRouteProps = {}) {
  const { colors, fonts } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const safeBack = useSafeBack();
  const haptics = useHaptics();
  const { isPremium } = usePremium();
  const { favorites, refreshFavorites, removeFavorite } = useFavorites();
  const { syncNotes, syncHighlights, syncFavorites } = useSync();

  const [activeTab, setActiveTab] = useState<'notes' | 'highlights' | 'favorites' | 'prayers'>('notes');
  const [notes, setNotes] = useState<NotesMap>({});
  const [noteTimestamps, setNoteTimestamps] = useState<NoteTimestampsMap>({});
  const [highlights, setHighlights] = useState<HighlightsMap>({});
  const [highlightTimestamps, setHighlightTimestamps] = useState<Record<string, string>>({});
  const [prayers, setPrayers] = useState<PrayerEntry[]>([]);
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [highlightSort, setHighlightSort] = useState<HighlightSort>('newest');
  const [noteSort, setNoteSort] = useState<NoteSort>('newest');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const [prayerModalVisible, setPrayerModalVisible] = useState(false);
  const [prayerDraftTitle, setPrayerDraftTitle] = useState('');
  const [prayerDraftText, setPrayerDraftText] = useState('');
  const [prayerDraftAnswered, setPrayerDraftAnswered] = useState(false);
  const [editingPrayerId, setEditingPrayerId] = useState<string | null>(null);
  const [prayerJustAnsweredId, setPrayerJustAnsweredId] = useState<string | null>(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterSlide = useSharedValue(300);

  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareVerse, setShareVerse] = useState({ text: '', ref: '' });
  const [showShareCard, setShowShareCard] = useState(false);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();

  const searchHeight = useSharedValue(0);

  const loadData = useCallback(async () => {
    try {
      try {
        await syncNotes();
        await syncHighlights();
        await syncFavorites();
      } catch (syncErr) {
        console.error('[Notes] Supabase sync error (local devam):', syncErr);
      }

      const [nRaw, ntRaw, hRaw, htRaw, pRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_NOTES),
        AsyncStorage.getItem(STORAGE_NOTE_TIMESTAMPS),
        AsyncStorage.getItem(STORAGE_HIGHLIGHTS),
        AsyncStorage.getItem(STORAGE_HIGHLIGHT_TIMESTAMPS),
        AsyncStorage.getItem(STORAGE_PRAYERS),
      ]);

      let nextNotes: NotesMap = {};
      try {
        if (nRaw) {
          const parsed = JSON.parse(nRaw) as unknown;
          nextNotes =
            parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? (parsed as NotesMap)
              : {};
        }
      } catch {
        nextNotes = {};
      }
      setNotes(nextNotes);

      let nextNoteTs: NoteTimestampsMap = {};
      try {
        if (ntRaw) nextNoteTs = JSON.parse(ntRaw) as NoteTimestampsMap;
      } catch {
        nextNoteTs = {};
      }
      const now = new Date().toISOString();
      let tsChanged = false;
      for (const id of Object.keys(nextNotes)) {
        if (!nextNoteTs[id]) {
          nextNoteTs[id] = now;
          tsChanged = true;
        }
      }
      for (const k of Object.keys(nextNoteTs)) {
        if (!(k in nextNotes)) {
          delete nextNoteTs[k];
          tsChanged = true;
        }
      }
      if (tsChanged) {
        await AsyncStorage.setItem(STORAGE_NOTE_TIMESTAMPS, JSON.stringify(nextNoteTs));
      }
      setNoteTimestamps(nextNoteTs);

      let nextHighlights: HighlightsMap = {};
      try {
        if (hRaw) {
          const parsed = JSON.parse(hRaw) as unknown;
          nextHighlights =
            parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? (parsed as HighlightsMap)
              : {};
        }
      } catch {
        nextHighlights = {};
      }
      setHighlights(nextHighlights);

      let meta: Record<string, string> = {};
      try {
        if (htRaw) meta = JSON.parse(htRaw) as Record<string, string>;
      } catch {
        meta = {};
      }
      let metaChanged = false;
      for (const id of Object.keys(nextHighlights)) {
        if (!meta[id]) {
          meta[id] = now;
          metaChanged = true;
        }
      }
      for (const k of Object.keys(meta)) {
        if (!(k in nextHighlights)) {
          delete meta[k];
          metaChanged = true;
        }
      }
      if (metaChanged) {
        await AsyncStorage.setItem(STORAGE_HIGHLIGHT_TIMESTAMPS, JSON.stringify(meta));
      }
      setHighlightTimestamps(meta);

      let nextPrayers: PrayerEntry[] = [];
      try {
        if (pRaw) nextPrayers = JSON.parse(pRaw) as PrayerEntry[];
      } catch {
        nextPrayers = [];
      }
      setPrayers(nextPrayers);
    } catch (e) {
      console.error('loadData error:', e);
      setNotes({});
      setNoteTimestamps({});
      setHighlights({});
      setHighlightTimestamps({});
      setPrayers([]);
    }
  }, [syncNotes, syncHighlights, syncFavorites]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      void refreshFavorites();
    }, [activeTab, loadData, refreshFavorites])
  );

  const handleRemoveFavorite = useCallback(
    async (id: string) => {
      try {
        await removeFavorite(id);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        /* ignore */
      }
    },
    [removeFavorite]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    refreshFavorites();
    setRefreshing(false);
  }, [loadData, refreshFavorites]);

  const noteEntries = useMemo(() => Object.entries(notes), [notes]);
  const highlightEntries = useMemo(() => Object.entries(highlights), [highlights]);

  const notesThisWeek = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return noteEntries.filter(([id]) => {
      const t = noteTimestamps[id];
      return t && new Date(t).getTime() >= cutoff;
    }).length;
  }, [noteEntries, noteTimestamps]);

  const highlightsThisWeek = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return highlightEntries.filter(([id]) => {
      const t = highlightTimestamps[id];
      return t && new Date(t).getTime() >= cutoff;
    }).length;
  }, [highlightEntries, highlightTimestamps]);

  const favoritesThisWeek = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return favorites.filter((f: FavoriteItem) => new Date(f.addedAt).getTime() >= cutoff).length;
  }, [favorites]);

  const prayersThisWeek = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return prayers.filter((p) => new Date(p.createdAt).getTime() >= cutoff).length;
  }, [prayers]);

  const activeTabStats = useMemo(() => {
    switch (activeTab) {
      case 'highlights':
        return { thisWeek: highlightsThisWeek, total: highlightEntries.length, noun: 'vurgu' };
      case 'favorites':
        return { thisWeek: favoritesThisWeek, total: favorites.length, noun: 'favori' };
      case 'prayers':
        return { thisWeek: prayersThisWeek, total: prayers.length, noun: 'dua' };
      case 'notes':
      default:
        return { thisWeek: notesThisWeek, total: noteEntries.length, noun: 'not' };
    }
  }, [
    activeTab,
    notesThisWeek,
    noteEntries.length,
    highlightsThisWeek,
    highlightEntries.length,
    favoritesThisWeek,
    favorites.length,
    prayersThisWeek,
    prayers.length,
  ]);

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    height: searchHeight.value,
    overflow: 'hidden' as const,
  }));

  useEffect(() => {
    searchHeight.value = withTiming(searchVisible ? 48 : 0, {
      duration: 220,
    });
    if (searchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      Keyboard.dismiss();
    }
  }, [searchVisible]);

  useEffect(() => {
    if (showFilterModal) {
      filterSlide.value = withSpring(0, { damping: 20, stiffness: 160 });
    } else {
      filterSlide.value = withTiming(300, { duration: 220 });
    }
  }, [showFilterModal, filterSlide]);

  const filterSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: filterSlide.value }],
  }));

  const closeSearch = useCallback(() => {
    setSearchVisible(false);
    setSearchQuery('');
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const isSearching = searchVisible && query.length > 0;

  const filteredNoteEntries = useMemo(() => {
    let list = sortNoteEntries(noteEntries, noteSort, noteTimestamps);
    if (!isSearching) return list;
    return list.filter(([verseId, text]) => {
      const refStr = getVerseRefFromVerseId(verseId).toLowerCase();
      const verseText = (getVerseTextByVerseId(verseId) ?? '').toLowerCase();
      return refStr.includes(query) || verseText.includes(query) || (text ?? '').toLowerCase().includes(query);
    });
  }, [noteEntries, noteSort, noteTimestamps, isSearching, query]);

  const groupedNotes = useMemo(() => {
    const acc: Record<string, [string, string][]> = {};
    for (const entry of filteredNoteEntries) {
      const book = getBookFromVerseId(entry[0]);
      if (!acc[book]) acc[book] = [];
      acc[book].push(entry);
    }
    const order = [...Object.keys(acc)].sort((a, b) => bookOrderIndex(a) - bookOrderIndex(b));
    return order.map((book) => ({ book, entries: acc[book]! }));
  }, [filteredNoteEntries]);

  const filteredHighlightEntries = useMemo(() => {
    let base = colorFilter
      ? highlightEntries.filter(([, c]) => getHighlightPaletteEntry(c).id === colorFilter)
      : highlightEntries;
    base = sortHighlightEntries(base, highlightSort, highlightTimestamps);
    if (!isSearching) return base;
    return base.filter(([verseId]) => {
      const refStr = getVerseRefFromVerseId(verseId).toLowerCase();
      const verseText = (getVerseTextByVerseId(verseId) ?? '').toLowerCase();
      return refStr.includes(query) || verseText.includes(query);
    });
  }, [highlightEntries, colorFilter, highlightSort, highlightTimestamps, isSearching, query]);

  const filteredFavorites = useMemo(() => {
    if (!isSearching) return favorites;
    return favorites.filter((f: FavoriteItem) => {
      const refStr = (f.ref ?? '').toLowerCase();
      const verseText = (f.text ?? '').toLowerCase();
      return refStr.includes(query) || verseText.includes(query);
    });
  }, [favorites, isSearching, query]);

  const filteredPrayers = useMemo(() => {
    if (!isSearching) return prayers;
    return prayers.filter((p) => {
      const title = (p.title ?? '').toLowerCase();
      const text = (p.text ?? '').toLowerCase();
      return title.includes(query) || text.includes(query);
    });
  }, [prayers, isSearching, query]);

  const hasNoResults =
    isSearching &&
    filteredNoteEntries.length === 0 &&
    filteredHighlightEntries.length === 0 &&
    filteredFavorites.length === 0 &&
    filteredPrayers.length === 0;

  const handleDeleteNote = useCallback(
    async (verseId: string) => {
      const next = { ...notes };
      delete next[verseId];
      setNotes(next);
      const nextTs = { ...noteTimestamps };
      delete nextTs[verseId];
      setNoteTimestamps(nextTs);
      try {
        await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(next));
        await AsyncStorage.setItem(STORAGE_NOTE_TIMESTAMPS, JSON.stringify(nextTs));
      } catch (_) {}
    },
    [notes, noteTimestamps]
  );

  const handleDeleteHighlight = useCallback(
    async (verseId: string) => {
      const next = { ...highlights };
      delete next[verseId];
      setHighlights(next);
      const nextMeta = { ...highlightTimestamps };
      delete nextMeta[verseId];
      setHighlightTimestamps(nextMeta);
      try {
        await AsyncStorage.setItem(STORAGE_HIGHLIGHTS, JSON.stringify(next));
        await AsyncStorage.setItem(STORAGE_HIGHLIGHT_TIMESTAMPS, JSON.stringify(nextMeta));
      } catch (_) {}
    },
    [highlights, highlightTimestamps]
  );

  const handleSetHighlightColor = useCallback(
    async (verseId: string, colorId: HighlightColorId) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = { ...highlights, [verseId]: colorId };
      setHighlights(next);
      try {
        await AsyncStorage.setItem(STORAGE_HIGHLIGHTS, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [highlights]
  );

  const savePrayer = useCallback(async () => {
    const text = prayerDraftText.trim();
    if (!text) return;
    const now = new Date().toISOString();
    if (editingPrayerId) {
      const next = prayers.map((p) =>
        p.id === editingPrayerId
          ? {
              ...p,
              title: prayerDraftTitle.trim() || undefined,
              text,
              answered: prayerDraftAnswered,
              answeredAt: prayerDraftAnswered ? now : undefined,
            }
          : p
      );
      setPrayers(next);
      await AsyncStorage.setItem(STORAGE_PRAYERS, JSON.stringify(next));
    } else {
      const entry: PrayerEntry = {
        id: createPrayerId(),
        title: prayerDraftTitle.trim() || undefined,
        text,
        answered: prayerDraftAnswered,
        createdAt: now,
        answeredAt: prayerDraftAnswered ? now : undefined,
      };
      const next = [entry, ...prayers];
      setPrayers(next);
      await AsyncStorage.setItem(STORAGE_PRAYERS, JSON.stringify(next));
    }
    setPrayerModalVisible(false);
    setPrayerDraftTitle('');
    setPrayerDraftText('');
    setPrayerDraftAnswered(false);
    setEditingPrayerId(null);
  }, [prayerDraftTitle, prayerDraftText, prayerDraftAnswered, editingPrayerId, prayers]);

  const openAddPrayer = useCallback(() => {
    setEditingPrayerId(null);
    setPrayerDraftTitle('');
    setPrayerDraftText('');
    setPrayerDraftAnswered(false);
    setPrayerModalVisible(true);
  }, []);

  const markPrayerAnswered = useCallback(
    async (id: string) => {
      const p = prayers.find((x) => x.id === id);
      if (!p || p.answered) return;
      try {
        haptics.success();
      } catch (_) {}
      setPrayerJustAnsweredId(id);
      const now = new Date().toISOString();
      const next = prayers.map((x) =>
        x.id === id ? { ...x, answered: true, answeredAt: now } : x
      );
      setPrayers(next);
      try {
        await AsyncStorage.setItem(STORAGE_PRAYERS, JSON.stringify(next));
      } catch (_) {}
    },
    [prayers]
  );

  const handleDeletePrayer = useCallback(
    async (id: string) => {
      const next = prayers.filter((p) => p.id !== id);
      setPrayers(next);
      await AsyncStorage.setItem(STORAGE_PRAYERS, JSON.stringify(next));
      if (editingPrayerId === id) {
        setPrayerModalVisible(false);
        setEditingPrayerId(null);
      }
    },
    [prayers, editingPrayerId]
  );

  const renderRightActions = useCallback(
    (onDelete: () => void) => (
      <Pressable style={styles.swipeDeleteAction} onPress={onDelete}>
        <Ionicons name="trash-outline" size={22} color="#E57373" />
        <Text style={styles.swipeDeleteText}>Sil</Text>
      </Pressable>
    ),
    []
  );

  const openNoteInReader = useCallback(
    (verseId: string) => {
      const p = parseVerseId(verseId);
      if (!p) return;
      const bookId = getBookIdByBookName(p.book);
      if (!bookId) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(tabs)/read',
        params: {
          book: bookId,
          chapter: String(p.ch),
          highlightVerse: String(p.v),
        },
      });
    },
    [router]
  );

  const showNoteSortSheet = useCallback(() => {
    const options = ['En yeni önce', 'En eski önce', 'Kitaba göre', 'Uzunluğa göre', 'İptal'];
    const cancelIndex = 4;
    const apply = (index: number) => {
      if (index === cancelIndex || index < 0) return;
      if (index === 0) setNoteSort('newest');
      else if (index === 1) setNoteSort('oldest');
      else if (index === 2) setNoteSort('book');
      else if (index === 3) setNoteSort('length');
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIndex }, apply);
    } else {
      showAlert('Sıralama', undefined, [
        { text: 'En yeni önce', onPress: () => setNoteSort('newest') },
        { text: 'En eski önce', onPress: () => setNoteSort('oldest') },
        { text: 'Kitaba göre', onPress: () => setNoteSort('book') },
        { text: 'Uzunluğa göre', onPress: () => setNoteSort('length') },
        { text: 'İptal', style: 'cancel' },
      ]);
    }
  }, [showAlert]);

  const showHighlightSortSheet = useCallback(() => {
    const options = ['En yeni önce', 'En eski önce', 'Kitaba göre', 'İptal'];
    const cancelIndex = 3;
    const apply = (index: number) => {
      if (index === cancelIndex || index < 0) return;
      if (index === 0) setHighlightSort('newest');
      else if (index === 1) setHighlightSort('oldest');
      else if (index === 2) setHighlightSort('book');
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIndex }, apply);
    } else {
      showAlert('Sıralama', undefined, [
        { text: 'En yeni önce', onPress: () => setHighlightSort('newest') },
        { text: 'En eski önce', onPress: () => setHighlightSort('oldest') },
        { text: 'Kitaba göre', onPress: () => setHighlightSort('book') },
        { text: 'İptal', style: 'cancel' },
      ]);
    }
  }, [showAlert]);

  const prayersAnswered = useMemo(() => prayers.filter((p) => p.answered).length, [prayers]);
  const atNotesLimit = !isPremium && noteEntries.length >= FREE_LIMITS.notesLimit;

  const tabs = useMemo(
    () => [
      { id: 'notes' as const, label: t('notes'), count: noteEntries.length },
      { id: 'highlights' as const, label: t('highlights'), count: highlightEntries.length },
      { id: 'favorites' as const, label: t('favorites'), count: favorites.length },
      { id: 'prayers' as const, label: t('prayers'), count: prayers.length },
    ],
    [noteEntries.length, highlightEntries.length, favorites.length, prayers.length]
  );

  const prayerCanSave = prayerDraftText.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.headerRow, { borderBottomColor: 'rgba(196,149,80,0.12)' }]}>
          {asTab ? (
            <View style={styles.backBtn} />
          ) : (
            <Pressable onPress={() => safeBack()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          )}
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fonts.thin }]}>
            {t('myNotes')}
          </Text>
          <View style={styles.headerRight}>
            {activeTab === 'prayers' ? (
              <Pressable onPress={openAddPrayer} style={styles.headerIconBtn} hitSlop={10}>
                <Ionicons name="add-outline" size={24} color={colors.text} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setSearchVisible(true)}
                style={styles.headerIconBtn}
                hitSlop={10}
              >
                <Ionicons name="search-outline" size={24} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        <Animated.View style={[searchAnimatedStyle, styles.searchBarWrap]}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Not veya ayet ara..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            <Pressable onPress={closeSearch} style={styles.searchCloseBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        {!searchVisible && activeTabStats.total > 0 && (
          <>
            <View style={styles.statsBanner}>
              <View style={styles.statsBannerLeft}>
                <Ionicons name="create-outline" size={18} color={ACCENT} />
                <Text style={styles.statsBannerText}>
                  {activeTabStats.thisWeek > 0
                    ? `Bu hafta ${activeTabStats.thisWeek} ${activeTabStats.noun} ekledin`
                    : `Bu hafta henüz ${activeTabStats.noun} eklemedin`}
                </Text>
              </View>
              <Text style={styles.statsBannerTotal}>{activeTabStats.total} toplam</Text>
            </View>
            {atNotesLimit && (
              <Text style={[styles.limitWarning, { color: colors.textMuted }]}>
                5/5 not kullanıldı · Premium ile sınırsız
              </Text>
            )}
          </>
        )}

        <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.id ? ACCENT : colors.textMuted },
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
                {tab.count > 0 ? ` (${tab.count})` : ''}
              </Text>
              {activeTab === tab.id && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'notes' && noteEntries.length > 0 && (
          <View style={styles.toolbarRow}>
            <Pressable onPress={() => setShowFilterModal(true)} style={styles.sortBtn} hitSlop={10}>
              <Ionicons name="options-outline" size={22} color={ACCENT} />
            </Pressable>
          </View>
        )}

        {activeTab === 'highlights' && highlightEntries.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            <Pressable
              onPress={() => setColorFilter(null)}
              style={[
                styles.highlightFilterChip,
                {
                  borderColor: colorFilter === null ? ACCENT : colors.border,
                  backgroundColor: colorFilter === null ? `${ACCENT}25` : colors.card,
                },
              ]}
            >
              <Text style={[styles.highlightFilterChipLabel, { color: colors.text }]}>Tümü</Text>
            </Pressable>
            {HIGHLIGHT_COLORS.map((c) => {
              const hex = HIGHLIGHT_HEX[c.id];
              const selected = colorFilter === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setColorFilter(selected ? null : c.id)}
                  style={[
                    styles.highlightFilterChip,
                    {
                      borderColor: selected ? hex : colors.border,
                      backgroundColor: selected ? `${hex}25` : colors.card,
                    },
                  ]}
                >
                  <View style={[styles.highlightFilterSwatch, { backgroundColor: hex }]} />
                  <Text style={[styles.highlightFilterChipLabel, { color: colors.text }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            (activeTab === 'notes' && filteredNoteEntries.length === 0) && styles.scrollContentEmpty,
            (activeTab === 'highlights' && filteredHighlightEntries.length === 0) && styles.scrollContentEmpty,
            (activeTab === 'favorites' && filteredFavorites.length === 0) && styles.scrollContentEmpty,
            (activeTab === 'prayers' && filteredPrayers.length === 0) && styles.scrollContentEmpty,
            hasNoResults && styles.scrollContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
            />
          }
        >
          {hasNoResults && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                «{searchQuery}» için sonuç bulunamadı
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Farklı bir kelime dene
              </Text>
            </View>
          )}

          {activeTab === 'notes' && !hasNoResults && (
            <>
              {filteredNoteEntries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="document-text-outline" size={56} color={colors.border} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz not yok</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary, textAlign: 'center' }]}>
                    Okurken ayetlere uzun bas{'\n'}not almaya başla
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/read')}
                    style={{ marginTop: 8, backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
                  >
                    <Text style={{ color: '#FFF8EE', fontSize: 14, fontFamily: fonts.regular }}>Okumaya Başla →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {noteSort === 'book'
                    ? groupedNotes.map(({ book, entries }) => (
                        <View key={book}>
                          <Text style={styles.groupHeader}>{book}</Text>
                          {entries.map(([verseId, noteText]) => (
                            <NoteCard
                              key={verseId}
                              verseId={verseId}
                              noteText={noteText}
                              theme={colors}
                              fonts={fonts}
                              noteTimestamps={noteTimestamps}
                              onDelete={handleDeleteNote}
                              onEditNote={openNoteInReader}
                              renderRightActions={renderRightActions}
                            />
                          ))}
                        </View>
                      ))
                    : filteredNoteEntries.map(([verseId, noteText]) => (
                        <NoteCard
                          key={verseId}
                          verseId={verseId}
                          noteText={noteText}
                          theme={colors}
                          fonts={fonts}
                          noteTimestamps={noteTimestamps}
                          onDelete={handleDeleteNote}
                          onEditNote={openNoteInReader}
                          renderRightActions={renderRightActions}
                        />
                      ))}
                </>
              )}
            </>
          )}

          {activeTab === 'highlights' && !hasNoResults && (
            <>
              {highlightEntries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="brush-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>
                    Henüz vurgulanmış ayet yok
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary, marginTop: 8 }]}>
                    Ayetlere uzun bas, vurgula
                  </Text>
                </View>
              ) : filteredHighlightEntries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    {isSearching ? 'Aramaya uygun vurgu yok.' : 'Bu renk filtresinde vurgu yok.'}
                  </Text>
                </View>
              ) : (
                filteredHighlightEntries.map(([verseId, storedColor]) => {
                  const refStr = getVerseRefFromVerseId(verseId);
                  const verseText = getVerseTextByVerseId(verseId);
                  const palette = getHighlightPaletteEntry(storedColor);
                  const leftColor = highlightLeftColor(storedColor);
                  const shareMsg = `«${verseText ?? ''}»\n\n— ${refStr}\n\nSöz Uygulaması`;
                  return (
                    <View
                      key={verseId}
                      style={[
                        styles.highlightCard,
                        {
                          backgroundColor: colors.card,
                          borderLeftColor: leftColor,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.highlightVerseText, { color: colors.text }]}
                        numberOfLines={6}
                      >
                        {verseText ?? ''}
                      </Text>
                      <View style={styles.highlightMetaRow}>
                        <Text style={[styles.highlightRefInline, { color: ACCENT }]} numberOfLines={1}>
                          {refStr}
                        </Text>
                        <Text style={[styles.highlightDateInline, { color: colors.textSecondary }]}>
                          {formatDate(highlightTimestamps[verseId])}
                        </Text>
                      </View>
                      <View style={styles.highlightBottomRow}>
                        <View style={styles.highlightColorPicker}>
                          {HIGHLIGHT_COLORS.map((opt) => {
                            const active = palette.id === opt.id;
                            const dotHex = HIGHLIGHT_HEX[opt.id];
                            return (
                              <Pressable
                                key={opt.id}
                                onPress={() => void handleSetHighlightColor(verseId, opt.id)}
                                hitSlop={6}
                                style={styles.highlightColorDotHit}
                              >
                                <View
                                  style={[
                                    styles.highlightColorDot,
                                    {
                                      backgroundColor: dotHex,
                                      borderWidth: active ? 2 : 0,
                                      borderColor: colors.text,
                                    },
                                  ]}
                                />
                              </Pressable>
                            );
                          })}
                        </View>
                        <View style={styles.highlightInlineActions}>
                          <Pressable
                            onPress={() => Share.share({ message: shareMsg })}
                            style={styles.cardIconBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            onPress={() => void handleDeleteHighlight(verseId)}
                            style={styles.cardIconBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={18} color="#E57373" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'favorites' && !hasNoResults && (
            <>
              {filteredFavorites.length === 0 ? (
                <View style={styles.favEmptyWrap}>
                  <Ionicons name="heart-outline" size={56} color={colors.border} />
                  <Text style={[styles.favEmptyTitle, { color: colors.text }]}>Henüz favori ayet yok</Text>
                  <Text style={[styles.favEmptyDesc, { color: colors.textSecondary }]}>
                    Okurken kalp ikonuna dokun
                  </Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  nestedScrollEnabled
                  data={filteredFavorites}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.favListContent}
                  renderItem={({ item: fav }) => (
                    <TouchableOpacity
                      style={[styles.favCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/read',
                          params: {
                            book: fav.book,
                            chapter: String(fav.chapter),
                            highlightVerse: String(fav.verse),
                          },
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.favRef}>{fav.ref}</Text>
                      <Text style={styles.favQuote}>"</Text>
                      <Text style={[styles.favText, { color: colors.text }]}>{fav.text}</Text>
                      <View style={[styles.favBottom, { borderTopColor: colors.border }]}>
                        <Text style={[styles.favDate, { color: colors.textMuted }]}>
                          {fav.addedAt
                            ? new Date(fav.addedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                              })
                            : ''}
                        </Text>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            void handleRemoveFavorite(fav.id);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="heart" size={16} color="#C4956A" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}

          {activeTab === 'prayers' && !hasNoResults && (
            <>
              {filteredPrayers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="hand-right-outline" size={56} color={colors.border} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Dualarını buraya yaz</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                    Tanrı'nın cevaplarını takip et
                  </Text>
                </View>
              ) : (
                <>
                  {prayers.length > 0 && (
                    <View style={styles.prayerStatsBanner}>
                      <Text style={[styles.prayerStatsText, { color: colors.textMuted }]}>
                        {prayers.length} dua · {prayersAnswered} cevaplandı
                      </Text>
                      <View style={[styles.prayerProgressBg, { backgroundColor: 'rgba(196,149,80,0.15)' }]}>
                        <View
                          style={[
                            styles.prayerProgressFill,
                            {
                              width: `${prayers.length ? (prayersAnswered / prayers.length) * 100 : 0}%`,
                              backgroundColor: 'rgba(76,175,80,0.6)',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                  {filteredPrayers.map((p) => (
                    <PrayerCard
                      key={p.id}
                      prayer={p}
                      theme={colors}
                      justAnsweredId={prayerJustAnsweredId}
                      onMarkAnswered={markPrayerAnswered}
                      onDelete={handleDeletePrayer}
                      onAnsweredAnimationDone={() => setPrayerJustAnsweredId(null)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={prayerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrayerModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPrayerModalVisible(false)}
        >
          <Pressable
            style={[styles.prayerFormContainer, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingPrayerId ? t('done') : t('addPrayer')}
            </Text>
            <TextInput
              style={[
                styles.prayerFormTitleInput,
                {
                  borderBottomColor: colors.border,
                  color: colors.text,
                  fontFamily: fonts.regular,
                },
              ]}
              placeholder={t('prayerTitle')}
              placeholderTextColor={colors.textMuted}
              value={prayerDraftTitle}
              onChangeText={setPrayerDraftTitle}
            />
            <TextInput
              style={[
                styles.prayerFormBodyInput,
                {
                  color: colors.text,
                  fontFamily: fonts.italic ?? fonts.regular,
                },
              ]}
              placeholder={t('prayerText')}
              placeholderTextColor={colors.textMuted}
              value={prayerDraftText}
              onChangeText={setPrayerDraftText}
              multiline
            />
            <View style={[styles.prayerFormToggleRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Cevaplanan Dua</Text>
              <Switch
                value={prayerDraftAnswered}
                onValueChange={setPrayerDraftAnswered}
                trackColor={{ false: colors.border, true: `${ACCENT}60` }}
                thumbColor={prayerDraftAnswered ? ACCENT : colors.textSecondary}
              />
            </View>
            <Pressable
              disabled={!prayerCanSave}
              onPress={savePrayer}
              style={[
                styles.modalSaveBtn,
                {
                  backgroundColor: ACCENT,
                  opacity: prayerCanSave ? 1 : 0.45,
                },
              ]}
            >
              <Text style={styles.modalSaveBtnText}>{t('save')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
        <View style={[styles.shareSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.shareHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.shareTitle, { color: colors.text }]}>Ayeti Paylaş</Text>
          <Text style={styles.shareRef}>{shareVerse.ref}</Text>
          <TouchableOpacity
            style={[styles.shareOption, { borderColor: colors.border }]}
            onPress={async () => {
              setShowShareOptions(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await Share.share({
                message:
                  `«${shareVerse.text}»\n— ${shareVerse.ref}\n\nSöz Uygulaması • sozapp.com`,
              });
            }}
          >
            <View style={styles.shareOptionIcon}>
              <Ionicons name="text-outline" size={20} color="#C4956A" />
            </View>
            <View style={styles.shareOptionText}>
              <Text style={[styles.shareOptionTitle, { color: colors.text }]}>Metin Olarak Paylaş</Text>
              <Text style={[styles.shareOptionDesc, { color: colors.textMuted }]}>
                WhatsApp, mesaj, e-posta...
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareOption, { borderColor: colors.border }]}
            onPress={() => {
              setShowShareOptions(false);
              setTimeout(() => setShowShareCard(true), 300);
            }}
          >
            <View style={styles.shareOptionIcon}>
              <Ionicons name="image-outline" size={20} color="#C4956A" />
            </View>
            <View style={styles.shareOptionText}>
              <Text style={[styles.shareOptionTitle, { color: colors.text }]}>Temalı Kart Olarak Paylaş</Text>
              <Text style={[styles.shareOptionDesc, { color: colors.textMuted }]}>
                Instagram, hikaye, görsel...
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareCancelBtn} onPress={() => setShowShareOptions(false)}>
            <Text style={[styles.shareCancelText, { color: colors.textMuted }]}>İptal</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ShareVerseModal
        visible={showShareCard}
        onClose={() => setShowShareCard(false)}
        verseText={shareVerse.text}
        verseRef={shareVerse.ref}
      />

      {/* Sıralama / Filtre Modalı */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalRoot}>
          <TouchableOpacity
            style={styles.filterOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          />
          <Animated.View style={[styles.filterSheet, filterSlideStyle, { backgroundColor: colors.background }]}>
            <View style={[styles.filterHandle, { backgroundColor: colors.border }]} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>SIRALAMA</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {([
              { id: 'newest', label: t('sortNewest'), icon: 'arrow-down-outline', desc: 'Son eklenen notlar üstte' },
              { id: 'oldest', label: t('sortOldest'), icon: 'arrow-up-outline', desc: 'İlk eklenen notlar üstte' },
              { id: 'book',   label: t('sortByBook'),  icon: 'book-outline',       desc: 'Matta, Markos, Luka...' },
              { id: 'length', label: t('sortByLength'), icon: 'reorder-four-outline', desc: 'En uzun not önce' },
            ] as { id: NoteSort; label: string; icon: string; desc: string }[]).map((option, index) => {
              const isActive = noteSort === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    isActive && styles.filterOptionActive,
                    index === 3 && styles.filterOptionLast,
                  ]}
                  onPress={() => {
                    setNoteSort(option.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTimeout(() => setShowFilterModal(false), 150);
                  }}
                >
                  <View style={[
                    styles.filterOptionIcon,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    isActive && styles.filterOptionIconActive,
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={isActive ? ACCENT : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.filterOptionLabel,
                      { color: colors.text },
                      isActive && styles.filterOptionLabelActive,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.filterOptionDesc}>{option.desc}</Text>
                  </View>
                  {isActive && (
                    <View style={styles.filterCheck}>
                      <Ionicons name="checkmark" size={14} color="#0A0A08" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 20 }} />
          </Animated.View>
        </View>
      </Modal>
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
}

function NoteCard({
  verseId,
  noteText,
  noteTag,
  theme,
  fonts,
  noteTimestamps,
  onDelete,
  onEditNote,
  renderRightActions,
}: {
  verseId: string;
  noteText: string;
  /** İleride not meta / etiket alanı doldurulunca chip gösterilir */
  noteTag?: string | null;
  theme: ThemeColors;
  fonts: { regular: string; italic: string };
  noteTimestamps: NoteTimestampsMap;
  onDelete: (id: string) => void;
  onEditNote: (verseId: string) => void;
  renderRightActions: (onDelete: () => void) => React.ReactNode;
}) {
  const refStr = getVerseRefFromVerseId(verseId);
  const verseText = getVerseTextByVerseId(verseId);
  const shareMsg = `«${verseText ?? ''}»\n\n— ${refStr}\n\nNot: ${noteText}\n\nSöz Uygulaması`;
  const refFont = fonts.italic ?? fonts.regular;
  const bodyFont = fonts.italic ?? fonts.regular;
  const tag = noteTag?.trim();

  return (
    <Swipeable
      renderRightActions={() => renderRightActions(() => onDelete(verseId))}
      containerStyle={styles.swipeableContainer}
    >
      <View
        style={[
          styles.noteCard,
          {
            backgroundColor: theme.card,
            borderLeftColor: ACCENT,
          },
        ]}
      >
        <View style={styles.noteCardTopRow}>
          <Text style={[styles.noteCardRef, { color: ACCENT, fontFamily: refFont }]} numberOfLines={1}>
            {refStr}
          </Text>
          <Text style={[styles.noteCardDate, { color: theme.textSecondary }]}>
            {formatDate(noteTimestamps[verseId])}
          </Text>
        </View>
        <Text
          style={[styles.noteCardBody, { color: theme.text, fontFamily: bodyFont }]}
          numberOfLines={4}
        >
          {noteText}
        </Text>
        {tag ? (
          <View style={[styles.noteTagChip, { backgroundColor: `${ACCENT}20` }]}>
            <Text style={[styles.noteTagChipText, { color: ACCENT }]}>{tag}</Text>
          </View>
        ) : null}
        <View style={[styles.noteCardActionsRow, { borderTopColor: theme.border }]}>
          <Pressable
            onPress={() => Share.share({ message: shareMsg })}
            style={styles.noteCardActionHit}
            hitSlop={8}
          >
            <Ionicons name="share-outline" size={18} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => onEditNote(verseId)} style={styles.noteCardActionHit} hitSlop={8}>
            <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => onDelete(verseId)} style={styles.noteCardActionHit} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#E57373" />
          </Pressable>
        </View>
      </View>
    </Swipeable>
  );
}

function PrayerCard({
  prayer,
  theme,
  justAnsweredId,
  onMarkAnswered,
  onDelete,
  onAnsweredAnimationDone,
}: {
  prayer: PrayerEntry;
  theme: ThemeColors;
  justAnsweredId: string | null;
  onMarkAnswered: (id: string) => void;
  onDelete: (id: string) => void;
  onAnsweredAnimationDone: () => void;
}) {
  useEffect(() => {
    if (prayer.answered && justAnsweredId === prayer.id) {
      const t = setTimeout(() => onAnsweredAnimationDone(), 1200);
      return () => clearTimeout(t);
    }
  }, [prayer.answered, justAnsweredId, prayer.id, onAnsweredAnimationDone]);

  const showConfetti = prayer.answered && justAnsweredId === prayer.id;
  const leftAccent = prayer.answered ? '#4CAF50' : ACCENT;

  return (
    <View style={styles.prayerCardWrapper}>
      {showConfetti && (
        <View style={styles.confettiWrap} pointerEvents="none">
          {[0, 1, 2, 3].map((i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </View>
      )}
      <View
        style={[
          styles.prayerCard,
          {
            backgroundColor: theme.card,
            borderLeftColor: leftAccent,
          },
        ]}
      >
        <View style={styles.prayerCardTop}>
          <View style={styles.prayerCardTitleCol}>
            {prayer.title?.trim() ? (
              <Text style={[styles.prayerCardTitle, { color: theme.text }]} numberOfLines={2}>
                {prayer.title}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.prayerCardDate, { color: theme.textSecondary }]}>
            {formatDate(prayer.createdAt)}
          </Text>
        </View>
        <Text style={[styles.prayerCardText, { color: theme.text }]} numberOfLines={3}>
          {prayer.text}
        </Text>
        <View style={styles.prayerCardBottom}>
          {prayer.answered ? (
            <View style={styles.prayerStatusRow}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={[styles.prayerStatusText, { color: theme.textSecondary }]}>Cevaplandı</Text>
            </View>
          ) : (
            <Pressable style={styles.prayerStatusRow} onPress={() => onMarkAnswered(prayer.id)}>
              <Ionicons name="ellipse-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.prayerStatusText, { color: theme.textMuted }]}>Devam ediyor</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onDelete(prayer.id)} style={styles.cardIconBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ConfettiParticle({ index }: { index: number }) {
  const angle = 45 + index * 90;
  const rad = (angle * Math.PI) / 180;
  const dist = 32;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    translateX.value = withTiming(Math.cos(rad) * dist, { duration: 500 });
    translateY.value = withTiming(Math.sin(rad) * dist, { duration: 500 });
    opacity.value = withTiming(0, { duration: 500 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        { left: '50%', top: 20, marginLeft: -4 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex1: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 28,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { padding: 6 },
  searchBarWrap: { overflow: 'hidden' },
  searchBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,149,80,0.12)',
  },
  searchInput: {
    flex: 1,
    fontFamily: sheetFonts.regular,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchCloseBtn: { padding: 8 },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(196,149,80,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsBannerText: {
    fontFamily: sheetFonts.italic,
    fontSize: 13,
    color: 'rgba(196,149,80,0.8)',
  },
  statsBannerTotal: { fontSize: 12, color: ACCENT },
  limitWarning: {
    fontFamily: sheetFonts.regular,
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 13,
    fontFamily: sheetFonts.regular,
    textAlign: 'center',
  },
  tabTextActive: {
    color: ACCENT,
    fontFamily: sheetFonts.medium,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 1,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sortBtn: { padding: 6 },
  filterScroll: { maxHeight: 72 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  highlightFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  highlightFilterSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  highlightFilterChipLabel: {
    fontFamily: sheetFonts.regular,
    fontSize: 13,
    maxWidth: 92,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12, paddingBottom: 40 },
  scrollContentEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(196,149,80,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: sheetFonts.regular,
    color: palette.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    fontStyle: 'italic',
    color: palette.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: ACCENT,
  },
  emptyButtonText: { fontSize: 14, color: ACCENT, fontFamily: sheetFonts.regular },
  groupHeader: {
    fontSize: 11,
    letterSpacing: 2,
    color: ACCENT,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,149,80,0.1)',
  },
  swipeableContainer: { marginHorizontal: 16 },
  swipeDeleteAction: {
    width: 80,
    backgroundColor: '#E5737320',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  swipeDeleteText: { color: '#E57373', fontSize: 11, marginTop: 4, fontFamily: sheetFonts.medium },
  noteCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  noteCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  noteCardRef: { fontSize: 12, flex: 1 },
  noteCardDate: { fontSize: 11 },
  noteCardBody: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  noteTagChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  noteTagChipText: { fontSize: 11, fontFamily: sheetFonts.medium },
  noteCardActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  noteCardActionHit: { paddingVertical: 4 },
  cardIconBtn: { padding: 6 },
  highlightCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  highlightVerseText: { fontFamily: sheetFonts.italic, fontSize: 15, lineHeight: 22 },
  highlightMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  highlightRefInline: { fontSize: 12, fontFamily: sheetFonts.italic, flex: 1 },
  highlightDateInline: { fontSize: 11 },
  highlightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  highlightColorPicker: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  highlightColorDotHit: { padding: 2 },
  highlightColorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  highlightInlineActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  favEmptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  favEmptyTitle: {
    fontSize: 18,
    fontFamily: sheetFonts.regular,
    textAlign: 'center',
  },
  favEmptyDesc: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: sheetFonts.italic,
    textAlign: 'center',
    lineHeight: 22,
  },
  favListContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  favCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    gap: 4,
  },
  favRef: {
    fontSize: 11,
    color: '#C4956A',
    letterSpacing: 0.1,
    fontFamily: sheetFonts.regular,
    textTransform: 'uppercase',
  },
  favQuote: {
    fontSize: 32,
    color: 'rgba(196,149,80,0.15)',
    lineHeight: 24,
    fontFamily: sheetFonts.regular,
  },
  favText: {
    fontSize: 15,
    fontStyle: 'italic',
    fontFamily: sheetFonts.italic,
    lineHeight: 24,
  },
  favBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  favDate: {
    fontSize: 11,
    fontFamily: sheetFonts.regular,
  },
  favActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  favActionText: {
    fontSize: 12,
    color: '#C4956A',
    fontFamily: sheetFonts.regular,
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
    fontFamily: sheetFonts.regular,
    marginBottom: 4,
  },
  shareRef: {
    fontSize: 12,
    color: '#C4956A',
    fontFamily: sheetFonts.regular,
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
    fontFamily: sheetFonts.regular,
  },
  shareOptionDesc: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: sheetFonts.italic,
    marginTop: 2,
  },
  shareCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  shareCancelText: {
    fontSize: 15,
    fontFamily: sheetFonts.regular,
  },
  prayerStatsBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
  },
  prayerStatsText: { fontFamily: sheetFonts.regular, fontSize: 13, marginBottom: 6 },
  prayerProgressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  prayerProgressFill: { height: 4, borderRadius: 2 },
  prayerCardWrapper: { position: 'relative', marginHorizontal: 16, marginBottom: 10 },
  prayerCard: {
    borderLeftWidth: 3,
    borderRadius: 16,
    padding: 16,
  },
  confettiWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  prayerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  prayerCardTitleCol: { flex: 1, minWidth: 0 },
  prayerCardTitle: { fontFamily: sheetFonts.medium, fontSize: 15 },
  prayerCardDate: { fontSize: 11, flexShrink: 0 },
  prayerCardText: {
    fontFamily: sheetFonts.italic,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  prayerCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prayerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prayerStatusText: { fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  prayerFormContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
  },
  modalTitle: { fontFamily: sheetFonts.medium, fontSize: 18, marginBottom: 16 },
  prayerFormTitleInput: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  prayerFormBodyInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 0,
  },
  prayerFormToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  modalLabel: { fontFamily: sheetFonts.regular, fontSize: 15 },
  modalSaveBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalSaveBtnText: { color: '#fff', fontFamily: sheetFonts.medium, fontSize: 15 },

  // Filtre Modalı
  filterModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  filterHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  filterTitle: {
    fontSize: 11,
    letterSpacing: 0.2,
    color: ACCENT,
    fontFamily: sheetFonts.medium,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 0.5,
  },
  filterOptionActive: {
    borderColor: 'rgba(196,149,80,0.5)',
    backgroundColor: 'rgba(196,149,80,0.06)',
  },
  filterOptionLast: {
    marginBottom: 0,
  },
  filterOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionIconActive: {
    backgroundColor: 'rgba(196,149,80,0.1)',
    borderColor: 'rgba(196,149,80,0.3)',
  },
  filterOptionLabel: {
    fontSize: 15,
    fontFamily: sheetFonts.regular,
    marginBottom: 2,
  },
  filterOptionLabelActive: {
    fontFamily: sheetFonts.medium,
  },
  filterOptionDesc: {
    fontSize: 12,
    color: 'rgba(196,149,80,0.6)',
    fontStyle: 'italic',
    fontFamily: sheetFonts.italic,
  },
  filterCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

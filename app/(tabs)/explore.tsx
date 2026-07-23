import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Linking,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native'
import {
  WATCH_CONTENT,
  watchTypeLabelTr,
  type WatchItem,
} from '@/constants/watchContent'
import { getWatchFavoriteIds, toggleWatchFavoriteId } from '@/constants/watch-favorites'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, usePathname, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { fonts as appFonts } from '@/constants/theme';
import { readGameCompletedToday, readGameStreak } from '@/constants/game-storage'
import { pickRandomVerseForShare } from '@/constants/bibleVersions'
import { getBookIdByVerseBookName, searchVerseText } from '@/constants/verse-search'
import ShareVerseModal from '@/components/ShareVerseModal'
import { SozAlert } from '@/components/SozAlert'
import { useSozAlert } from '@/hooks/useSozAlert'
import { useDenomination } from '@/hooks/useDenomination'
import { useTheme, type ThemeColors } from '../../hooks/useTheme'

const ACCENT = '#C4956A';
const ACCENT_LIGHT = '#FFF8EE';
const SCREEN_WIDTH = Dimensions.get('window').width;

// Ayet metni araması Yeni Ahit'in tamamını taradığı için debounce + minimum karakter
// eşiği ile her tuş vuruşunda tetiklenmesi engelleniyor.
const VERSE_SEARCH_DEBOUNCE_MS = 300;
const VERSE_SEARCH_MIN_CHARS = 3;
const VERSE_SEARCH_MAX_RESULTS = 8;

const ALL_ITEMS = [
  { title: 'Harita', route: '/map', icon: 'map-outline' },
  { title: 'Okuma Planları', route: '/plans', icon: 'calendar-outline' },
  { title: 'Kilise Grubu', route: '/church', icon: 'people-outline' },
  { title: 'Odak Modu', route: '/focus', icon: 'moon-outline' },
  { title: "Söz'e Sor", route: '/ask', icon: 'chatbubble-outline' },
  { title: 'İstatistikler', route: '/stats', icon: 'bar-chart-outline' },
  { title: 'Videolar', route: '/videos', icon: 'play-circle-outline' },
  { title: 'Çok Dilli', route: '/(tabs)/read', icon: 'language-outline' },
  { title: 'Kim Söyledi?', route: '/games/who-said', icon: 'help-circle-outline' },
  { title: 'Doğru mu Yanlış mı?', route: '/games/true-false', icon: 'shuffle-outline' },
  { title: 'Eksik Kelime', route: '/games/missing-word', icon: 'pencil-outline' },
] as const;

const GAMES = [
  {
    id: 'who-said',
    route: '/games/who-said',
    title: 'Kim Söyledi?',
    desc: 'Ayeti söyleyen kişiyi bul',
    cardIcon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap,
    badgeKind: 'daily' as const,
  },
  {
    id: 'true-false',
    route: '/games/true-false',
    title: 'Doğru mu Yanlış mı?',
    desc: 'Sağa veya sola kaydır',
    cardIcon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
    badgeKind: 'daily' as const,
  },
  {
    id: 'missing-word',
    route: '/games/missing-word',
    title: 'Eksik Kelime',
    desc: 'Ayeti tamamla',
    cardIcon: 'text-outline' as keyof typeof Ionicons.glyphMap,
    badgeKind: 'new' as const,
  },
] as const;

const TOOLS_GRID = [
  { key: 'plans', icon: 'calendar-outline', title: 'Okuma Planları', desc: '30 günde NT', route: '/plans' },
  { key: 'ask', icon: 'chatbubble-ellipses-outline', title: "Söz'e Sor", desc: 'AI İncil rehberi', route: '/ask' },
  { key: 'memorize', icon: 'school-outline', title: 'Ezberleme', desc: 'Ayet ezberle', route: '/memorize' },
  { key: 'church', icon: 'people-outline', title: 'Kilise Grubu', desc: 'Birlikte oku', route: '/church' },
  { key: 'multilang', icon: 'language-outline', title: 'Çok Dilli', desc: '7 dil desteği', route: '/(tabs)/read' },
  { key: 'stats', icon: 'bar-chart-outline', title: 'İstatistikler', desc: 'İlerlemeni gör', route: '/stats' },
  { key: 'videos', icon: 'play-circle-outline', title: 'Videolar', desc: 'Bible Project özetleri', route: '/videos' },
] as const;

const toolColors = {
  plans: '#C4956A',
  ask: '#7C9A8A',
  memorize: '#9A7C8A',
  church: '#8A8A9A',
  multilang: '#7C8A9A',
  stats: '#8A9A7C',
  videos: '#B88A6A',
} as const;

const QUICK_ACCESS = [
  { icon: 'moon-outline', label: 'Odak', route: '/focus', color: '#6BA3BE' },
  { icon: 'map-outline', label: 'Harita', route: '/map', color: '#7CB87C' },
  { icon: 'chatbubble-ellipses-outline', label: "Söz'e Sor", route: '/ask', color: ACCENT },
  { icon: 'bar-chart-outline', label: 'İstatistik', route: '/stats', color: '#9B8BB8' },
] as const;

const HOLIDAYS = [
  { name: 'Paskalya', date: new Date(2026, 3, 5) },
  { name: 'Noel', date: new Date(2026, 11, 25) },
  { name: 'Epifani', date: new Date(2026, 0, 6) },
] as const;

function itemMatches(q: string, ...parts: (string | number | undefined | null)[]): boolean {
  if (!q) return true;
  const blob = parts
    .filter((p) => p != null && String(p).length > 0)
    .map((p) => String(p).toLocaleLowerCase('tr-TR'))
    .join(' ');
  return blob.includes(q);
}

function quickRouteActive(pathname: string, route: string): boolean {
  const key = route.replace(/^\//, '');
  if (!key) return false;
  return pathname.toLowerCase().includes(key);
}

function watchCardBadgeLabel(item: WatchItem): 'ÖNERİ' | 'YENİ' | 'KISA' | null {
  if (item.mustWatch) return 'ÖNERİ';
  if (item.type === 'kısa') return 'KISA';
  return 'YENİ';
}

function WatchCardPoster({
  posterUrl,
  posterColor,
  posterIcon,
}: {
  posterUrl?: string;
  posterColor: string;
  posterIcon: 'film-outline' | 'tv-outline' | 'easel-outline';
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(posterUrl) && !failed;
  return (
    <View style={watchCardPosterStyles.fill}>
      {showImg ? (
        <Image
          source={{ uri: posterUrl! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <LinearGradient
          colors={[posterColor, `${posterColor}99`]}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={watchCardPosterStyles.iconWrap}>
            <Ionicons name={posterIcon} size={36} color={`${ACCENT}60`} />
          </View>
        </LinearGradient>
      )}
    </View>
  );
}

const watchCardPosterStyles = StyleSheet.create({
  fill: { flex: 1, width: '100%', overflow: 'hidden' },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { refreshDenomination } = useDenomination();
  const styles = useMemo(() => makeStyles(colors, fonts), [colors]);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [watchFilter, setWatchFilter] = useState<'all' | WatchItem['type']>('all');
  const [selectedWatch, setSelectedWatch] = useState<WatchItem | null>(null);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [watchFavoriteIds, setWatchFavoriteIds] = useState<string[]>([]);
  const [shareRandomVisible, setShareRandomVisible] = useState(false);
  const { alertConfig, hideAlert } = useSozAlert();
  const [shareRandomText, setShareRandomText] = useState('');
  const [shareRandomRef, setShareRandomRef] = useState('');
  const [gameStreaks, setGameStreaks] = useState<Record<string, number>>({
    'who-said': 0,
    'true-false': 0,
    'missing-word': 0,
  });
  const [gameCompletedToday, setGameCompletedToday] = useState<Record<string, boolean>>({
    'who-said': false,
    'true-false': false,
    'missing-word': false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const gamesScrollRef = useRef<ScrollView | null>(null);

  const fetchExploreSnapshot = useCallback(async () => {
    await refreshDenomination();
    const streaks: Record<string, number> = {};
    const done: Record<string, boolean> = {};
    for (const g of GAMES) {
      streaks[g.id] = await readGameStreak(g.id);
      done[g.id] = await readGameCompletedToday(g.id);
    }
    const ids = await getWatchFavoriteIds();
    return { streaks, done, ids };
  }, [refreshDenomination]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      void fetchExploreSnapshot()
        .then((snap) => {
          if (!mounted) return;
          setGameStreaks(snap.streaks);
          setGameCompletedToday(snap.done);
          setWatchFavoriteIds(snap.ids);
        })
        .catch((e) => {
          console.warn('Explore load:', e);
          if (!mounted) return;
          setGameStreaks({ 'who-said': 0, 'true-false': 0, 'missing-word': 0 });
          setGameCompletedToday({ 'who-said': false, 'true-false': false, 'missing-word': false });
          setWatchFavoriteIds([]);
        });
      return () => {
        mounted = false;
      };
    }, [fetchExploreSnapshot])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await fetchExploreSnapshot();
      setGameStreaks(snap.streaks);
      setGameCompletedToday(snap.done);
      setWatchFavoriteIds(snap.ids);
    } catch (e) {
      console.warn('Explore refresh:', e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchExploreSnapshot]);

  useEffect(() => {
    let cancelled = false;
    const runSwipeHint = async () => {
      try {
        const seen = await AsyncStorage.getItem('@soz/swipeHintSeen');
        if (seen === 'true' || cancelled) return;
        setTimeout(() => {
          if (cancelled) return;
          gamesScrollRef.current?.scrollTo({ x: 60, animated: true });
        }, 500);
        setTimeout(() => {
          if (cancelled) return;
          gamesScrollRef.current?.scrollTo({ x: 0, animated: true });
        }, 1300);
        await AsyncStorage.setItem('@soz/swipeHintSeen', 'true');
      } catch {
        /* ignore */
      }
    };
    void runSwipeHint();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = searchText.trim().toLocaleLowerCase('tr-TR');
  const isSearching = q.length > 0;

  // Ayet metni araması — search.tsx ile aynı algoritma (constants/verse-search.ts),
  // debounce ile Yeni Ahit'in tamamının her tuş vuruşunda taranması önleniyor.
  const [debouncedVerseQuery, setDebouncedVerseQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVerseQuery(searchText);
    }, VERSE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const showVerseResults = debouncedVerseQuery.trim().length >= VERSE_SEARCH_MIN_CHARS;

  const verseResults = useMemo(() => {
    if (!showVerseResults) return [];
    return searchVerseText(debouncedVerseQuery, VERSE_SEARCH_MAX_RESULTS);
  }, [showVerseResults, debouncedVerseQuery]);

  const onVerseResultPress = useCallback(
    (item: { book: string; chapter: number; verse: number }) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const bookId = getBookIdByVerseBookName(item.book);
      if (!bookId) return;
      router.push({
        pathname: '/(tabs)/read',
        params: {
          bookId,
          chapter: String(item.chapter),
          highlightVerse: String(item.verse),
        },
      });
      setSearchText('');
    },
    [router]
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [] as Array<
      | {
          type: 'game';
          title: string;
          route: string;
          icon: keyof typeof Ionicons.glyphMap;
        }
      | {
          type: 'tool';
          title: string;
          route: string;
          icon: keyof typeof Ionicons.glyphMap;
        }
      | {
          type: 'watch';
          title: string;
          icon: keyof typeof Ionicons.glyphMap;
          item: WatchItem;
        }
    >;
    const needle = searchText.toLowerCase();
    return [
      ...GAMES.filter((g) => g.title.toLowerCase().includes(needle)).map((g) => ({
        type: 'game' as const,
        title: g.title,
        route: g.route,
        icon: g.cardIcon,
      })),
      ...TOOLS_GRID.filter((t) => t.title.toLowerCase().includes(needle)).map((t) => ({
        type: 'tool' as const,
        title: t.title,
        route: t.route,
        icon: t.icon as keyof typeof Ionicons.glyphMap,
      })),
      ...WATCH_CONTENT.filter((w) => w.title.toLowerCase().includes(needle)).map((w) => ({
        type: 'watch' as const,
        title: w.title,
        icon: 'play-circle-outline' as const,
        item: w,
      })),
    ];
  }, [isSearching, searchText]);

  const quickFiltered = useMemo(() => {
    if (!isSearching) return [...QUICK_ACCESS];
    return QUICK_ACCESS.filter((e) => itemMatches(q, e.label));
  }, [isSearching, q]);

  const gameItems = useMemo(() => {
    if (!isSearching) return [...GAMES];
    const filtered = GAMES.filter((g) =>
      itemMatches(q, g.title, g.desc, g.badgeKind === 'daily' ? 'GÜNLÜK' : 'YENİ')
    );
    if (filtered.length > 0) return filtered;
    if (itemMatches(q, 'Günlük Oyunlar', 'Her gün yeni sorular')) return [...GAMES];
    return [];
  }, [isSearching, q]);

  const filteredWatchContent = useMemo(() => {
    if (watchFilter === 'all') return WATCH_CONTENT
    return WATCH_CONTENT.filter((item) => item.type === watchFilter)
  }, [watchFilter])

  const watchItemsForList = useMemo(() => {
    if (!isSearching) return filteredWatchContent;
    const filtered = WATCH_CONTENT.filter((w) =>
      itemMatches(
        q,
        w.title,
        w.description,
        w.type,
        w.originalTitle,
        w.tags.join(' '),
        String(w.year),
        w.duration,
        w.ageRating
      )
    );
    if (filtered.length > 0) return filtered;
    if (
      itemMatches(
        q,
        'İzle & Keşfet',
        'Film dizi animasyon belgesel kısa video',
        'Tümü',
        'Dizi',
        'Film',
        'Animasyon',
        'Kısa Video',
        'Belgesel'
      )
    ) {
      return filteredWatchContent;
    }
    return [];
  }, [isSearching, q, filteredWatchContent]);

  const toolsFiltered = useMemo(() => {
    if (!isSearching) return [...TOOLS_GRID];
    const filtered = TOOLS_GRID.filter((t) => itemMatches(q, t.title, t.desc));
    if (filtered.length > 0) return filtered;
    if (itemMatches(q, 'Araçlar', 'Büyümek için')) return [...TOOLS_GRID];
    return [];
  }, [isSearching, q]);

  const showFeaturedMap = useMemo(() => {
    if (!isSearching) return true;
    if (
      itemMatches(
        q,
        'ANADOLU HARİTASI',
        'İncil Türkiyede Yaşandı',
        '12 kutsal yer',
        'harita',
        'anadolu',
        'keşfet',
        'i̇ncil',
        'türkiye',
        "türkiye'de",
        'yaşandı'
      )
    )
      return true;
    return false;
  }, [isSearching, q]);

  const showFeaturedCal = useMemo(() => {
    if (!isSearching) return true;
    return itemMatches(q, 'Yaklaşan', 'Kutsal Günler', 'kutsal gün', 'takvim', 'calendar');
  }, [isSearching, q]);

  const showFeaturedRand = useMemo(() => {
    if (!isSearching) return true;
    return itemMatches(q, 'Bugün', 'Rastgele Ayet', 'rastgele', 'ayet');
  }, [isSearching, q]);

  const learnHeaderMatch = useMemo(() => {
    if (!isSearching) return false;
    return itemMatches(q, 'Öğren & Keşfet', 'Öğren ve Keşfet', 'Anadolu tarih kültür');
  }, [isSearching, q]);

  const forceShowAllFeatured = useMemo(
    () =>
      isSearching &&
      learnHeaderMatch &&
      !showFeaturedMap &&
      !showFeaturedCal &&
      !showFeaturedRand,
    [isSearching, learnHeaderMatch, showFeaturedMap, showFeaturedCal, showFeaturedRand]
  );

  const mapVisible = !isSearching || showFeaturedMap || forceShowAllFeatured;
  const calVisible = !isSearching || showFeaturedCal || forceShowAllFeatured;
  const randVisible = !isSearching || showFeaturedRand || forceShowAllFeatured;
  const hasLearnHit = mapVisible || calVisible || randVisible;

  const searchHasNoResults = useMemo(() => {
    if (!isSearching) return false;
    if (searchResults.length > 0) return false;
    // Ayet araması henüz debounce bekliyorsa (kısa query) erken "sonuç yok" gösterme.
    if (showVerseResults && verseResults.length > 0) return false;
    return true;
  }, [isSearching, searchResults.length, showVerseResults, verseResults.length]);

  const mustWatchItems = useMemo(
    () => WATCH_CONTENT.filter((item) => item.mustWatch),
    []
  );

  const nextHolyDaySubtitle = useMemo(() => {
    const now = new Date();
    const nextHoliday = [...HOLIDAYS]
      .filter((h) => h.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    if (!nextHoliday) return 'Kilise takvimine göz at';
    const dayMs = 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(0, Math.ceil((nextHoliday.date.getTime() - now.getTime()) / dayMs));
    return `${nextHoliday.name} · ${daysLeft} gün kaldı`;
  }, []);

  const exploreScrollPadding = useMemo(
    () => ({
      paddingTop: insets.top + 16,
      paddingBottom: 120,
    }),
    [insets.top]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={[styles.exploreScrollContent, exploreScrollPadding]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        <View style={styles.exploreSection}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Keşfet</Text>
            <Text style={styles.headerSubtitle}>Ne öğrenmek istiyorsun?</Text>
          </View>

          <View style={styles.searchWrap}>
            <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Özellik ve içerik ara..."
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {isSearching && searchHasNoResults && (
          <View style={styles.exploreSection}>
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={48} color={colors.border} />
              <Text style={styles.searchEmptyText}>"{searchText}" için sonuç bulunamadı</Text>
              <Text style={styles.searchEmptySubText}>Farklı bir kelime dene</Text>
            </View>
          </View>
        )}

        {isSearching && searchResults.length > 0 && (
          <View style={styles.exploreSection}>
            <View style={styles.searchResults}>
            {searchResults.map((item, i) => (
              <TouchableOpacity
                key={`${item.type}-${item.title}-${i}`}
                style={styles.searchResultItem}
                onPress={() => {
                  if (item.type === 'watch') {
                    setSelectedWatch(item.item);
                    setShowWatchModal(true);
                  } else {
                    router.push(item.route as never);
                  }
                  setSearchText('');
                }}
              >
                <View style={styles.searchResultIcon}>
                  <Ionicons name={item.icon} size={16} color={ACCENT} />
                </View>
                <Text style={styles.searchResultText}>{item.title}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            </View>
          </View>
        )}

        {isSearching && showVerseResults && verseResults.length > 0 && (
          <View style={styles.exploreSection}>
            <SectionHeader
              title="Ayetlerde Bulunanlar"
              subtitle={`Yeni Ahit'te "${searchText.trim()}" için eşleşen ayetler`}
              styles={styles}
            />
            <View style={styles.verseSearchResults}>
              {verseResults.map((item, i) => (
                <TouchableOpacity
                  key={`verse-${item.book}-${item.chapter}-${item.verse}-${i}`}
                  style={styles.verseSearchItem}
                  onPress={() => onVerseResultPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.verseSearchBar} />
                  <View style={styles.verseSearchContent}>
                    <Text style={styles.verseSearchRef}>
                      {item.book} {item.chapter}:{item.verse}
                    </Text>
                    <Text style={styles.verseSearchText} numberOfLines={2}>
                      {item.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!isSearching && quickFiltered.length > 0 && (
          <View style={styles.exploreSection}>
            <View style={styles.quickAccess}>
            {quickFiltered.map((item) => {
              const active = quickRouteActive(pathname, item.route);
              return (
                <TouchableOpacity
                  key={item.route}
                  style={styles.quickItem}
                  onPress={() => {
                    router.push(item.route as never);
                    void Haptics.selectionAsync();
                  }}
                >
                  <View style={[styles.quickIcon, active && styles.quickIconActive]}>
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={item.color} />
                  </View>
                  <Text style={styles.quickLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            </View>
          </View>
        )}

        {!isSearching && gameItems.length > 0 && (
          <View style={styles.exploreSection}>
            <SectionHeader
              title="Günlük Oyunlar"
              subtitle="Her gün yeni sorular"
              styles={styles}
            />
            <ScrollView
              ref={gamesScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gamesScrollContent}
              decelerationRate="fast"
            >
              {gameItems.map((game) => {
                const completed = gameCompletedToday[game.id] === true;
                const streak = gameStreaks[game.id] ?? 0;
                const daily = game.badgeKind === 'daily';
                return (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.gameCard}
                    onPress={() => {
                      router.push(game.route as never);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.88}
                  >
                    {completed ? (
                      <View style={styles.gameCardOverlay} pointerEvents="none">
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={styles.gameCardOverlayText}>Tamamlandı</Text>
                      </View>
                    ) : null}

                    <View style={styles.gameCardInner}>
                      <View
                        style={[
                          styles.gameTopBadge,
                          daily ? styles.gameTopBadgeDaily : styles.gameTopBadgeNew,
                        ]}
                      >
                        <Text
                          style={[
                            styles.gameTopBadgeText,
                            daily ? styles.gameTopBadgeTextDaily : styles.gameTopBadgeTextNew,
                          ]}
                        >
                          {daily ? 'GÜNLÜK' : 'YENİ'}
                        </Text>
                      </View>

                      <View style={styles.gameCardIconWrap}>
                        <Ionicons name={game.cardIcon} size={44} color={ACCENT} />
                      </View>

                      <View style={styles.gameCardFooter}>
                        <Text style={styles.gameCardTitle} numberOfLines={2}>
                          {game.title}
                        </Text>
                        <Text style={styles.gameCardDesc} numberOfLines={2}>
                          {game.desc}
                        </Text>
                        <View style={styles.gameStreakRow}>
                          <Ionicons name="flame-outline" size={14} color={ACCENT} />
                          <Text style={styles.gameStreakRowText}>{streak}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!isSearching && watchItemsForList.length > 0 && (
          <View style={styles.exploreSection}>
            <SectionHeader
              title="İzle & Keşfet"
              subtitle="Film, dizi, animasyon"
              styles={styles}
            />

            {!isSearching && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.watchFilters}
                >
                  {([
                    { key: 'all', label: 'Tümü' },
                    { key: 'dizi', label: 'Dizi' },
                    { key: 'film', label: 'Film' },
                    { key: 'animasyon', label: 'Animasyon' },
                    { key: 'kısa', label: 'Kısa' },
                    { key: 'belgesel', label: 'Belgesel' },
                  ] as const).map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.watchFilterBtn, watchFilter === f.key && styles.watchFilterBtnActive]}
                      onPress={() => {
                        setWatchFilter(f.key);
                        void Haptics.selectionAsync();
                      }}
                    >
                      <Text
                        style={[styles.watchFilterText, watchFilter === f.key && styles.watchFilterTextActive]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.watchMustBadge}>
                  <Text style={styles.watchMustText}>🔥 {mustWatchItems.length} öneri</Text>
                </View>
              </>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.watchCardsScroll}
              decelerationRate="fast"
            >
              {watchItemsForList.map((item) => {
                const badge = watchCardBadgeLabel(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.watchCard}
                    onPress={() => {
                      setSelectedWatch(item);
                      setShowWatchModal(true);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.88}
                  >
                    <View style={styles.watchCardPoster}>
                      <WatchCardPoster
                        posterUrl={item.posterUrl}
                        posterColor={item.posterColor}
                        posterIcon={item.posterIcon}
                      />
                    </View>
                    <View style={styles.watchCardBottom}>
                      <Text style={styles.watchCardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {badge ? (
                        <View style={styles.watchCardBadge}>
                          <Text style={styles.watchCardBadgeText}>{badge}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!isSearching && hasLearnHit && (
          <View style={styles.exploreSection}>
            <SectionHeader
              title="Öğren & Keşfet"
              subtitle="Anadolu, tarih, kültür"
              styles={styles}
              subtitleNoGap
            />

            {mapVisible && (
              <TouchableOpacity
                style={styles.featuredCard}
                onPress={() => router.push('/map' as never)}
                activeOpacity={0.9}
              >
                <View style={styles.featuredBg}>
                  <Text style={styles.featuredEmoji}>🗺️</Text>
                </View>
                <View style={styles.featuredContent}>
                  <Text style={styles.featuredLabel}>ANADOLU HARİTASI</Text>
                  <Text style={styles.featuredTitle}>İncil Türkiye'de{'\n'}Yaşandı</Text>
                  <Text style={styles.featuredDesc}>12 kutsal yer, her birinin hikayesi</Text>
                  <View style={styles.featuredBtn}>
                    <Text style={styles.featuredBtnText}>Keşfet</Text>
                    <Ionicons name="arrow-forward" size={12} color={ACCENT} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {(calVisible || randVisible) && (
              <View style={styles.learnTwinRow}>
                {calVisible ? (
                  <TouchableOpacity
                    style={[styles.learnTwinCard, styles.learnTwinCardCal]}
                    onPress={() => router.push('/(tabs)/calendar' as never)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.learnTwinInner}>
                      <Ionicons name="calendar-outline" size={28} color={ACCENT} />
                      <View style={styles.learnTwinTextCol}>
                        <Text style={styles.learnTwinTitle}>Kutsal Günler</Text>
                        <Text style={styles.learnTwinSubtitle} numberOfLines={2}>
                          {nextHolyDaySubtitle}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {randVisible ? (
                  <TouchableOpacity
                    style={[styles.learnTwinCard, styles.learnTwinCardRand]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const r = pickRandomVerseForShare();
                      if (r) {
                        setShareRandomText(r.verseText);
                        setShareRandomRef(r.verseRef);
                        setShareRandomVisible(true);
                      }
                    }}
                    activeOpacity={0.88}
                  >
                    <View style={styles.learnTwinInner}>
                      <Ionicons name="shuffle-outline" size={28} color="#7C9A8A" />
                      <View style={styles.learnTwinTextCol}>
                        <Text style={styles.learnTwinTitle}>Rastgele Ayet</Text>
                        <Text style={styles.learnTwinSubtitle} numberOfLines={2}>
                          Her dokunuşta yeni bir ayet
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        )}

        {!isSearching && toolsFiltered.length > 0 && (
          <View style={styles.exploreSection}>
            <SectionHeader title="Araçlar" subtitle="Büyümek için" styles={styles} />
            <View style={styles.toolsGrid}>
              {toolsFiltered.map((tool, i) => (
                <TouchableOpacity
                  key={`${tool.title}-${i}`}
                  style={[
                    styles.toolCard,
                    {
                      borderTopWidth: 3,
                      borderTopColor: toolColors[tool.key],
                    },
                  ]}
                  onPress={() => {
                    router.push(tool.route as never);
                    void Haptics.selectionAsync();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.toolIcon, { borderColor: `${toolColors[tool.key]}35` }]}>
                    <Ionicons
                      name={tool.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={toolColors[tool.key]}
                    />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolDesc}>{tool.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {showWatchModal && selectedWatch && (
        <Modal visible={showWatchModal} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setShowWatchModal(false)}>
          <View style={styles.watchModalOverlay}>
            <TouchableOpacity style={styles.watchModalBackdrop} onPress={() => setShowWatchModal(false)} activeOpacity={1} />
            <View style={[styles.watchModalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.watchModalHandle} />
              <ScrollView contentContainerStyle={styles.watchModalScrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.watchModalTitle}>{selectedWatch.title}</Text>
                <Text style={styles.watchModalTypeYear}>
                  {watchTypeLabelTr(selectedWatch.type)} · {selectedWatch.year}
                </Text>
                <Text style={styles.watchModalDesc}>{selectedWatch.description}</Text>

                <View style={styles.watchModalActions}>
                  <TouchableOpacity
                    style={[
                      styles.watchModalPrimaryBtn,
                      !selectedWatch.where[0]?.url && styles.watchModalBtnDisabled,
                    ]}
                    disabled={!selectedWatch.where[0]?.url}
                    onPress={() => {
                      const url = selectedWatch.where[0]?.url;
                      if (url) void Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="play-circle-outline" size={20} color={ACCENT_LIGHT} />
                    <Text style={styles.watchModalPrimaryBtnText}>İzle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.watchModalSecondaryBtn}
                    onPress={async () => {
                      await toggleWatchFavoriteId(selectedWatch.id);
                      const ids = await getWatchFavoriteIds();
                      setWatchFavoriteIds(ids);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons
                      name={watchFavoriteIds.includes(selectedWatch.id) ? 'heart' : 'heart-outline'}
                      size={20}
                      color={
                        watchFavoriteIds.includes(selectedWatch.id) ? ACCENT : colors.textSecondary
                      }
                    />
                    <Text style={styles.watchModalSecondaryBtnText}>
                      {watchFavoriteIds.includes(selectedWatch.id) ? 'Favorilerden çıkar' : 'Favoriye ekle'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.watchCloseBtn} onPress={() => setShowWatchModal(false)}>
                  <Text style={styles.watchCloseBtnText}>Kapat</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      <SozAlert {...alertConfig} onDismiss={hideAlert} />

      <ShareVerseModal
        visible={shareRandomVisible}
        onClose={() => setShareRandomVisible(false)}
        verseText={shareRandomText}
        verseRef={shareRandomRef}
      />
    </View>
  );
}

const SectionHeader = ({
  title,
  subtitle,
  styles,
  onMore,
  subtitleNoGap,
}: {
  title: string;
  subtitle: string;
  styles: ReturnType<typeof makeStyles>;
  onMore?: () => void;
  subtitleNoGap?: boolean;
}) => (
  <View style={styles.sectionHeader}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={[styles.sectionSubtitle, subtitleNoGap && styles.sectionSubtitleNoGap]}>{subtitle}</Text>
    </View>
    {onMore ? (
      <TouchableOpacity onPress={onMore}>
        <Text style={styles.sectionMore}>Tümü →</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

type AppFonts = typeof appFonts;

const makeStyles = (colors: ThemeColors, fonts: AppFonts) => {
  const A = ACCENT;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 4 },
    headerTitle: { fontSize: 32, color: colors.text, fontFamily: fonts.regular, letterSpacing: -0.02 },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic ?? fonts.regular,
      marginTop: 6,
    },
    searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${A}30`,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
      marginBottom: 0,
    },
    searchBarFocused: {
      borderColor: A,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.regular },
    exploreScrollContent: { flexGrow: 1 },
    exploreSection: { marginBottom: 28 },
    searchEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    searchEmptyText: { fontSize: 15, color: colors.textMuted, fontFamily: fonts.regular },
    searchEmptySubText: { fontSize: 13, color: colors.textSecondary, fontFamily: fonts.regular },
    searchResults: {
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 8,
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    searchResultIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: `${A}14`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchResultText: { flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.regular },
    verseSearchResults: {
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    verseSearchItem: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    verseSearchBar: {
      width: 2,
      borderRadius: 1,
      backgroundColor: A,
      alignSelf: 'stretch',
    },
    verseSearchContent: { flex: 1, gap: 4 },
    verseSearchRef: {
      fontSize: 11,
      color: A,
      letterSpacing: 0.1,
      fontFamily: fonts.medium,
    },
    verseSearchText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      fontStyle: 'italic',
      fontFamily: fonts.italic ?? fonts.regular,
    },
    quickAccess: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    quickItem: { flex: 1, alignItems: 'center', gap: 8 },
    quickIcon: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    quickIconActive: {
      borderColor: A,
      borderWidth: 1,
    },
    quickLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      textAlign: 'center',
      marginTop: 6,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.01,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      marginBottom: 14,
    },
    sectionSubtitleNoGap: { marginBottom: 0 },
    sectionMore: { fontSize: 13, color: A, fontFamily: fonts.regular },
    hScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
    gamesScrollContent: {
      paddingHorizontal: 16,
      paddingRight: 28,
      paddingBottom: 4,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    gameCard: {
      width: SCREEN_WIDTH * 0.58,
      height: 200,
      borderRadius: 16,
      marginRight: 12,
      borderWidth: 0.5,
      borderColor: `${A}1F`,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    gameCardOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#4CAF5015',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      zIndex: 2,
    },
    gameCardOverlayText: { fontSize: 12, color: '#4CAF50', fontFamily: fonts.regular },
    gameCardInner: { flex: 1, padding: 12, justifyContent: 'space-between' },
    gameTopBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    gameTopBadgeDaily: { backgroundColor: `${A}20` },
    gameTopBadgeNew: { backgroundColor: '#4CAF5020' },
    gameTopBadgeText: { fontSize: 9, letterSpacing: 0.12, fontFamily: fonts.regular },
    gameTopBadgeTextDaily: { color: A },
    gameTopBadgeTextNew: { color: '#4CAF50' },
    gameCardIconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    gameCardFooter: { gap: 4 },
    gameCardTitle: {
      fontSize: 13,
      color: colors.text,
      fontFamily: fonts.regular,
      fontWeight: '700',
      letterSpacing: -0.01,
    },
    gameCardDesc: {
      fontSize: 11,
      color: colors.textMuted,
      fontFamily: fonts.italic ?? fonts.regular,
      fontStyle: 'italic',
    },
    gameStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    gameStreakRowText: { fontSize: 12, color: A, fontFamily: fonts.regular },
    watchFilters: {
      paddingLeft: 16,
      paddingRight: 8,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    watchFilterBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    watchFilterBtnActive: {
      backgroundColor: A,
      borderColor: A,
    },
    watchFilterText: { fontSize: 13, color: colors.textSecondary, fontFamily: fonts.regular },
    watchFilterTextActive: { color: ACCENT_LIGHT },
    watchMustBadge: {
      marginHorizontal: 16,
      marginBottom: 10,
      alignSelf: 'flex-start',
      backgroundColor: `${A}1A`,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 0.5,
      borderColor: `${A}4D`,
    },
    watchMustText: { fontSize: 11, color: A, fontFamily: fonts.regular },
    watchCardsScroll: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    watchCard: {
      width: 140,
      height: 200,
      borderRadius: 12,
      marginRight: 12,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    watchCardPoster: { flex: 7, width: '100%', minHeight: 0 },
    watchCardBottom: {
      flex: 3,
      width: '100%',
      minHeight: 0,
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      paddingVertical: 6,
      justifyContent: 'center',
      gap: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    watchCardTitle: {
      fontSize: 13,
      color: colors.text,
      fontFamily: fonts.regular,
      fontWeight: '700',
      letterSpacing: -0.01,
      lineHeight: 17,
    },
    watchCardBadge: {
      alignSelf: 'flex-start',
      backgroundColor: `${A}33`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    watchCardBadgeText: {
      fontSize: 9,
      letterSpacing: 0.08,
      color: A,
      fontFamily: fonts.regular,
    },
    featuredCard: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 0.5,
      borderColor: colors.border,
      overflow: 'hidden',
      flexDirection: 'row',
      minHeight: 150,
    },
    featuredBg: {
      width: 120,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${A}0D`,
      borderRightWidth: 0.5,
      borderRightColor: colors.border,
    },
    featuredEmoji: { fontSize: 52 },
    featuredContent: { flex: 1, padding: 18, justifyContent: 'center', gap: 6 },
    featuredLabel: { fontSize: 9, letterSpacing: 0.2, color: A, fontFamily: fonts.regular, opacity: 0.75 },
    featuredTitle: {
      fontSize: 20,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.02,
      lineHeight: 26,
    },
    featuredDesc: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic ?? fonts.regular,
    },
    featuredBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    featuredBtnText: { fontSize: 13, color: A, fontFamily: fonts.regular },
    learnTwinRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 10 },
    learnTwinCard: {
      flex: 1,
      minWidth: 0,
      height: 120,
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.card,
    },
    learnTwinCardCal: { borderLeftWidth: 3, borderLeftColor: A },
    learnTwinCardRand: { borderLeftWidth: 3, borderLeftColor: '#7C9A8A' },
    learnTwinInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    learnTwinTextCol: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4 },
    learnTwinTitle: {
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.regular,
      fontWeight: '700',
      letterSpacing: -0.01,
    },
    learnTwinSubtitle: { fontSize: 12, color: colors.textSecondary, fontFamily: fonts.regular, lineHeight: 16 },
    toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
    toolCard: {
      width: '47%',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 0.5,
      borderColor: colors.border,
      gap: 8,
      position: 'relative',
    },
    toolIcon: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: `${A}0F`,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolTitle: { fontSize: 14, color: colors.text, fontFamily: fonts.regular },
    toolDesc: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic ?? fonts.regular,
    },
    watchModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    watchModalBackdrop: { flex: 1 },
    watchModalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 0.5,
      borderColor: colors.border,
      maxHeight: '85%',
      backgroundColor: colors.card,
    },
    watchModalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    watchModalScrollContent: { padding: 24, gap: 14, paddingBottom: 8 },
    watchModalTitle: {
      fontSize: 20,
      color: colors.text,
      fontFamily: fonts.regular,
      fontWeight: '700',
      letterSpacing: -0.02,
      lineHeight: 26,
    },
    watchModalTypeYear: { fontSize: 14, color: colors.textSecondary, fontFamily: fonts.regular },
    watchModalDesc: {
      fontSize: 15,
      color: colors.textMuted,
      fontFamily: fonts.italic ?? fonts.regular,
      fontStyle: 'italic',
      lineHeight: 23,
    },
    watchModalActions: { gap: 10, marginTop: 4 },
    watchModalPrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: A,
      borderRadius: 14,
      paddingVertical: 14,
    },
    watchModalPrimaryBtnText: { fontSize: 16, color: ACCENT_LIGHT, fontFamily: fonts.regular, fontWeight: '600' },
    watchModalBtnDisabled: { opacity: 0.45 },
    watchModalSecondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    watchModalSecondaryBtnText: { fontSize: 15, color: colors.textSecondary, fontFamily: fonts.regular },
    watchCloseBtn: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    watchCloseBtnText: { fontSize: 15, color: colors.textMuted, fontFamily: fonts.regular },
  });
};


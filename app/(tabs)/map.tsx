import { bookList } from '@/constants/bible-index';
import type { TranslationKey } from '@/constants/i18n';
import { locations, type MapLocation } from '@/constants/map-locations';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const ACCENT = '#C4956A';

const TURKEY_REGION = {
  latitude: 38.9637,
  longitude: 35.2433,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1612' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#C4956A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A08' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#C4956A', lightness: -50 }],
  },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d261f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

type FilterId = 'all' | 'revelation' | 'paul';

const PIN_PATH =
  'M14 0C6.268 0 0 6.268 0 14c0 10 14 22 14 22S28 24 28 14C28 6.268 21.732 0 14 0z';

function CustomMapPin({ selected }: { selected: boolean }) {
  const w = selected ? 34 : 28;
  const h = selected ? 44 : 36;
  const innerFill = selected ? ACCENT : '#0A0A08';
  return (
    <View style={styles.markerContainer} collapsable={false}>
      <Svg width={w} height={h} viewBox="0 0 28 36">
        <Path d={PIN_PATH} fill={ACCENT} />
        <Circle cx="14" cy="14" r="6" fill={innerFill} />
      </Svg>
    </View>
  );
}

function getBookIdAndChapterFromRef(ref: string): { bookId: string; chapter: number } | null {
  try {
    const match = ref.match(/^(.+?)\s+(\d+):/);
    if (!match) return null;
    const bookPart = match[1].trim();
    const chapter = parseInt(match[2], 10);
    if (Number.isNaN(chapter)) return null;
    const book = bookList.find(
      (b) =>
        b.name === bookPart ||
        b.shortName === bookPart ||
        bookPart.startsWith(b.shortName) ||
        b.name.startsWith(bookPart)
    );
    if (!book) return null;
    return { bookId: book.id, chapter };
  } catch {
    return null;
  }
}

function categoryBadgeLabel(
  loc: MapLocation,
  t: (k: TranslationKey, params?: Record<string, string | number>) => string
): string {
  if (loc.revelationChurch) return t('mapBadgeRevelation');
  if (loc.paulVisited) return t('mapBadgePaul');
  if (loc.category === 'ada') return t('mapBadgeIsland');
  return loc.region;
}

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

export default function MapScreen() {
  const { theme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ focusId?: string | string[] }>();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<InstanceType<typeof MapView>>(null);

  const [filter, setFilter] = useState<FilterId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const panelH = useMemo(() => Math.round(SCREEN_H * 0.4), []);
  const slideAnim = useRef(new Animated.Value(panelH)).current;

  const bg = theme.background ?? '#0A0A08';
  const surface = theme.surface ?? '#1A1612';
  const text = theme.text ?? '#E8E0D0';
  const muted = theme.textMuted ?? 'rgba(232,224,208,0.5)';
  const isDarkMap = resolvedTheme === 'night' || resolvedTheme === 'black';

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.setItem('@soz/mapOpened', 'true').catch(() => {});
    }, [])
  );

  useEffect(() => {
    const to = selectedId ? 0 : panelH;
    Animated.spring(slideAnim, {
      toValue: to,
      useNativeDriver: false,
      friction: 9,
      tension: 65,
    }).start();
  }, [selectedId, panelH, slideAnim]);

  const filters = useMemo(
    () =>
      [
        { id: 'all' as const, label: t('mapFilterAll') },
        { id: 'revelation' as const, label: t('mapFilterRevelation') },
        { id: 'paul' as const, label: t('mapFilterPaul') },
      ],
    [t]
  );

  const filteredLocations = useMemo(() => {
    switch (filter) {
      case 'revelation':
        return locations.filter((l) => l.revelationChurch);
      case 'paul':
        return locations.filter((l) => l.paulVisited);
      default:
        return locations;
    }
  }, [filter]);

  const selected = useMemo(
    () => (selectedId ? locations.find((l) => l.id === selectedId) ?? null : null),
    [selectedId]
  );

  const allCoords = useMemo(
    () =>
      locations.map((l) => ({
        latitude: l.coordinates.lat,
        longitude: l.coordinates.lng,
      })),
    []
  );

  const focusLocation = useCallback((loc: MapLocation) => {
    mapRef.current?.animateToRegion(
      {
        latitude: loc.coordinates.lat,
        longitude: loc.coordinates.lng,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      },
      800
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      const raw = searchParams.focusId;
      const fid = Array.isArray(raw) ? raw[0] : raw;
      if (!fid || typeof fid !== 'string') return;
      const loc = locations.find((l) => l.id === fid);
      if (!loc) {
        try {
          router.setParams({ focusId: undefined });
        } catch {
          /* ignore */
        }
        return;
      }
      const timer = setTimeout(() => {
        try {
          setFilter('all');
          setSelectedId(loc.id);
          focusLocation(loc);
        } catch {
          /* ignore */
        }
        try {
          router.setParams({ focusId: undefined });
        } catch {
          /* ignore */
        }
      }, 450);
      return () => clearTimeout(timer);
    }, [searchParams.focusId, router, focusLocation])
  );

  const onMarkerPress = useCallback(
    (loc: MapLocation) => {
      try {
        haptics.selection();
      } catch {
        /* ignore */
      }
      setSelectedId(loc.id);
      focusLocation(loc);
    },
    [haptics, focusLocation]
  );

  const onFilterPress = useCallback(
    (id: FilterId) => {
      try {
        haptics.selection();
      } catch {
        /* ignore */
      }
      setFilter(id);
      setSelectedId(null);
    },
    [haptics]
  );

  const fitTurkey = useCallback(() => {
    try {
      haptics.light();
    } catch {
      /* ignore */
    }
    mapRef.current?.fitToCoordinates(allCoords, {
      edgePadding: {
        top: insets.top + 56,
        right: 56,
        bottom: panelH + 24,
        left: 24,
      },
      animated: true,
    });
  }, [allCoords, haptics, insets.top, panelH]);

  const goToUserLocation = useCallback(async () => {
    try {
      haptics.light();
    } catch {
      /* ignore */
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    mapRef.current?.animateToRegion(
      {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      },
      800
    );
  }, [haptics]);

  const onReadPress = useCallback(() => {
    if (!selected?.bibleRefs?.length) return;
    try {
      const parsed = getBookIdAndChapterFromRef(selected.bibleRefs[0]);
      if (parsed) {
        haptics.light();
        router.push({
          pathname: '/(tabs)/read',
          params: { bookId: parsed.bookId, chapter: String(parsed.chapter) },
        });
      }
    } catch {
      /* ignore */
    }
  }, [selected, router, haptics]);

  const keyVerse = selected?.keyVerses?.[0];

  const descPreview = useCallback((d: string) => {
    const max = 140;
    return d.length > max ? `${d.slice(0, max).trim()}…` : d;
  }, []);

  const markerElements = useMemo(
    () =>
      filteredLocations.map((loc) => {
        const sel = selectedId === loc.id;
        return (
          <Marker
            key={`${loc.id}-${selectedId === loc.id}`}
            coordinate={{ latitude: loc.coordinates.lat, longitude: loc.coordinates.lng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            onPress={() => onMarkerPress(loc)}
          >
            <CustomMapPin selected={sel} />
            <Callout tooltip onPress={() => onMarkerPress(loc)}>
              <View style={styles.calloutBox}>
                <Text style={styles.calloutTitle}>{loc.name}</Text>
                <Text style={styles.calloutModern}>{loc.modernName}</Text>
                <Text style={styles.calloutDesc} numberOfLines={2}>
                  {descPreview(loc.description)}
                </Text>
                <Pressable style={styles.calloutBtn} onPress={() => onMarkerPress(loc)}>
                  <View style={styles.calloutBtnContent}>
                <Text style={styles.calloutBtnText}>Detay</Text>
                <Ionicons name="arrow-forward" size={16} color="#C4956A" style={styles.calloutBtnArrow} />
              </View>
                </Pressable>
              </View>
            </Callout>
          </Marker>
        );
      }),
    [filteredLocations, selectedId, onMarkerPress, descPreview]
  );

  const mapProvider =
    Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: text }]}>{t('anatoliaMap')}</Text>
        <Text style={[styles.headerSubtitle, { color: muted }]}>{t('holyPlacesSubtitle')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filtersScroll, { borderBottomColor: muted }]}
        contentContainerStyle={styles.filtersRow}
      >
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => onFilterPress(f.id)}
              style={({ pressed }) => [
                styles.filterBtn,
                active ? styles.filterBtnActive : styles.filterBtnInactive,
                { borderColor: muted, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text
                style={[styles.filterBtnText, { color: active ? '#1A1208' : text }]}
                numberOfLines={1}
                adjustsFontSizeToFit={false}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={mapProvider}
          initialRegion={TURKEY_REGION}
          customMapStyle={isDarkMap ? darkMapStyle : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
          mapType="standard"
        >
          {markerElements}
        </MapView>

        <View style={[styles.mapControls, { top: insets.top + 8 }]}>
          <Pressable
            style={[styles.ctrlBtn, { backgroundColor: surface, borderColor: ACCENT }]}
            onPress={fitTurkey}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('showFullMap')}
          >
            <Ionicons name="map-outline" size={20} color={ACCENT} />
          </Pressable>
          <Pressable
            style={[styles.ctrlBtn, { backgroundColor: surface, borderColor: ACCENT }]}
            onPress={goToUserLocation}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('myLocation')}
          >
            <Ionicons name="location-outline" size={20} color={ACCENT} />
          </Pressable>
        </View>

        {!selectedId ? (
          <View style={styles.mapHint} pointerEvents="none">
            <Text style={[styles.mapHintText, { color: text }]}>{t('touchMap')}</Text>
          </View>
        ) : null}
      </View>

      <Animated.View
        pointerEvents={selectedId ? 'auto' : 'none'}
        style={[
          styles.bottomPanel,
          {
            height: panelH,
            backgroundColor: surface,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {selected ? (
          <>
            <View style={styles.panelHandle} />
            <ScrollView
              style={styles.panelScroll}
              contentContainerStyle={styles.panelScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Text style={[styles.detailName, { color: text }]}>{selected.name}</Text>
              <Text style={[styles.detailModern, { color: muted }]}>{selected.modernName}</Text>
              <View style={styles.badgeWrap}>
                <View style={[styles.badge, { borderColor: ACCENT }]}>
                  <Text style={[styles.badgeText, { color: ACCENT }]}>
                    {categoryBadgeLabel(selected, t)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.descText, { color: text }]}>{selected.description}</Text>
              {keyVerse ? (
                <View style={[styles.keyVerse, { borderLeftColor: ACCENT }]}>
                  <Text style={[styles.keyVerseRef, { color: ACCENT }]}>{keyVerse.ref}</Text>
                  <Text style={[styles.keyVerseBody, { color: text }]}>«{keyVerse.text}»</Text>
                </View>
              ) : null}
              <Pressable
                style={[styles.readBtn, { backgroundColor: ACCENT }]}
                onPress={onReadPress}
              >
                <Text style={styles.readBtnText}>{t('readChapter')}</Text>
              </Pressable>
              <Pressable
                style={styles.closePanel}
                onPress={() => setSelectedId(null)}
                hitSlop={12}
              >
                <Text style={[styles.closePanelText, { color: muted }]}>Kapat</Text>
              </Pressable>
            </ScrollView>
          </>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(196,149,106,0.2)',
  },
  headerTitle: {
    fontFamily: fonts.thin,
    fontSize: 26,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontFamily: fonts.italic,
    fontSize: 14,
  },
  filtersScroll: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  filterBtnActive: {
    backgroundColor: ACCENT,
  },
  filterBtnInactive: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  filterBtnText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    minHeight: 280,
    borderRadius: borderRadius.card,
    marginHorizontal: 12,
    marginTop: 10,
    overflow: 'hidden',
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    gap: 10,
    zIndex: 10,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  mapHint: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapHintText: {
    fontFamily: fonts.italic,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  calloutBox: {
    backgroundColor: '#1A1612',
    borderWidth: 0.5,
    borderColor: '#C4956A',
    borderRadius: 10,
    padding: 12,
    minWidth: 200,
    maxWidth: SCREEN_W * 0.72,
  },
  calloutTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: '#E8E0D0',
    marginBottom: 4,
  },
  calloutModern: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(232,224,208,0.45)',
    marginBottom: 8,
  },
  calloutDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#E8E0D0',
    marginBottom: 10,
  },
  calloutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  calloutBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calloutBtnArrow: {
    marginLeft: 2,
  },
  calloutBtnText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#C4956A',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(196,149,106,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(196,149,106,0.35)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  panelScroll: { flex: 1 },
  panelScrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  detailName: {
    fontFamily: fonts.medium,
    fontSize: 20,
    marginBottom: 4,
  },
  detailModern: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 10,
  },
  badgeWrap: { marginBottom: 10 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(196,149,106,0.08)',
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  descText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  keyVerse: {
    borderLeftWidth: 4,
    paddingLeft: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  keyVerseRef: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginBottom: 6,
  },
  keyVerseBody: {
    fontFamily: fonts.italic,
    fontSize: 15,
    lineHeight: 22,
  },
  readBtn: {
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  readBtnText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
  },
  closePanel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closePanelText: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
});

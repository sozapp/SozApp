import {
  getVideoThumbnailUrl,
  isVideoFree,
  openVideo,
  videos,
  type Video,
  type VideoCategory,
} from '@/constants/videos';
import { colors, fonts } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';
const MUTED = 'rgba(232,224,208,0.5)';
const TEXT = '#E8E0D0';
const BG = '#0A0A08';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_W - 48;
const THUMB_HEIGHT = Math.round((CARD_WIDTH * 9) / 16);

const CATEGORY_OPTIONS: { id: VideoCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'bible-project', label: 'Bible Project' },
  { id: 'devotional', label: 'Devotional' },
];

function ThumbnailImage({ uri }: { uri: string }) {
  const [loading, setLoading] = useState(true);
  return (
    <View style={styles.thumbWrap}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? (
        <View style={[StyleSheet.absoluteFillObject, styles.thumbLoad]}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      ) : null}
    </View>
  );
}

export default function VideosScreen() {
  const router = useRouter();
  const safeBack = useSafeBack();
  const { isPremium } = usePremium();
  const [category, setCategory] = useState<VideoCategory | 'all'>('all');

  const filtered = useMemo(() => {
    if (category === 'all') return videos;
    return videos.filter((v) => v.category === category);
  }, [category]);

  const handleVideoPress = useCallback(
    (video: Video, index: number) => {
      const free = isVideoFree(videos.indexOf(video));
      if (!free && !isPremium) {
        try {
          router.push('/paywall');
        } catch {
          /* ignore */
        }
        return;
      }
      openVideo(video.youtubeId);
    },
    [isPremium, router]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: Video; index: number }) => {
      const globalIndex = videos.findIndex((v) => v.id === item.id);
      const locked = !isPremium && !isVideoFree(globalIndex);
      const thumbUrl = getVideoThumbnailUrl(item.youtubeId);

      return (
        <Pressable
          style={[styles.card, locked && styles.cardLocked]}
          onPress={() => handleVideoPress(item, globalIndex)}
        >
          <View style={styles.thumbWrap}>
            <ThumbnailImage uri={thumbUrl} />
            {locked && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={32} color="#fff" />
              </View>
            )}
            {!locked && (
              <View style={styles.playOverlay} pointerEvents="none">
                <View style={styles.playCircle}>
                  <Text style={styles.playIcon}>▶</Text>
                </View>
              </View>
            )}
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
          {item.bibleRef != null ? (
            <Text style={styles.cardRef}>{item.bibleRef}</Text>
          ) : null}
        </Pressable>
      );
    },
    [isPremium, handleVideoPress]
  );

  return (
    <View style={styles.safe}>
      <SafeAreaView style={styles.safeInner} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => safeBack()}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Geri git"
          >
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Videolar</Text>
            <Text style={styles.headerSub}>Bible Project Türkçe</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersRow}
        >
          {CATEGORY_OPTIONS.map((opt) => {
            const active = category === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setCategory(opt.id)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Bu kategoride video yok.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  safeInner: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(196,149,80,0.2)',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.thin,
    fontSize: 32,
    color: TEXT,
  },
  headerSub: {
    fontFamily: fonts.italic,
    fontSize: 14,
    color: MUTED,
    marginTop: 4,
  },
  filtersScroll: {
    maxHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(196,149,80,0.15)',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(196,149,80,0.35)',
  },
  filterChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  filterChipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: MUTED,
  },
  filterChipTextActive: {
    color: BG,
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(26,22,18,0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.2)',
  },
  cardLocked: {
    opacity: 0.92,
  },
  thumbWrap: {
    width: '100%',
    height: THUMB_HEIGHT,
    backgroundColor: '#1a1612',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbLoad: {
    backgroundColor: '#1a1612',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 28,
    color: '#fff',
    marginLeft: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },
  cardTitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: TEXT,
    paddingHorizontal: 14,
    paddingTop: 12,
    lineHeight: 22,
  },
  cardDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: MUTED,
    paddingHorizontal: 14,
    paddingTop: 6,
    lineHeight: 18,
  },
  cardRef: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: ACCENT,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 14,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.italic,
    fontSize: 15,
    color: MUTED,
  },
});

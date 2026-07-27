import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SozLogo } from '@/components/SozLogo';
import { fonts } from '@/constants/theme';
import { bookList } from '@/constants/bible-index';
import { getDailyStats, getBooksStats } from '@/constants/stats-storage';
import { parseFavoritesRaw } from '@/hooks/useFavorites';
import { useBadges } from '@/hooks/useBadges';
import { useSafeBack } from '@/hooks/useSafeBack';

// Bu "Yılım" kartı bilerek uygulamanın açık/koyu temasından bağımsız,
// kendi sabit marka kimliğiyle geliyor — Spotify Wrapped tarzı paylaşılabilir
// bir poster her zaman aynı görünmeli, ekran temasına göre değişmemeli.
const BG = '#0A0A08';
const CARD_BG = '#151109';
const TEXT = '#F0E9DC';
const MUTED = 'rgba(240,233,220,0.55)';
const ACCENT = '#C4956A';

type YearStats = {
  totalVerses: number;
  streak: number;
  favoriteCount: number;
  badgeCount: number;
  topBookName: string | null;
};

export default function YearReviewScreen() {
  const safeBack = useSafeBack();
  const { earnedBadges } = useBadges();
  const viewShotRef = useRef<ViewShot>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<YearStats>({
    totalVerses: 0,
    streak: 0,
    favoriteCount: 0,
    badgeCount: 0,
    topBookName: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [daily, books, streakRaw, favRaw] = await Promise.all([
          getDailyStats(),
          getBooksStats(),
          AsyncStorage.getItem('@soz/streak'),
          AsyncStorage.getItem('@soz/favorites'),
        ]);
        if (cancelled) return;

        const totalVerses = Object.values(daily).reduce((sum, n) => sum + (n ?? 0), 0);

        let topBookId: string | null = null;
        let topBookCount = 0;
        for (const [bookId, count] of Object.entries(books)) {
          if (count > topBookCount) {
            topBookCount = count;
            topBookId = bookId;
          }
        }
        const topBookName = topBookId
          ? (bookList.find((b) => b.id === topBookId)?.name ?? null)
          : null;

        const streak = streakRaw != null ? Math.max(0, parseInt(streakRaw, 10) || 0) : 0;
        const favoriteCount = parseFavoritesRaw(favRaw).length;

        setStats({
          totalVerses,
          streak,
          favoriteCount,
          badgeCount: earnedBadges.length,
          topBookName,
        });
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [earnedBadges.length]);

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Söz ile Yılım' });
      } else {
        await Share.share({
          message: `Söz ile bu yıl ${stats.totalVerses} ayet okudum! 📖 sozapp.com`,
        });
      }
    } catch (e) {
      console.warn('Year review share error:', e);
    }
  };

  const year = new Date().getFullYear();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={{ width: 44 }} />
        <Text style={styles.headerTitle}>Söz ile Yılım</Text>
        <TouchableOpacity
          onPress={() => safeBack()}
          style={styles.closeBtn}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={24} color={TEXT} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : (
        <View style={styles.content}>
          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1 }}>
            <View style={styles.poster}>
              <View style={styles.posterHeader}>
                <SozLogo size={26} color={ACCENT} />
                <Text style={styles.posterBrand}>Söz</Text>
              </View>
              <Text style={styles.posterTitle}>{year} Yılın</Text>
              <Text style={styles.posterSubtitle}>Söz'le geçirdiğin yıl</Text>

              <View style={styles.heroStat}>
                <Text style={styles.heroNumber}>{stats.totalVerses}</Text>
                <Text style={styles.heroLabel}>Ayet Okudun</Text>
              </View>

              <View style={styles.statGrid}>
                <View style={styles.statCell}>
                  <Ionicons name="flame" size={20} color={ACCENT} />
                  <Text style={styles.statNumber}>{stats.streak}</Text>
                  <Text style={styles.statLabel}>Gün Seri</Text>
                </View>
                <View style={styles.statCell}>
                  <Ionicons name="heart" size={20} color={ACCENT} />
                  <Text style={styles.statNumber}>{stats.favoriteCount}</Text>
                  <Text style={styles.statLabel}>Favori Ayet</Text>
                </View>
                <View style={styles.statCell}>
                  <Ionicons name="ribbon" size={20} color={ACCENT} />
                  <Text style={styles.statNumber}>{stats.badgeCount}</Text>
                  <Text style={styles.statLabel}>Rozet</Text>
                </View>
              </View>

              {stats.topBookName && (
                <View style={styles.topBookRow}>
                  <Ionicons name="book" size={16} color={ACCENT} />
                  <Text style={styles.topBookText}>
                    En çok <Text style={styles.topBookName}>{stats.topBookName}</Text>'ı okudun
                  </Text>
                </View>
              )}

              <Text style={styles.posterFooter}>sozapp.com</Text>
            </View>
          </ViewShot>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.88}>
            <Ionicons name="share-outline" size={18} color={BG} />
            <Text style={styles.shareBtnText}>Paylaş</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: TEXT,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  poster: {
    width: 320,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${ACCENT}30`,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  posterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  posterBrand: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: ACCENT,
    letterSpacing: 0.5,
  },
  posterTitle: {
    fontFamily: fonts.thin,
    fontSize: 30,
    color: TEXT,
  },
  posterSubtitle: {
    fontFamily: fonts.italic,
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
    marginBottom: 26,
  },
  heroStat: {
    alignItems: 'center',
    marginBottom: 26,
  },
  heroNumber: {
    fontFamily: fonts.medium,
    fontSize: 56,
    color: ACCENT,
    lineHeight: 60,
  },
  heroLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  statCell: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statNumber: {
    fontFamily: fonts.medium,
    fontSize: 20,
    color: TEXT,
    marginTop: 2,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: MUTED,
  },
  topBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${ACCENT}12`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 22,
  },
  topBookText: {
    fontFamily: fonts.italic,
    fontSize: 12.5,
    color: MUTED,
  },
  topBookName: {
    fontFamily: fonts.medium,
    color: TEXT,
  },
  posterFooter: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: MUTED,
    letterSpacing: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    width: 320,
  },
  shareBtnText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: BG,
  },
});

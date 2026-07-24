import { ALL_BADGES, type Badge, type UserStats } from '@/constants/badges';
import { getVisitedMapLocationCount } from '@/constants/map-visits';
import type { TranslationKey } from '@/constants/i18n';
import { useTranslation } from '@/context/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';

type ReadingHistoryItem = {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  readAt: string;
};

type SummaryStats = {
  totalVersesRead: number;
  totalChaptersRead: number;
  longestStreak: number;
  totalNotes: number;
};

type WeeklyPoint = {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
};

type TopBook = {
  book: string;
  count: number;
};

const WEEKDAY_KEYS: TranslationKey[] = [
  'weekdayShortSun',
  'weekdayShortMon',
  'weekdayShortTue',
  'weekdayShortWed',
  'weekdayShortThu',
  'weekdayShortFri',
  'weekdayShortSat',
];

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildLast7Days(): Date[] {
  const out: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

function computeBadgeProgress(badge: Badge, stats: UserStats): { current: number; target: number; done: boolean } {
  switch (badge.id) {
    case 'first_step':
      return { current: Math.min(stats.daysActive, 1), target: 1, done: stats.daysActive >= 1 };
    case 'reader':
      return { current: Math.min(stats.totalVersesRead, 50), target: 50, done: stats.totalVersesRead >= 50 };
    case 'scholar':
      return { current: Math.min(stats.totalVersesRead, 500), target: 500, done: stats.totalVersesRead >= 500 };
    case 'streak_3':
      return { current: Math.min(stats.streak, 3), target: 3, done: stats.streak >= 3 };
    case 'streak_7':
      return { current: Math.min(stats.streak, 7), target: 7, done: stats.streak >= 7 };
    case 'streak_30':
      return { current: Math.min(stats.streak, 30), target: 30, done: stats.streak >= 30 };
    case 'note_taker':
      return { current: Math.min(stats.totalNotes, 1), target: 1, done: stats.totalNotes >= 1 };
    case 'note_master':
      return { current: Math.min(stats.totalNotes, 10), target: 10, done: stats.totalNotes >= 10 };
    case 'favorite':
      return { current: Math.min(stats.totalFavorites, 1), target: 1, done: stats.totalFavorites >= 1 };
    case 'gamer':
      return { current: Math.min(stats.gamesPlayed, 10), target: 10, done: stats.gamesPlayed >= 10 };
    case 'memorizer':
      return { current: Math.min(stats.memorizeCount, 1), target: 1, done: stats.memorizeCount >= 1 };
    case 'reflector':
      return {
        current: Math.min(stats.reflectionsCompleted, 7),
        target: 7,
        done: stats.reflectionsCompleted >= 7,
      };
    case 'anatolia_explorer':
      return {
        current: Math.min(stats.mapLocationsVisited, badge.target),
        target: badge.target,
        done: stats.mapLocationsVisited >= badge.target,
      };
    default:
      return { current: 0, target: 1, done: false };
  }
}

export default function StatsScreen() {
  const { colors, fonts } = useTheme();
  const { t } = useTranslation();
  const safeBack = useSafeBack();
  const [summary, setSummary] = useState<SummaryStats>({
    totalVersesRead: 0,
    totalChaptersRead: 0,
    longestStreak: 0,
    totalNotes: 0,
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>([]);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [badgeStats, setBadgeStats] = useState<UserStats>({
    streak: 0,
    totalVersesRead: 0,
    totalNotes: 0,
    totalFavorites: 0,
    gamesPlayed: 0,
    daysActive: 1,
    memorizeCount: 0,
    reflectionsCompleted: 0,
    mapLocationsVisited: 0,
  });

  const load = useCallback(async () => {
    try {
      const [historyRaw, streakRaw, notesRaw, favoritesRaw, gamesRaw, daysRaw, memorizeRaw, reflectionsRaw] =
        await AsyncStorage.multiGet([
          '@soz/readingHistory',
          '@soz/streak',
          '@soz/notes',
          '@soz/favorites',
          '@soz/totalGamesPlayed',
          '@soz/daysActive',
          '@soz/memorizeList',
          '@soz/totalReflections',
        ]);

      const history = (historyRaw[1] ? JSON.parse(historyRaw[1]) : []) as ReadingHistoryItem[];
      const notes = notesRaw[1] ? (JSON.parse(notesRaw[1]) as unknown[]) : [];
      const favorites = favoritesRaw[1] ? (JSON.parse(favoritesRaw[1]) as unknown[]) : [];
      const streak = Number(streakRaw[1] ?? 0);

      const chaptersSet = new Set(
        history
          .filter((item) => item?.book && Number.isFinite(item?.chapter))
          .map((item) => `${item.book}-${item.chapter}`)
      );

      const totalVersesFromHistory = history.reduce((sum, item) => {
        return sum + (typeof item?.verse === 'number' && item.verse > 0 ? 1 : 0);
      }, 0);

      setSummary({
        totalVersesRead: totalVersesFromHistory > 0 ? totalVersesFromHistory : history.length,
        totalChaptersRead: chaptersSet.size,
        longestStreak: streak,
        totalNotes: notes.length,
      });

      const weeklyDays = buildLast7Days();
      const dailyCounts = history.reduce<Record<string, number>>((acc, item) => {
        if (!item?.readAt) return acc;
        const key = getDateKey(new Date(item.readAt));
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      const todayKey = getDateKey(new Date());
      const mappedWeekly = weeklyDays.map((d) => {
        const key = getDateKey(d);
        return {
          key,
          label: t(WEEKDAY_KEYS[d.getDay()] ?? 'weekdayShortSun'),
          count: dailyCounts[key] ?? 0,
          isToday: key === todayKey,
        };
      });
      setWeeklyData(mappedWeekly);

      const bookCounts = history.reduce<Record<string, number>>((acc, item) => {
        if (!item?.book) return acc;
        acc[item.book] = (acc[item.book] ?? 0) + 1;
        return acc;
      }, {});
      const top = Object.entries(bookCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([book, count]) => ({ book, count }));
      setTopBooks(top);

      setBadgeStats({
        streak,
        totalVersesRead: totalVersesFromHistory > 0 ? totalVersesFromHistory : history.length,
        totalNotes: notes.length,
        totalFavorites: favorites.length,
        gamesPlayed: Number(gamesRaw[1] ?? 0),
        daysActive: Number(daysRaw[1] ?? 1),
        memorizeCount: memorizeRaw[1] ? JSON.parse(memorizeRaw[1]).length : 0,
        reflectionsCompleted: Number(reflectionsRaw[1] ?? 0),
        mapLocationsVisited: await getVisitedMapLocationCount(),
      });
    } catch (e) {
      console.error('stats load error:', e);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxWeekly = Math.max(1, ...weeklyData.map((d) => d.count));
  const maxBook = Math.max(1, ...topBooks.map((b) => b.count));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => safeBack()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('goBackA11y')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.regular }]}>{t('statistics')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.regular }]}>{t('statsSummary')}</Text>
          <View style={styles.grid}>
            <View style={[styles.gridCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.gridValue, { color: ACCENT, fontFamily: fonts.regular }]}>{summary.totalVersesRead}</Text>
              <Text style={[styles.gridLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {t('statsTotalVersesRead')}
              </Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.gridValue, { color: ACCENT, fontFamily: fonts.regular }]}>{summary.totalChaptersRead}</Text>
              <Text style={[styles.gridLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {t('statsTotalChaptersRead')}
              </Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.gridValue, { color: ACCENT, fontFamily: fonts.regular }]}>{summary.longestStreak}</Text>
              <Text style={[styles.gridLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {t('longestStreak')}
              </Text>
            </View>
            <View style={[styles.gridCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.gridValue, { color: ACCENT, fontFamily: fonts.regular }]}>{summary.totalNotes}</Text>
              <Text style={[styles.gridLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {t('statsTotalNotesCount')}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.regular }]}>
            {t('statsWeeklyActivity')}
          </Text>
          <FlatList
            horizontal
            data={weeklyData}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.weeklyList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const barHeight = 20 + (item.count / maxWeekly) * 84;
              return (
                <View style={styles.weeklyCol}>
                  <View
                    style={[
                      styles.weeklyBar,
                      {
                        height: barHeight,
                        backgroundColor: item.isToday ? ACCENT : `${ACCENT}40`,
                      },
                    ]}
                  />
                  <Text style={[styles.weeklyLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                    {item.label}
                  </Text>
                </View>
              );
            }}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.regular }]}>{t('statsTopBooks')}</Text>
          {topBooks.length === 0 ? (
            <Text style={[styles.placeholder, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {t('statsNoDataYet')}
            </Text>
          ) : (
            topBooks.map((b) => (
              <View key={b.book} style={styles.bookWrap}>
                <View style={styles.bookRow}>
                  <Text style={[styles.bookName, { color: colors.text, fontFamily: fonts.regular }]}>{b.book}</Text>
                  <Text style={[styles.bookCount, { color: ACCENT, fontFamily: fonts.regular }]}>{b.count}</Text>
                </View>
                <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(b.count / maxBook) * 100}%`, backgroundColor: ACCENT },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.regular }]}>
            {t('statsBadgeProgress')}
          </Text>
          {ALL_BADGES.map((badge) => {
            const prog = computeBadgeProgress(badge, badgeStats);
            const pct = Math.max(0, Math.min(100, Math.round((prog.current / prog.target) * 100)));
            return (
              <View key={badge.id} style={styles.badgeRow}>
                <View style={styles.badgeTop}>
                  <View style={styles.badgeTitleWrap}>
                    <Ionicons
                      name={prog.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={prog.done ? '#4CAF50' : colors.textSecondary}
                    />
                    <Text style={[styles.badgeName, { color: colors.text, fontFamily: fonts.regular }]}>
                      {badge.name}
                    </Text>
                  </View>
                  <Text style={[styles.badgeMeta, { color: prog.done ? '#4CAF50' : colors.textSecondary, fontFamily: fonts.regular }]}>
                    {prog.done ? t('statsBadgeCompleted') : `${prog.current}/${prog.target}`}
                  </Text>
                </View>
                <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: prog.done ? '#4CAF50' : ACCENT }]} />
                </View>
              </View>
            );
          })}
          <View style={[styles.exampleRow, { borderColor: colors.border }]}>
            <Text style={[styles.exampleText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {t('statsExampleFirstStep')}
            </Text>
            <Text style={[styles.exampleText, { color: '#4CAF50', fontFamily: fonts.regular }]}>
              {' '}
              {t('statsBadgeCompleted')}
            </Text>
          </View>
          <View style={styles.exampleRow}>
            <Text style={[styles.exampleText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {t('statsExampleSevenDay')}
            </Text>
            <Text style={[styles.exampleText, { color: ACCENT, fontFamily: fonts.regular }]}>
              {' '}
              {t('statsExampleDaysOfSeven', { n: Math.min(summary.longestStreak, 7) })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 24,
  },
  headerRight: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 14,
  },
  weeklyList: {
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 8,
  },
  weeklyCol: {
    alignItems: 'center',
    width: 32,
  },
  weeklyBar: {
    width: 32,
    borderRadius: 4,
  },
  weeklyLabel: {
    fontSize: 11,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridCard: {
    width: '48%',
    borderRadius: 10,
    padding: 14,
  },
  gridValue: {
    fontSize: 22,
  },
  gridLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  bookWrap: {
    marginBottom: 12,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bookName: {
    fontSize: 14,
  },
  bookCount: {
    fontSize: 13,
  },
  progressBg: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 4,
  },
  badgeRow: {
    marginBottom: 12,
  },
  badgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badgeName: {
    fontSize: 13,
  },
  badgeMeta: {
    fontSize: 12,
    marginLeft: 8,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0,
  },
  exampleText: {
    fontSize: 12,
  },
  placeholder: {
    fontSize: 14,
  },
});

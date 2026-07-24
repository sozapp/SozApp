import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SozAlert } from '@/components/SozAlert';
import type { Language } from '@/constants/i18n';
import { newTestament } from '@/constants/new-testament';
import { useTranslation } from '@/context/LanguageContext';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useTheme } from '@/hooks/useTheme';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';
const STORAGE_KEY = '@soz/readingHistory';

const LOCALE_MAP: Record<Language, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  ku: 'ku',
  hy: 'hy-AM',
  el: 'el-GR',
  ar: 'ar',
};

type ReadingHistoryItem = {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  readAt: string;
  duration?: number;
};

type SectionKey = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

type FlatRow =
  | { type: 'header'; id: string; section: SectionKey }
  | { type: 'item'; id: string; item: ReadingHistoryItem };

const SECTION_ORDER: SectionKey[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

function sectionKeyForDate(date: Date): SectionKey {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);

  if (date >= startToday) return 'today';
  if (date >= startYesterday) return 'yesterday';
  if (date >= startWeek) return 'thisWeek';
  return 'earlier';
}

function formatReadTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBookChapterTotal(bookName: string): number {
  return newTestament.find((b) => b.name === bookName)?.chapters?.length ?? 0;
}

export default function ReadingHistoryScreen() {
  const router = useRouter();
  const safeBack = useSafeBack();
  const { t, language } = useTranslation();
  const { colors, fonts } = useTheme();
  const textSecondary = colors.textSecondary ?? colors.textMuted ?? '#999';
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const dateLocale = LOCALE_MAP[language] ?? 'tr-TR';

  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ReadingHistoryItem[]) : [];
      const sorted = [...parsed].sort(
        (a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime()
      );
      setHistory(sorted);
    } catch {
      setHistory([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const summary = useMemo(() => {
    const totalRead = history.length;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = history.filter((h) => new Date(h.readAt) >= weekAgo).length;
    const counts: Record<string, number> = {};
    for (const h of history) counts[h.book] = (counts[h.book] ?? 0) + 1;
    const topBook =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

    return { totalRead, thisWeek, topBook };
  }, [history]);

  const rows = useMemo<FlatRow[]>(() => {
    const grouped: Record<SectionKey, ReadingHistoryItem[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const item of history) {
      const key = sectionKeyForDate(new Date(item.readAt));
      grouped[key].push(item);
    }

    const result: FlatRow[] = [];
    for (const key of SECTION_ORDER) {
      const items = grouped[key];
      if (!items.length) continue;
      result.push({ type: 'header', id: `header-${key}`, section: key });
      for (const item of items) {
        result.push({ type: 'item', id: item.id, item });
      }
    }
    return result;
  }, [history]);

  const clearHistory = useCallback(() => {
    showAlert(t('clearHistoryConfirmTitle'), t('clearHistoryConfirmMsg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('clearShort'),
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setHistory([]);
        },
      },
    ]);
  }, [showAlert, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        title: { fontSize: 20, color: colors.text, fontFamily: fonts.regular },
        clearBtn: { color: '#E57373', fontSize: 14, fontFamily: fonts.regular },
        summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
        summaryCard: {
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 12,
          alignItems: 'center',
        },
        summaryValue: { fontSize: 22, color: ACCENT, fontFamily: fonts.regular },
        summaryLabel: { fontSize: 11, color: textSecondary, marginTop: 4, textAlign: 'center' },
        listHeader: {
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        listTitle: { fontSize: 16, color: colors.text, fontFamily: fonts.regular },
        listCount: { fontSize: 12, color: textSecondary, fontFamily: fonts.regular },
        sectionHeader: {
          fontSize: 12,
          color: textSecondary,
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: colors.background,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        itemCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 14,
          padding: 14,
          gap: 12,
        },
        iconBox: {
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: `${ACCENT}20`,
          alignItems: 'center',
          justifyContent: 'center',
        },
        itemBody: { flex: 1 },
        itemBook: { fontSize: 16, color: colors.text, fontFamily: fonts.regular },
        itemChapter: { fontSize: 13, color: textSecondary, marginTop: 2 },
        itemDate: { fontSize: 11, color: textSecondary, marginTop: 4 },
        emptyWrap: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: 80,
        },
        emptyTitle: { marginTop: 14, fontSize: 17, color: colors.text, fontFamily: fonts.regular },
        emptySub: { marginTop: 8, fontSize: 13, color: textSecondary, textAlign: 'center' },
      }),
    [colors, fonts, textSecondary]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => safeBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('goBackA11y')}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t('readingHistoryTitle')}</Text>
        </View>
        <Pressable onPress={clearHistory} hitSlop={10}>
          <Text style={styles.clearBtn}>{t('clearShort')}</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="book-outline" size={18} color={ACCENT} />
          <Text style={styles.summaryValue}>{summary.totalRead}</Text>
          <Text style={styles.summaryLabel}>{t('totalChaptersLabel')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="calendar-outline" size={18} color={ACCENT} />
          <Text style={styles.summaryValue}>{summary.thisWeek}</Text>
          <Text style={styles.summaryLabel}>{t('thisWeekLabel')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="star-outline" size={18} color={ACCENT} />
          <Text style={styles.summaryValue} numberOfLines={1}>
            {summary.topBook}
          </Text>
          <Text style={styles.summaryLabel}>{t('mostReadLabel')}</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{t('recentlyRead')}</Text>
        <Text style={styles.listCount}>{t('recordsCount', { n: history.length })}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionHeader}>{t(item.section)}</Text>;
          }

          const row = item.item;
          const total = getBookChapterTotal(row.book);
          const left = total > 0 ? Math.max(0, total - row.chapter) : null;

          return (
            <Pressable
              style={styles.itemCard}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/read',
                  params: { book: row.book, chapter: String(row.chapter) },
                })
              }
            >
              <View style={styles.iconBox}>
                <Ionicons name="book-outline" size={22} color={ACCENT} />
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemBook}>{row.book}</Text>
                <Text style={styles.itemChapter}>
                  {left != null
                    ? t('chapterWithLeft', { chapter: row.chapter, left })
                    : t('chapterOrdinalLabel', { n: row.chapter })}
                </Text>
                <Text style={styles.itemDate}>{formatReadTime(row.readAt, dateLocale)}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.border} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="time-outline" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>{t('noReadingHistoryYet')}</Text>
            <Text style={styles.emptySub}>{t('noReadingHistoryDesc')}</Text>
          </View>
        }
      />
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
}

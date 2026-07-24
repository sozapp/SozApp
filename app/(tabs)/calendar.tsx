import {
  parseBibleRefToReadParams,
  type CalendarEvent,
} from '@/constants/church-calendar';
import { denominations } from '@/constants/denominations';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useDenomination } from '@/hooks/useDenomination';
import { useHaptics } from '@/hooks/useHaptics';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useTheme } from '@/hooks/useTheme';
import type { TranslationKey } from '@/constants/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const GRID_W = Dimensions.get('window').width - 32;
const CELL_W = GRID_W / 7;
import { SafeAreaView } from 'react-native-safe-area-context';

const MONTH_KEYS: TranslationKey[] = [
  'monthJan', 'monthFeb', 'monthMar', 'monthApr', 'monthMay', 'monthJun',
  'monthJul', 'monthAug', 'monthSep', 'monthOct', 'monthNov', 'monthDec',
];

const WEEKDAY_KEYS: TranslationKey[] = [
  'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun',
];

const ACCENT = '#C4956A';

function typeIconName(type: CalendarEvent['type']): keyof typeof Ionicons.glyphMap {
  if (type === 'feast') return 'star-outline';
  if (type === 'fast') return 'leaf-outline';
  if (type === 'saint') return 'person-outline';
  return 'sunny-outline';
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function firstWeekdayMonday0(year: number, monthIndex: number): number {
  const d = new Date(year, monthIndex, 1).getDay();
  return (d + 6) % 7;
}

export default function ChurchCalendarScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const {
    denomination,
    refreshDenomination,
    getEventsForDate,
    getMonthEvents,
    getTodayEvents,
  } = useDenomination();

  const months = useMemo(() => MONTH_KEYS.map((k) => t(k)), [t]);
  const weekdays = useMemo(() => WEEKDAY_KEYS.map((k) => t(k)), [t]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

  useFocusEffect(
    useCallback(() => {
      try {
        refreshDenomination();
      } catch {
        /* ignore */
      }
    }, [refreshDenomination])
  );

  const denomMeta = useMemo(
    () => denominations.find((d) => d.id === denomination) ?? denominations[5],
    [denomination]
  );

  const isViewingCurrentMonth =
    viewYear === now.getFullYear() && viewMonthIndex === now.getMonth();

  useEffect(() => {
    const today = new Date();
    const cur =
      today.getFullYear() === viewYear && today.getMonth() === viewMonthIndex;
    if (cur) setSelectedDay(today.getDate());
    else setSelectedDay(1);
  }, [viewYear, viewMonthIndex]);

  const monthEvents = useMemo(
    () => getMonthEvents(viewMonthIndex + 1),
    [getMonthEvents, viewMonthIndex]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const ev of monthEvents) {
      const day = parseInt(ev.date.split('-')[1] ?? '0', 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(ev);
    }
    return map;
  }, [monthEvents]);

  const selectedEvents = useMemo(() => {
    if (selectedDay == null) return monthEvents;
    return getEventsForDate(viewMonthIndex + 1, selectedDay);
  }, [selectedDay, viewMonthIndex, getEventsForDate, monthEvents]);

  const todayEvents = useMemo(() => {
    try {
      return getTodayEvents();
    } catch {
      return [];
    }
  }, [getTodayEvents, denomination]);

  const goPrevMonth = useCallback(() => {
    try {
      haptics.selection();
      if (viewMonthIndex === 0) {
        setViewMonthIndex(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonthIndex((m) => m - 1);
      }
    } catch {
      /* ignore */
    }
  }, [viewMonthIndex, haptics]);

  const goNextMonth = useCallback(() => {
    try {
      haptics.selection();
      if (viewMonthIndex === 11) {
        setViewMonthIndex(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonthIndex((m) => m + 1);
      }
    } catch {
      /* ignore */
    }
  }, [viewMonthIndex, haptics]);

  const onBiblePress = useCallback(
    (ref: string) => {
      try {
        haptics.light();
        const p = parseBibleRefToReadParams(ref);
        if (p) {
          router.push({
            pathname: '/(tabs)/read',
            params: { bookId: p.bookId, chapter: p.chapter },
          });
        }
      } catch {
        /* ignore */
      }
    },
    [router, haptics]
  );

  const dim = daysInMonth(viewYear, viewMonthIndex);
  const startPad = firstWeekdayMonday0(viewYear, viewMonthIndex);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const bg = theme.background ?? '#0A0A08';
  const surface = theme.surface ?? '#1A1612';
  const text = theme.text ?? '#E8E0D0';
  const muted = theme.textMuted ?? 'rgba(232,224,208,0.5)';
  const swipeBack = useSwipeBack();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.flex1} {...swipeBack}>
      <View style={[styles.header, { borderBottomColor: muted }]}>
        <Text style={[styles.title, { color: text }]}>{t('churchCalendarTitle')}</Text>
        <View
          style={[
            styles.denomBadge,
            { borderColor: ACCENT, backgroundColor: 'rgba(196,149,80,0.08)' },
          ]}
        >
          <View style={styles.denomBadgeIconWrap}>
            <Ionicons name={denomMeta.icon as keyof typeof Ionicons.glyphMap} size={12} color={ACCENT} />
          </View>
          <Text style={[styles.denomBadgeText, { color: text }]}>{denomMeta.name}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {todayEvents.length > 0 && isViewingCurrentMonth && (
          <View
            style={[
              styles.todayHighlight,
              { borderColor: ACCENT, backgroundColor: 'rgba(196,149,80,0.1)' },
            ]}
          >
            <Text style={[styles.todayHighlightLabel, { color: ACCENT }]}>
              {t('todayColon')} {todayEvents[0].name}
            </Text>
            {todayEvents.length > 1 && (
              <Text style={[styles.todayHighlightMore, { color: muted }]}>
                {t('moreEventsCount', { n: todayEvents.length - 1 })}
              </Text>
            )}
            <Text style={[styles.todayHighlightDesc, { color: text }]}>
              {todayEvents[0].description}
            </Text>
          </View>
        )}

        <View style={[styles.monthNav, { backgroundColor: surface }]}>
          <Pressable
            onPress={goPrevMonth}
            style={styles.monthNavBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('prevMonthA11y')}
          >
            <Ionicons name="chevron-back" size={24} color={ACCENT} />
          </Pressable>
          <Text style={[styles.monthNavTitle, { color: text }]}>
            {months[viewMonthIndex]} {viewYear}
          </Text>
          <Pressable
            onPress={goNextMonth}
            style={styles.monthNavBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('nextMonthA11y')}
          >
            <Ionicons name="chevron-forward" size={24} color={ACCENT} />
          </Pressable>
        </View>

        <View style={[styles.weekRow, { width: GRID_W }]}>
          {weekdays.map((w) => (
            <View key={w} style={{ width: CELL_W, alignItems: 'center' }}>
              <Text style={[styles.weekdayCell, { color: muted }]}>{w}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.grid, { width: GRID_W }]}>
          {cells.map((day, idx) => {
            if (day == null) {
              return <View key={`e-${idx}`} style={{ width: CELL_W, height: 48 }} />;
            }
            const evs = eventsByDay.get(day) ?? [];
            const isToday =
              isViewingCurrentMonth && day === now.getDate();
            const isSel = selectedDay === day;
            return (
              <Pressable
                key={day}
                style={[
                  { width: CELL_W, height: 48, alignItems: 'center', justifyContent: 'center' },
                  isToday && { backgroundColor: 'rgba(196,149,80,0.2)', borderRadius: 20 },
                  isSel && !isToday && { backgroundColor: 'rgba(196,149,80,0.08)', borderRadius: 20 },
                ]}
                onPress={() => {
                  try {
                    haptics.selection();
                    setSelectedDay(day);
                  } catch {
                    setSelectedDay(day);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: isToday ? ACCENT : text },
                    isToday && styles.dayNumToday,
                  ]}
                >
                  {day}
                </Text>
                <View style={styles.dotsRow}>
                  {evs.slice(0, 3).map((ev) => (
                    <View
                      key={ev.id}
                      style={[styles.eventDot, { backgroundColor: ev.color }]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.listTitle, { color: muted }]}>
          {selectedDay != null
            ? t('dayEventsTitle', { day: selectedDay, month: months[viewMonthIndex] })
            : t('thisMonth')}
        </Text>

        {selectedEvents.length === 0 ? (
          <Text style={[styles.emptyMonth, { color: muted }]}>
            {monthEvents.length === 0
              ? t('noEventsThisMonth')
              : t('noEventsThisDay')}
          </Text>
        ) : (
          selectedEvents.map((ev) => (
            <View
              key={ev.id}
              style={[styles.eventCard, { backgroundColor: surface, borderLeftColor: ev.color }]}
            >
              <Ionicons name={typeIconName(ev.type)} size={20} color={ACCENT} style={styles.eventTypeIcon} />
              <View style={styles.eventCardBody}>
                <Text style={[styles.eventName, { color: text }]}>{ev.name}</Text>
                <Text style={[styles.eventDesc, { color: muted }]}>{ev.description}</Text>
{ev.bibleRef ? (
                  <Pressable onPress={() => onBiblePress(ev.bibleRef!)} style={styles.bibleLinkRow}>
                    <Ionicons name="book-outline" size={16} color={ACCENT} />
                    <Text style={[styles.bibleLink, { color: ACCENT }]}>{ev.bibleRef}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={[styles.eventDateSide, { color: muted }]}>
                {ev.date.replace('-', '.')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 26,
    marginBottom: 10,
  },
  denomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  denomBadgeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(196,149,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  denomBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  todayHighlight: {
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  todayHighlightLabel: {
    fontFamily: fonts.medium,
    fontSize: 17,
    marginBottom: 4,
  },
  todayHighlightMore: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 8,
  },
  todayHighlightDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  monthNavBtn: { padding: 8 },
  monthNavTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignSelf: 'center',
  },
  weekdayCell: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 11,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    alignSelf: 'center',
  },
  dayNum: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  dayNumToday: {
    fontFamily: fonts.medium,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 5,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  listTitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyMonth: {
    fontFamily: fonts.italic,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    alignItems: 'flex-start',
  },
  eventTypeIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  eventCardBody: { flex: 1 },
  eventName: {
    fontFamily: fonts.medium,
    fontSize: 16,
    marginBottom: 4,
  },
  eventDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  bibleLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bibleLink: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  eventDateSide: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginLeft: 8,
  },
});

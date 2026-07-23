import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { CalendarEvent } from '@/constants/church-calendar';
import {
  calendarEvents,
  eventMatchesDenomination,
  getTodayCalendarEvents,
} from '@/constants/church-calendar';
import type { Denomination } from '@/constants/denominations';

const STORAGE_KEY_LEGACY = '@soz/denomination';
const USER_CHURCH_KEY = '@soz/userChurch';

const VALID: Denomination[] = [
  'orthodox',
  'catholic',
  'protestant',
  'armenian',
  'syriac',
  'other',
];

export function useDenomination() {
  const [denomination, setDenomination] = useState<Denomination>('other');

  const loadFromStorage = useCallback(async () => {
    try {
      const d =
        (await AsyncStorage.getItem(USER_CHURCH_KEY)) ??
        (await AsyncStorage.getItem(STORAGE_KEY_LEGACY));
      if (d && VALID.includes(d as Denomination)) {
        setDenomination(d as Denomination);
      }
    } catch (e) {
      console.warn('[Denomination] loadFromStorage failed:', e);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const changeDenomination = useCallback(async (d: Denomination) => {
    try {
      setDenomination(d);
      await AsyncStorage.multiSet([
        [USER_CHURCH_KEY, d],
        [STORAGE_KEY_LEGACY, d],
      ]);
    } catch (e) {
      console.warn('[Denomination] changeDenomination failed:', e);
    }
  }, []);

  const getTodayEvents = useCallback((): CalendarEvent[] => {
    try {
      return getTodayCalendarEvents(denomination);
    } catch (e) {
      console.warn('[Denomination] getTodayEvents failed:', e);
      return [];
    }
  }, [denomination]);

  const getMonthEvents = useCallback(
    (month: number, year?: number): CalendarEvent[] => {
      try {
        const mm = String(month).padStart(2, '0');
        return calendarEvents.filter((event) => {
          if (!event.date.startsWith(`${mm}-`)) return false;
          if (year != null) {
            const y = event.id.match(/(\d{4})/);
            if (y && parseInt(y[1], 10) !== year) {
              /* year-specific ids like paskalya-2026 */
            }
          }
          return eventMatchesDenomination(event, denomination);
        });
      } catch (e) {
        console.warn('[Denomination] getMonthEvents failed:', e);
        return [];
      }
    },
    [denomination]
  );

  const getEventsForDate = useCallback(
    (month: number, day: number): CalendarEvent[] => {
      try {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateStr = `${mm}-${dd}`;
        return calendarEvents.filter(
          (event) =>
            event.date === dateStr &&
            eventMatchesDenomination(event, denomination)
        );
      } catch (e) {
        console.warn('[Denomination] getEventsForDate failed:', e);
        return [];
      }
    },
    [denomination]
  );

  return {
    denomination,
    changeDenomination,
    refreshDenomination: loadFromStorage,
    getTodayEvents,
    getMonthEvents,
    getEventsForDate,
  };
}

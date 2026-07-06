import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TODAY = '@soz/stats/today';
const KEY_DAILY = '@soz/stats/daily';
const KEY_BOOKS = '@soz/stats/books';

export type TodayStats = {
  date: string;
  verseIds: string[];
  minutes: number;
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayStats(): Promise<TodayStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TODAY);
    if (raw == null) return { date: todayString(), verseIds: [], minutes: 0 };
    const data = JSON.parse(raw) as TodayStats;
    if (data.date !== todayString()) return { date: todayString(), verseIds: [], minutes: 0 };
    return data;
  } catch (_) {
    return { date: todayString(), verseIds: [], minutes: 0 };
  }
}

export async function recordVerseViews(newVerseIds: string[], bookId: string): Promise<void> {
  const today = todayString();
  const todayData = await getTodayStats();
  const existing = new Set(todayData.verseIds);
  const toAdd = newVerseIds.filter((id) => !existing.has(id));
  if (toAdd.length === 0) return;

  const updatedVerseIds = [...todayData.verseIds, ...toAdd];
  await AsyncStorage.setItem(
    KEY_TODAY,
    JSON.stringify({ date: today, verseIds: updatedVerseIds, minutes: todayData.minutes })
  );

  try {
    const dailyRaw = await AsyncStorage.getItem(KEY_DAILY);
    const daily = (dailyRaw != null ? JSON.parse(dailyRaw) : {}) as Record<string, number>;
    daily[today] = (daily[today] ?? 0) + toAdd.length;
    await AsyncStorage.setItem(KEY_DAILY, JSON.stringify(daily));

    const booksRaw = await AsyncStorage.getItem(KEY_BOOKS);
    const books = (booksRaw != null ? JSON.parse(booksRaw) : {}) as Record<string, number>;
    books[bookId] = (books[bookId] ?? 0) + toAdd.length;
    await AsyncStorage.setItem(KEY_BOOKS, JSON.stringify(books));
  } catch (_) {}
}

export async function getDailyStats(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DAILY);
    if (raw == null) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch (_) {
    return {};
  }
}

export async function getBooksStats(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BOOKS);
    if (raw == null) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch (_) {
    return {};
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@soz/watch-favorites';

export async function getWatchFavoriteIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function toggleWatchFavoriteId(id: string): Promise<boolean> {
  const ids = await getWatchFavoriteIds();
  const has = ids.includes(id);
  const next = has ? ids.filter((x) => x !== id) : [...ids, id];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return !has;
}

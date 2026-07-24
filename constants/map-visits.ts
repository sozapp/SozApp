import AsyncStorage from '@react-native-async-storage/async-storage';

import { locations } from '@/constants/map-locations';

const STORAGE_KEY = '@soz/mapVisited';

const KNOWN_LOCATION_IDS = new Set(locations.map((l) => l.id));

/** Kullanıcının haritada açtığı / incelediği kutsal yer id'leri. */
export async function getVisitedLocationIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/** Bilinen harita konumlarından kaçının ziyaret edildiği (0 … locations.length). */
export async function getVisitedMapLocationCount(): Promise<number> {
  const ids = await getVisitedLocationIds();
  let n = 0;
  for (const id of ids) {
    if (KNOWN_LOCATION_IDS.has(id)) n += 1;
  }
  return Math.min(n, locations.length);
}

export async function markLocationVisited(locationId: string): Promise<void> {
  try {
    const ids = await getVisitedLocationIds();
    if (ids.includes(locationId)) return;
    ids.push(locationId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

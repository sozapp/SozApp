import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_MEMORIZE_LIST = '@soz/memorizeList';
const STORAGE_MEMORIZED_VERSES = '@soz/memorizedVerses';

export type MemorizeListItem = {
  verseId: string;
  ref: string;
  text: string;
};

export async function getMemorizeList(): Promise<MemorizeListItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_MEMORIZE_LIST);
    if (raw == null) return [];
    return JSON.parse(raw) as MemorizeListItem[];
  } catch {
    return [];
  }
}

export async function addToMemorizeList(item: MemorizeListItem): Promise<void> {
  const list = await getMemorizeList();
  if (list.some((x) => x.verseId === item.verseId)) return;
  list.push(item);
  await AsyncStorage.setItem(STORAGE_MEMORIZE_LIST, JSON.stringify(list));
}

export async function removeFromMemorizeList(verseId: string): Promise<void> {
  const list = (await getMemorizeList()).filter((x) => x.verseId !== verseId);
  await AsyncStorage.setItem(STORAGE_MEMORIZE_LIST, JSON.stringify(list));
}

export async function getMemorizedVerseIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_MEMORIZED_VERSES);
    if (raw == null) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function addMemorizedVerseId(verseId: string): Promise<void> {
  const ids = await getMemorizedVerseIds();
  if (ids.includes(verseId)) return;
  ids.push(verseId);
  await AsyncStorage.setItem(STORAGE_MEMORIZED_VERSES, JSON.stringify(ids));
}

export async function getMemorizedCount(): Promise<number> {
  const ids = await getMemorizedVerseIds();
  return ids.length;
}

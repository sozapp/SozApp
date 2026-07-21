import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const BACKUP_KEYS = [
  '@soz/notes',
  '@soz/favorites',
  '@soz/highlights',
  '@soz/streak',
  '@soz/planProgress',
  '@soz/memorizeList',
  '@soz/memorizeProgress',
  '@soz/userProfile',
  '@soz/userChurch',
  '@soz/userName',
  '@soz/language',
  '@soz/bibleVersion',
  '@soz/readingTheme',
  '@soz/earnedBadges',
];

export const exportBackup = async (): Promise<void> => {
  try {
    const pairs = await AsyncStorage.multiGet(BACKUP_KEYS);
    const data: Record<string, unknown> = {};

    pairs.forEach(([key, value]) => {
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      app: 'Söz — Türkçe İncil',
      data,
    };

    const fileName = `soz-yedek-${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2));
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Söz Yedeğini Kaydet',
    });
  } catch (e) {
    console.error('Backup error:', e);
    throw e;
  }
};

export const importBackup = async (fileUri: string): Promise<void> => {
  try {
    const content = await FileSystem.readAsStringAsync(fileUri);
    const backup = JSON.parse(content);

    if (!backup.data || backup.app !== 'Söz — Türkçe İncil') {
      throw new Error('Geçersiz yedek dosyası');
    }

    const pairs: [string, string][] = Object.entries(backup.data).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]);

    await AsyncStorage.multiSet(pairs);
  } catch (e) {
    console.error('Restore error:', e);
    throw e;
  }
};

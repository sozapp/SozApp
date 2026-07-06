import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleDailyVerseNotification = async (hour: number = 8) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const verses = [
    { text: 'Her seyi bana guc veren Mesih araciligiyla yapabilirim.', ref: 'Filipililer 4:13' },
    { text: 'RAB benim cobanim, hicbir seyim eksik olmaz.', ref: 'Mezmur 23:1' },
    { text: 'Tanri dunyayi o kadar cok sevdi ki biricik Oglunu verdi.', ref: 'Yuhanna 3:16' },
    { text: 'Sevgi sabirlidir, sevgi sefkatlidir.', ref: '1. Korintliler 13:4' },
    { text: 'Baslangicta Soz vardi.', ref: 'Yuhanna 1:1' },
    { text: 'Ben yol, gercek ve yasamim.', ref: 'Yuhanna 14:6' },
    { text: 'Her sey icin sukredin.', ref: '1. Selanikliler 5:18' },
  ];

  const dayOfWeek = new Date().getDay();
  const verse = verses[dayOfWeek % verses.length];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📖 Gunun Ayeti',
      body: `"${verse.text}" — ${verse.ref}`,
      sound: true,
      data: { type: 'daily_verse' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });

  await AsyncStorage.setItem('@soz/dailyNotificationHour', String(hour)).catch(() => {});
};

export const scheduleDailyVerse = async (hour: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Söz',
      body: 'Günlük ayetin seni bekliyor ✦',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
};

export const scheduleStreakReminder = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Serin devam ediyor 🔥',
      body: 'Bugün okumayı unutma!',
      sound: true,
      data: { type: 'streak_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
};

export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

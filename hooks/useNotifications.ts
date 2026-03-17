import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_REMINDER_ID = 'soz-daily-reminder';

export async function registerForPushNotifications(): Promise<boolean> {
  if (!Device.isDevice) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('soz-reminders', {
      name: 'Hatırlatıcılar',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Günlük okuman seni bekliyor 📖',
      body: 'Söz ile bugünkü ayetini oku',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/constants/supabase';

const DAILY_REMINDER_ID = 'soz-daily-reminder';

const MORNING_MESSAGES = [
  { title: 'Günaydın!', body: 'Bugünkü ayetiniz hazır: Yuhanna 3:16' },
  { title: 'Yeni bir gün', body: 'Söz ile güne başla: Filipililere 4:13' },
  { title: 'Bugün için bir söz', body: 'Mezmur 23:1 seni bekliyor' },
  { title: 'Günlük okuman hazır', body: "3 dakikan varsa İncil'i aç" },
  { title: 'Sabah bereketi', body: 'Bugün kaldığın yerden devam et' },
];

function getDayOfYear(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

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

/**
 * Expo push token alıp profiles.push_token'a yazar.
 * İzin yok / simülatör / hata → sessizce no-op (mesajlaşma etkilenmez).
 */
export async function registerPushTokenForUser(userId: string): Promise<void> {
  if (!userId || !supabase || !Device.isDevice) return;
  try {
    const granted = await registerForPushNotifications();
    if (!granted) return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId ?? undefined;
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult.data?.trim();
    if (!token) return;

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
    if (error) console.warn('[Push] save token failed:', error.message);
  } catch (e) {
    console.warn('[Push] registerPushTokenForUser:', e);
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const dayOfYear = getDayOfYear();
  const msg = MORNING_MESSAGES[dayOfYear % MORNING_MESSAGES.length];

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: msg.title,
      body: msg.body,
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

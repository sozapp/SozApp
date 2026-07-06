import { useEffect } from 'react';
import { router } from 'expo-router';

export default function NotificationSettingsScreen() {
  useEffect(() => {
    // Bu ekran artık kullanılmıyor — bildirimler profil içinde
    router.replace('/(tabs)/profile');
  }, []);
  return null;
}

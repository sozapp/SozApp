import { useEffect } from 'react';
import { router } from 'expo-router';

export default function NotificationsScreen() {
  useEffect(() => {
    // Bu ekran artık kullanılmıyor
    // Profil ekranına yönlendir
    router.replace('/(tabs)/profile');
  }, []);
  return null;
}

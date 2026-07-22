import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';

/**
 * router.back() tek başına, geri gidilecek bir ekran yoksa (örn. deep link
 * ile doğrudan bu ekrana girildiyse) "GO_BACK action was not handled by any
 * navigator" hatasıyla çöküyor. Bu hook aynı imzayı korur ama önce
 * canGoBack() kontrolü yapıp yoksa ana sekmelere döner.
 */
export function useSafeBack(fallback: Href = '/(tabs)') {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [router, fallback]);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

const STORAGE_ANALYTICS_ENABLED = '@soz/analyticsEnabled';

let client: PostHog | null = null;
let enabled = true;

/**
 * Ürün analitiği (PostHog) — Sentry'nin tersine crash değil, kullanım/davranış
 * ölçer. EXPO_PUBLIC_POSTHOG_API_KEY boşsa (yerel geliştirme / henüz hesap
 * açılmadıysa) initSentry() ile aynı desende sessizce hiçbir şey yapmaz.
 * Kullanıcı profil ayarlarından tamamen kapatabilir (getAnalyticsEnabled /
 * setAnalyticsEnabled) — kapatıldığında hem yeni event gönderimi durur hem
 * de mevcut PostHog kişisi opt-out işaretlenir.
 */
export async function initAnalytics(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_ANALYTICS_ENABLED);
    enabled = stored !== 'false';
  } catch {
    enabled = true;
  }

  if (!apiKey) {
    if (__DEV__) {
      console.log('[Analytics] EXPO_PUBLIC_POSTHOG_API_KEY tanımlı değil — analitik devre dışı.');
    }
    return;
  }

  try {
    client = new PostHog(apiKey, {
      host,
      captureAppLifecycleEvents: true,
    });
    // optIn/optOut PostHog tarafında kalıcı — kullanıcı daha önce kapattıysa
    // her açılışta tekrar uygula (ilk kurulumda defaultOptIn zaten true).
    if (!enabled) {
      await client.optOut();
    }
  } catch (e) {
    console.warn('[Analytics] PostHog init failed:', e);
    client = null;
  }
}

export async function getAnalyticsEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_ANALYTICS_ENABLED);
    return stored !== 'false';
  } catch {
    return true;
  }
}

export async function setAnalyticsEnabled(value: boolean): Promise<void> {
  enabled = value;
  try {
    await AsyncStorage.setItem(STORAGE_ANALYTICS_ENABLED, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
  if (!client) return;
  try {
    if (value) {
      await client.optIn();
    } else {
      await client.optOut();
    }
  } catch {
    /* ignore */
  }
}

/** Ekran görüntülenmesi — hooks/useAnalyticsScreen.ts üzerinden çağrılır. */
export function trackScreen(screenName: string): void {
  if (!client || !enabled) return;
  try {
    client.screen(screenName);
  } catch {
    /* ignore */
  }
}

/** Genel amaçlı event — key her zaman snake_case (PostHog kuralı). */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  if (!client || !enabled) return;
  try {
    client.capture(name, properties);
  } catch {
    /* ignore */
  }
}

/** Giriş yapınca çağrılır — event'leri kullanıcıya bağlar. */
export function identifyAnalyticsUser(userId: string): void {
  if (!client || !enabled) return;
  try {
    client.identify(userId);
  } catch {
    /* ignore */
  }
}

/** Çıkış yapınca çağrılır — sonraki event'ler yeni/anonim bir kullanıcıya düşsün. */
export function resetAnalyticsUser(): void {
  if (!client) return;
  try {
    client.reset();
  } catch {
    /* ignore */
  }
}

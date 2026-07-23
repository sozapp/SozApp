import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Crash/error reporting — sadece EAS build / development build'de gerçek bir
 * transport'a sahiptir (native modül gerektirir). Expo Go'da native modül
 * bulunmadığı için `init` çağrısı bazı ortamlarda hata fırlatabilir; bu yüzden
 * try/catch ile sarılı ve DSN tanımlı değilse (yerel geliştirme / .env boşsa)
 * hiçbir şey yapmadan sessizce çıkar.
 */
export function initSentry(): void {
  if (!dsn) {
    if (__DEV__) {
      console.log('[Sentry] EXPO_PUBLIC_SENTRY_DSN tanımlı değil — crash reporting devre dışı.');
    }
    return;
  }
  try {
    Sentry.init({
      dsn,
      debug: __DEV__,
      enableNative: true,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    });
  } catch (e) {
    console.warn('[Sentry] init failed (Expo Go üzerinde native modül yoksa beklenen bir durumdur):', e);
  }
}

/** hooks/*.ts içindeki sessiz catch bloklarından production'da da haberimiz olsun diye çağrılır. */
export function reportError(context: string, e: unknown): void {
  if (!dsn) return;
  try {
    Sentry.captureException(e, { tags: { context } });
  } catch {
    /* Sentry native modülü yoksa (örn. Expo Go) sessizce yut */
  }
}

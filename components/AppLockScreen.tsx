import { SozLogo } from '@/components/SozLogo';
import { fonts } from '@/constants/theme';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';

const ACCENT = '#C4956A';

export type AppLockScreenProps = {
  visible: boolean;
  unlockLabel: string;
  hintLabel: string;
  onUnlocked: () => void;
};

/** Tam ekran biyometrik kilit — SplashScreen diline yakın koyu zemin + ACCENT. */
export function AppLockScreen({
  visible,
  unlockLabel,
  hintLabel,
  onUnlocked,
}: AppLockScreenProps) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: unlockLabel,
        cancelLabel: 'İptal',
        disableDeviceFallback: false,
      });
      if (result.success) {
        onUnlocked();
      } else {
        setError(hintLabel);
      }
    } catch {
      setError(hintLabel);
    } finally {
      setBusy(false);
    }
  }, [busy, hintLabel, onUnlocked, unlockLabel]);

  useEffect(() => {
    if (!visible) {
      setError(null);
      setBusy(false);
      return;
    }
    // Otomatik Face ID / Touch ID istemi
    const t = setTimeout(() => {
      void authenticate();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sadece visible açılınca
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
      pointerEvents="auto"
    >
      <View style={styles.glow} />
      <View style={styles.logoBox}>
        <SozLogo size={40} color={ACCENT} />
      </View>
      <Text style={styles.title}>Söz</Text>
      <View style={styles.line} />
      <Text style={styles.subtitle}>{hintLabel}</Text>

      <Pressable
        style={[styles.unlockBtn, busy && styles.unlockBtnDisabled]}
        onPress={() => void authenticate()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={unlockLabel}
      >
        {busy ? (
          <ActivityIndicator color="#0A0A08" />
        ) : (
          <Text style={styles.unlockBtnText}>{unlockLabel}</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A08',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
    elevation: 100,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(196,149,80,0.07)',
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: '#111109',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 56,
    color: '#E8E0D0',
    fontFamily: fonts.thin,
    letterSpacing: -1.2,
    marginBottom: 14,
  },
  line: {
    width: 48,
    height: 0.5,
    backgroundColor: ACCENT,
    opacity: 0.5,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(232,224,208,0.55)',
    fontFamily: fonts.regular,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 36,
  },
  unlockBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 160,
    alignItems: 'center',
  },
  unlockBtnDisabled: { opacity: 0.7 },
  unlockBtnText: {
    color: '#0A0A08',
    fontSize: 16,
    fontFamily: fonts.medium,
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    color: 'rgba(232,224,208,0.45)',
    fontFamily: fonts.regular,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

import { colors, fonts, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SozAlert } from '@/components/SozAlert';
import { useSozAlert } from '@/hooks/useSozAlert';
import { supabase } from '@/constants/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-posta veya şifre hatalı',
  'Email already registered': 'Bu e-posta zaten kayıtlı',
  'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
  'Invalid email': 'Geçerli bir e-posta girin',
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return ERROR_MESSAGES[err.message] ?? err.message;
  }
  return 'Bir hata oluştu.';
}

export default function AuthScreen() {
  const { theme } = useTheme();
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleSignUp = async () => {
    const n = name.trim();
    const e = email.trim();
    const p = password;
    if (!n) {
      showAlert('Eksik alan', 'Ad Soyad girin.');
      return;
    }
    if (!e || !p) {
      showAlert('Eksik alan', 'E-posta ve şifre girin.');
      return;
    }
    if (p.length < 6) {
      showAlert('Hata', 'Şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    try {
      if (!supabase) {
        console.log('Supabase not available, using local storage');
        showAlert('Söz', 'Sunucuya bağlanılamıyor. Misafir olarak uygulamayı kullanabilirsiniz.');
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: e,
        password: p,
        options: { data: { full_name: n } },
      });
      if (error) throw new Error(error.message);
      showAlert(
        'Kayıt başarılı',
        'E-posta adresinize gelen bağlantı ile hesabınızı doğrulayabilirsiniz. Ardından giriş yapabilirsiniz.'
      );
      setMode('signin');
      setPassword('');
    } catch (err) {
      showAlert('Kayıt hatası', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      showAlert('Eksik alan', 'E-posta ve şifre girin.');
      return;
    }
    setLoading(true);
    try {
      if (!supabase) {
        console.log('Supabase not available, using local storage');
        showAlert('Söz', 'Sunucuya bağlanılamıyor. Misafir olarak uygulamayı kullanabilirsiniz.');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) throw new Error(error.message);
      router.replace('/(tabs)');
    } catch (err) {
      showAlert('Giriş hatası', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const e = email.trim();
    if (!e) {
      showAlert('E-posta girin', 'Şifre sıfırlama bağlantısı için e-posta adresinizi girin.');
      return;
    }
    setResetLoading(true);
    try {
      if (!supabase) {
        console.log('Supabase not available, using local storage');
        showAlert('Söz', 'Sunucuya bağlanılamıyor. Misafir olarak uygulamayı kullanabilirsiniz.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(e);
      if (error) throw new Error(error.message);
      showAlert('Gönderildi', 'E-posta adresinize şifre sıfırlama bağlantısı gönderildi.');
    } catch (err) {
      showAlert('Hata', getErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'signup') handleSignUp();
    else handleSignIn();
  };

  const handleGuestContinue = () => {
    router.replace('/(tabs)');
  };

  const bg = theme.background ?? '#0A0A08';
  const surface = theme.surface ?? '#1A1612';
  const text = theme.text ?? '#E8E0D0';
  const muted = theme.textMuted ?? 'rgba(232,224,208,0.5)';
  const swipeBack = useSwipeBack();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.safeInner} {...swipeBack}>
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={[styles.headerTitle, { color: text }]}>Hesap</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'signin' && styles.tabActive]}
          onPress={() => setMode('signin')}
        >
          <Text style={[styles.tabText, { color: mode === 'signin' ? ACCENT : muted }]}>
            Giriş Yap
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'signup' && styles.tabActive]}
          onPress={() => setMode('signup')}
        >
          <Text style={[styles.tabText, { color: mode === 'signup' ? ACCENT : muted }]}>
            Kayıt Ol
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'signup' && (
            <>
              <Text style={[styles.label, { color: muted }]}>Ad Soyad</Text>
              <TextInput
                style={[styles.input, { backgroundColor: surface, color: text, borderColor: muted }]}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </>
          )}

          <Text style={[styles.label, { color: muted }]}>E-posta</Text>
          <TextInput
            style={[styles.input, { backgroundColor: surface, color: text, borderColor: muted }]}
            placeholder="ornek@email.com"
            placeholderTextColor={muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={[styles.label, { color: muted }]}>Şifre</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { backgroundColor: surface, color: text, borderColor: muted },
              ]}
              placeholder={mode === 'signup' ? 'En az 6 karakter' : 'Şifre'}
              placeholderTextColor={muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              editable={!loading}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setPasswordVisible((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={muted}
              />
            </Pressable>
          </View>

          {mode === 'signin' && (
            <Pressable
              style={styles.forgotWrap}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <Text style={[styles.forgotText, { color: ACCENT }]}>Şifremi Unuttum</Text>
              )}
            </Pressable>
          )}

          <Pressable
            style={[styles.submitBtn, { backgroundColor: ACCENT }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'signup' ? 'Kayıt Ol' : 'Giriş Yap'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')} style={styles.switchMode}>
            <Text style={[styles.switchModeText, { color: muted }]}>
              {mode === 'signup'
                ? 'Zaten hesabın var mı? Giriş Yap'
                : 'Hesabın yok mu? Kayıt Ol'}
            </Text>
          </Pressable>

          <Pressable onPress={handleGuestContinue} style={styles.guestWrap}>
            <Text style={[styles.guestText, { color: muted }]}>Hesap olmadan devam et →</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  safeInner: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { width: 32 },
  headerTitle: { fontFamily: fonts.medium, fontSize: 18 },
  headerRight: { width: 32 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: ACCENT,
  },
  tabText: { fontFamily: fonts.medium, fontSize: 15 },
  keyboard: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  label: { fontFamily: fonts.medium, fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 0.5,
    borderRadius: borderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordWrap: { position: 'relative', marginBottom: 4 },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  forgotWrap: { alignItems: 'flex-end', marginBottom: 16 },
  forgotText: { fontFamily: fonts.regular, fontSize: 14 },
  submitBtn: {
    borderRadius: borderRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { fontFamily: fonts.medium, fontSize: 16, color: colors.white },
  switchMode: { marginTop: 20, alignItems: 'center' },
  switchModeText: { fontFamily: fonts.regular, fontSize: 14 },
  guestWrap: { marginTop: 24, alignItems: 'center' },
  guestText: { fontFamily: fonts.regular, fontSize: 13 },
});

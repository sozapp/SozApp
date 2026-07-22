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
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';

const ERROR_MESSAGES: Record<string, string> = {
  'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
  'New password should be different from the old password.': 'Yeni şifre eskisinden farklı olmalı',
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return ERROR_MESSAGES[err.message] ?? err.message;
  }
  return 'Bir hata oluştu.';
}

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const router = useRouter();
  const safeBack = useSafeBack();
  const swipeBack = useSwipeBack();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const bg = theme.background ?? '#0A0A08';
  const surface = theme.surface ?? '#1A1612';
  const text = theme.text ?? '#E8E0D0';
  const muted = theme.textMuted ?? 'rgba(232,224,208,0.5)';

  const handleSubmit = async () => {
    const p = password;
    if (!p || p.length < 6) {
      showAlert('Hata', 'Şifre en az 6 karakter olmalı');
      return;
    }
    if (p !== confirmPassword) {
      showAlert('Hata', 'Şifreler eşleşmiyor');
      return;
    }
    setLoading(true);
    try {
      if (!supabase) {
        showAlert('Söz', 'Sunucuya bağlanılamıyor.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: p });
      if (error) throw new Error(error.message);
      showAlert('Şifre güncellendi', 'Şifreniz başarıyla değiştirildi.', [
        { text: 'Tamam', onPress: () => safeBack() },
      ]);
    } catch (err) {
      showAlert('Hata', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.safeInner} {...swipeBack}>
        <View style={styles.header}>
          <Pressable style={styles.headerLeft} onPress={() => safeBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: text }]}>Şifremi Değiştir</Text>
          <View style={styles.headerRight} />
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
            <Text style={[styles.label, { color: muted }]}>Yeni Şifre</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  { backgroundColor: surface, color: text, borderColor: muted },
                ]}
                placeholder="En az 6 karakter"
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

            <Text style={[styles.label, { color: muted }]}>Yeni Şifre (Tekrar)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: surface, color: text, borderColor: muted }]}
              placeholder="Şifreyi tekrar girin"
              placeholderTextColor={muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!passwordVisible}
              editable={!loading}
            />

            <Pressable
              style={[styles.submitBtn, { backgroundColor: ACCENT }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Şifreyi Güncelle</Text>
              )}
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
  submitBtn: {
    borderRadius: borderRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { fontFamily: fonts.medium, fontSize: 16, color: colors.white },
});

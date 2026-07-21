import { colors, fonts, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SozAlert } from '@/components/SozAlert';
import { useSozAlert } from '@/hooks/useSozAlert';
import { supabase } from '@/constants/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
  'Invalid email': 'Geçerli bir e-posta girin',
  'Email address already in use': 'Bu e-posta zaten kullanımda',
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return ERROR_MESSAGES[err.message] ?? err.message;
  }
  return 'Bir hata oluştu.';
}

export default function ChangeEmailScreen() {
  const { theme } = useTheme();
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const router = useRouter();
  const swipeBack = useSwipeBack();
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setCurrentEmail(data.user?.email ?? null));
  }, []);

  const bg = theme.background ?? '#0A0A08';
  const surface = theme.surface ?? '#1A1612';
  const text = theme.text ?? '#E8E0D0';
  const muted = theme.textMuted ?? 'rgba(232,224,208,0.5)';

  const handleSubmit = async () => {
    const e = newEmail.trim();
    if (!e || !e.includes('@')) {
      showAlert('Hata', 'Geçerli bir e-posta girin');
      return;
    }
    if (currentEmail && e.toLowerCase() === currentEmail.toLowerCase()) {
      showAlert('Hata', 'Bu zaten mevcut e-postanız');
      return;
    }
    setLoading(true);
    try {
      if (!supabase) {
        showAlert('Söz', 'Sunucuya bağlanılamıyor.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ email: e });
      if (error) throw new Error(error.message);
      showAlert(
        'Onay bekleniyor',
        `${e} adresine bir onay bağlantısı gönderildi. Değişikliğin geçerli olması için o bağlantıya tıklamanız gerekiyor.`,
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
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
          <Pressable style={styles.headerLeft} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: text }]}>E-postamı Değiştir</Text>
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
            {currentEmail ? (
              <Text style={[styles.currentEmail, { color: muted }]}>
                Mevcut e-posta: {currentEmail}
              </Text>
            ) : null}

            <Text style={[styles.label, { color: muted }]}>Yeni E-posta</Text>
            <TextInput
              style={[styles.input, { backgroundColor: surface, color: text, borderColor: muted }]}
              placeholder="ornek@email.com"
              placeholderTextColor={muted}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />

            <Text style={[styles.hint, { color: muted }]}>
              Değişikliği onaylamak için yeni e-postana bir bağlantı göndereceğiz.
            </Text>

            <Pressable
              style={[styles.submitBtn, { backgroundColor: ACCENT }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Onay Bağlantısı Gönder</Text>
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
  currentEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 20,
  },
  label: { fontFamily: fonts.medium, fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 0.5,
    borderRadius: borderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 24,
  },
  submitBtn: {
    borderRadius: borderRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: { fontFamily: fonts.medium, fontSize: 16, color: colors.white },
});

import { SozAlert } from '@/components/SozAlert';
import { isRealAccount } from '@/constants/friend-activity';
import { colors as themeColors, fonts } from '@/constants/theme';
import { supabase } from '@/constants/supabase';
import { useNetwork } from '@/context/NetworkContext';
import { useTranslation } from '@/context/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { usePrayerWall } from '@/hooks/usePrayerWall';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function PrayerWallScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const safeBack = useSafeBack();
  const haptics = useHaptics();
  const { isOffline } = useNetwork();
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const { prayers, loading, refresh, submitPrayer, reactToPrayer, reportPrayer } = usePrayerWall();

  const [user, setUser] = useState<User | null>(null);
  const [draft, setDraft] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleSubmit = useCallback(async () => {
    if (isOffline) {
      showAlert(t('internetRequired'), t('internetRequiredMsg'));
      return;
    }
    if (!isRealAccount(user)) {
      showAlert('Söz', t('friendFeatureSignInPrompt'));
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      const result = await submitPrayer(text, anonymous);
      if (!result.ok) {
        haptics.error();
        if (result.error === 'auth') {
          showAlert('Söz', t('friendFeatureSignInPrompt'));
        } else {
          showAlert(t('couldNotSendTitle'), result.error ?? t('genericErrorOccurred'));
        }
        return;
      }
      haptics.success();
      setDraft('');
    } finally {
      setBusy(false);
    }
  }, [anonymous, draft, haptics, isOffline, showAlert, submitPrayer, t, user]);

  const handleReact = useCallback(
    async (id: string) => {
      if (!isRealAccount(user)) {
        showAlert('Söz', t('friendFeatureSignInPrompt'));
        return;
      }
      haptics.light();
      const result = await reactToPrayer(id);
      if (!result.ok) {
        haptics.error();
        showAlert('Söz', result.error ?? t('genericErrorOccurred'));
      }
    },
    [haptics, reactToPrayer, showAlert, t, user]
  );

  const handleReport = useCallback(
    (id: string) => {
      showAlert(t('prayerWallReportTitle'), t('prayerWallReportMsg'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('prayerWallReportConfirm'),
          style: 'destructive',
          onPress: async () => {
            const result = await reportPrayer(id);
            if (result.ok) {
              haptics.success();
              showAlert('Söz', t('prayerWallReportThanks'));
            } else {
              haptics.error();
              showAlert('Söz', result.error ?? t('genericErrorOccurred'));
            }
          },
        },
      ]);
    },
    [haptics, reportPrayer, showAlert, t]
  );

  return (
    <>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: themeColors.accentBorder }]}>
          <Pressable
            onPress={() => safeBack()}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{t('prayerWallTitle')}</Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]} numberOfLines={1}>
              {t('prayerWallSubtitle')}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={[styles.composer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.composerLabel, { color: theme.text }]}>
              {t('prayerWallShareLabel')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.textMuted },
              ]}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('prayerWallPlaceholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={500}
              editable={!busy && !isOffline}
            />
            <View style={styles.composerRow}>
              <View style={styles.anonRow}>
                <Switch
                  value={anonymous}
                  onValueChange={setAnonymous}
                  trackColor={{ false: theme.textMuted, true: 'rgba(196,149,80,0.45)' }}
                  thumbColor={anonymous ? ACCENT : '#f4f3f4'}
                  accessibilityLabel={t('prayerWallAnonymous')}
                />
                <Text style={[styles.anonLabel, { color: theme.textMuted }]}>
                  {t('prayerWallAnonymous')}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.sendBtn,
                  { backgroundColor: ACCENT, opacity: busy || !draft.trim() || isOffline ? 0.55 : 1 },
                ]}
                onPress={() => void handleSubmit()}
                disabled={busy || !draft.trim() || isOffline}
                accessibilityRole="button"
                accessibilityLabel={t('send')}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendBtnText}>{t('send')}</Text>
                )}
              </Pressable>
            </View>
          </View>

          {loading && prayers.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={ACCENT}
                  colors={[ACCENT]}
                />
              }
            >
              {prayers.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textMuted }]}>
                  {t('prayerWallEmpty')}
                </Text>
              ) : (
                prayers.map((p) => {
                  const name = p.isAnonymous ? t('prayerWallAnonymousName') : p.displayName;
                  return (
                    <View
                      key={p.id}
                      style={[styles.card, { backgroundColor: theme.surface }]}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={[styles.cardTime, { color: theme.textMuted }]}>
                          {formatTime(p.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.cardText, { color: theme.text }]}>{p.text}</Text>
                      <View style={styles.cardActions}>
                        <Pressable
                          style={[
                            styles.prayBtn,
                            {
                              backgroundColor: p.reactedByMe
                                ? 'rgba(196,149,80,0.18)'
                                : theme.background,
                              borderColor: ACCENT,
                            },
                          ]}
                          onPress={() => void handleReact(p.id)}
                          disabled={p.reactedByMe}
                          accessibilityRole="button"
                          accessibilityLabel={t('prayerWallPrayCta', { n: p.prayCount })}
                        >
                          <Text style={[styles.prayBtnText, { color: ACCENT }]}>
                            {t('prayerWallPrayCta', { n: p.prayCount })}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleReport(p.id)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('prayerWallReport')}
                        >
                          <Text style={[styles.reportText, { color: theme.textMuted }]}>
                            {t('prayerWallReport')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {!isRealAccount(user) ? (
          <Pressable
            style={[styles.signInBanner, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/auth')}
          >
            <Text style={[styles.signInBannerText, { color: theme.textMuted }]}>
              {t('friendFeatureSignInPrompt')}
            </Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: fonts.medium, fontSize: 18 },
  headerSub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  headerRight: { width: 28 },
  composer: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
  },
  composerLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    minHeight: 72,
    maxHeight: 140,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  anonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  anonLabel: { fontFamily: fonts.regular, fontSize: 12, flexShrink: 1 },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  sendBtnText: { fontFamily: fonts.medium, color: '#fff', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  card: { borderRadius: 14, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  cardName: { fontFamily: fonts.medium, fontSize: 14, flex: 1 },
  cardTime: { fontFamily: fonts.regular, fontSize: 11 },
  cardText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  prayBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  prayBtnText: { fontFamily: fonts.medium, fontSize: 13 },
  reportText: { fontFamily: fonts.regular, fontSize: 12 },
  signInBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(196,149,106,0.25)',
  },
  signInBannerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
});

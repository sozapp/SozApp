import { EmptyState } from '@/components/EmptyState';
import { SozAlert } from '@/components/SozAlert';
import { useNetwork } from '@/context/NetworkContext';
import { newTestament } from '@/constants/new-testament';
import { supabase } from '@/constants/supabase';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useChurch } from '@/hooks/useChurch';
import { useTheme } from '@/hooks/useTheme';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useTranslation } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ChurchScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isOffline } = useNetwork();
  const router = useRouter();
  const {
    church,
    members,
    prayers,
    loading,
    joinGroup,
    createGroup,
    leaveGroup,
    setWeeklyPlan,
    sendPrayer,
    toggleMyCompletion,
  } = useChurch();
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [copied, setCopied] = useState(false);
  const [prayerInput, setPrayerInput] = useState('');
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [planBookId, setPlanBookId] = useState('mat');
  const [planChStart, setPlanChStart] = useState(1);
  const [planChEnd, setPlanChEnd] = useState(7);
  const [busy, setBusy] = useState(false);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  const handleJoin = useCallback(async () => {
    if (isOffline) {
      showAlert(t('internetRequired'), t('churchConnectionRequiredMsg'));
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) return;
    setBusy(true);
    const result = await joinGroup(code);
    setBusy(false);
    if (result.ok) {
      setJoinModalVisible(false);
      setJoinCode('');
    } else {
      showAlert(t('couldNotJoinTitle'), result.error ?? t('genericErrorOccurred'));
    }
  }, [joinCode, joinGroup, isOffline, showAlert, t]);

  const handleCreate = useCallback(async () => {
    if (isOffline) {
      showAlert(t('internetRequired'), t('churchConnectionRequiredMsg'));
      return;
    }
    const name = groupName.trim();
    const churchNameTrimmed = churchName.trim();
    if (!name || !churchNameTrimmed) return;
    setBusy(true);
    const result = await createGroup(name, churchNameTrimmed);
    setBusy(false);
    if (result.ok) {
      setCreateModalVisible(false);
      setGroupName('');
      setChurchName('');
    } else {
      showAlert(t('couldNotCreateTitle'), result.error ?? t('genericErrorOccurred'));
    }
  }, [groupName, churchName, createGroup, isOffline, showAlert, t]);

  const handleCopyCode = useCallback(async () => {
    if (!church) return;
    await Clipboard.setStringAsync(church.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [church]);

  const handleSendPrayer = useCallback(async () => {
    const text = prayerInput.trim();
    if (!text) return;
    setPrayerInput('');
    const result = await sendPrayer(text);
    if (!result.ok) {
      showAlert(t('couldNotSendTitle'), result.error ?? t('genericErrorOccurred'));
      setPrayerInput(text);
    }
  }, [prayerInput, sendPrayer, showAlert, t]);

  const setPlanAndNotify = useCallback(async () => {
    const book = newTestament.find((b) => b.id === planBookId);
    const name = book?.name ?? planBookId;
    const reference = `${name} ${planChStart}-${planChEnd}`;
    const result = await setWeeklyPlan(reference, 7);
    if (result.ok) {
      setPlanModalVisible(false);
      showAlert(t('planSavedTitle'), t('planNotifiedMsg', { reference }));
    } else {
      showAlert(t('couldNotSaveTitle'), result.error ?? t('genericErrorOccurred'));
    }
  }, [planBookId, planChStart, planChEnd, setWeeklyPlan, showAlert, t]);

  const handleLeave = useCallback(() => {
    showAlert(t('leaveGroupConfirmTitle'), t('leaveGroupConfirmMsg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('leaveShort'),
        style: 'destructive',
        onPress: async () => {
          await leaveGroup();
        },
      },
    ]);
  }, [leaveGroup, showAlert, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.accentBorder }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('churchModeTitle')}</Text>
        <View style={styles.headerRight} />
      </View>

      {isOffline ? (
        <View style={[styles.offlineBanner, { backgroundColor: 'rgba(196,149,80,0.1)' }]}>
          <Text style={[styles.offlineBannerText, { color: theme.textMuted }]}>
            {t('offlineChurchBannerMsg')}
          </Text>
        </View>
      ) : null}

      {loading && church == null ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : church == null ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="people-outline"
            title={isOffline ? t('internetRequired') : t('readWithChurch')}
            description={
              isOffline
                ? t('joinOrCreateHint')
                : t('askPastorForCode')
            }
          />
          <View style={styles.emptyButtons}>
            <Pressable
              style={[
                styles.btnOutline,
                { borderColor: theme.textMuted, opacity: isOffline ? 0.45 : 1 },
              ]}
              onPress={() => {
                if (isOffline) {
                  showAlert(t('internetRequired'), t('churchConnectionRequiredMsg'));
                } else {
                  setJoinModalVisible(true);
                }
              }}
            >
              <Text style={[styles.btnOutlineText, { color: theme.text }]}>{t('joinGroup')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btnPrimary,
                { backgroundColor: ACCENT, opacity: isOffline ? 0.45 : 1 },
              ]}
              onPress={() => {
                if (isOffline) {
                  showAlert(t('internetRequired'), t('churchConnectionRequiredMsg'));
                } else {
                  setCreateModalVisible(true);
                }
              }}
            >
              <Text style={styles.btnPrimaryText}>{t('createGroup')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.statsStrip, { backgroundColor: 'rgba(196,149,80,0.06)' }]}>
            <View style={styles.statsStripRow}>
              <Ionicons name="people-outline" size={14} color={ACCENT} />
              <Text style={[styles.statsStripText, { color: theme.textMuted }]}>
                {members.length} {t('members')}
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.groupName, { color: theme.text }]}>{church.groupName}</Text>
            <Text style={[styles.churchName, { color: theme.textMuted }]}>{church.churchName}</Text>

            <View style={styles.codeRow}>
              <Text style={[styles.codeLabel, { color: theme.textMuted }]}>
                {t('groupCode')}: {church.code}
              </Text>
              <Pressable onPress={handleCopyCode} style={styles.copyBtn} hitSlop={8}>
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color={copied ? ACCENT : theme.textMuted}
                />
                <Text style={[styles.copyBtnText, { color: copied ? ACCENT : theme.textMuted }]}>
                  {copied ? t('copied') : t('copyVerse')}
                </Text>
              </Pressable>
            </View>

            {church.planReference ? (
              <View
                style={[
                  styles.planChip,
                  { backgroundColor: colors.accentBadgeBg, borderColor: colors.accentBadgeBorder },
                ]}
              >
                <Text style={[styles.planChipText, { color: theme.text }]}>
                  {t('weeklyReading')}: {church.planReference}
                  {church.planDaysLeft != null ? ` · ${t('daysLeftCount', { n: church.planDaysLeft })}` : ''}
                </Text>
              </View>
            ) : null}

            {church.role === 'admin' && (
              <Pressable
                style={[styles.planSetBtn, { backgroundColor: ACCENT }]}
                onPress={() => setPlanModalVisible(true)}
              >
                <Text style={styles.planSetBtnText}>{t('setWeeklyPlanCta')}</Text>
              </Pressable>
            )}

            {church.planReference && (
              <Pressable
                style={[
                  styles.planSetBtn,
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: ACCENT,
                    marginTop: church.role === 'admin' ? -10 : 0,
                  },
                ]}
                onPress={toggleMyCompletion}
              >
                <Text style={[styles.planSetBtnText, { color: ACCENT }]}>
                  {members.find((m) => m.userId === myUserId)?.completed
                    ? t('weekCompletedMark')
                    : t('markWeekCompleteCta')}
                </Text>
              </Pressable>
            )}

            <Text style={[styles.sectionLabel, { color: theme.text }]}>{t('prayerRequests')}</Text>
            <View style={styles.prayerRow}>
              <TextInput
                style={[styles.prayerInput, { backgroundColor: theme.background, color: theme.text }]}
                value={prayerInput}
                onChangeText={setPrayerInput}
                placeholder={t('prayerRequestPlaceholder')}
                placeholderTextColor={theme.textMuted}
                onSubmitEditing={handleSendPrayer}
              />
              <Pressable style={[styles.prayerSendBtn, { backgroundColor: ACCENT }]} onPress={handleSendPrayer}>
                <Text style={styles.prayerSendBtnText}>{t('send')}</Text>
              </Pressable>
            </View>
            {prayers.map((p) => (
              <View key={p.id} style={styles.prayerItem}>
                <View style={[styles.prayerAvatar, { backgroundColor: 'rgba(196,149,80,0.2)' }]}>
                  <Text style={[styles.prayerInitials, { color: ACCENT }]}>
                    {initialsFromName(p.displayName)}
                  </Text>
                </View>
                <View style={styles.prayerBody}>
                  <Text style={[styles.prayerText, { color: theme.text }]}>{p.text}</Text>
                  <Text style={[styles.prayerTime, { color: theme.textMuted }]}>
                    {p.displayName} ·{' '}
                    {new Date(p.createdAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))}

            <Text style={[styles.progressTitle, { color: theme.text }]}>{t('memberProgressTitle')}</Text>
            {members.map((m) => (
              <View key={m.userId} style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: 'rgba(196,149,80,0.2)' }]}>
                  <Text style={[styles.memberInitials, { color: ACCENT }]}>
                    {initialsFromName(m.displayName)}
                  </Text>
                </View>
                <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                  {m.displayName}
                  {m.userId === myUserId ? ` ${t('youSuffix')}` : ''}
                </Text>
                {church.planReference ? (
                  m.completed ? (
                    <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                  ) : (
                    <Text style={[styles.memberWaiting, { color: theme.textMuted }]}>{t('waitingStatus')}</Text>
                  )
                ) : null}
              </View>
            ))}

            <Pressable onPress={handleLeave} style={styles.leaveBtn}>
              <Text style={styles.leaveBtnText}>{t('leaveGroup')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setJoinModalVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('enterGroupCodeTitle')}</Text>
            <TextInput
              style={[styles.codeInput, { backgroundColor: theme.background, color: theme.text }]}
              value={joinCode}
              onChangeText={(txt) => setJoinCode(txt.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              placeholderTextColor={theme.textMuted}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.modalBtn, { backgroundColor: ACCENT, opacity: busy ? 0.6 : 1 }]}
              onPress={handleJoin}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.modalBtnText}>{t('joinShort')}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCreateModalVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('createGroup')}</Text>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('groupNameLabel')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, color: theme.text }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder={t('groupNameExample')}
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('churchNameLabel')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, color: theme.text }]}
              value={churchName}
              onChangeText={setChurchName}
              placeholder={t('churchNameExample')}
              placeholderTextColor={theme.textMuted}
            />
            <Pressable
              style={[styles.modalBtn, { backgroundColor: ACCENT, opacity: busy ? 0.6 : 1 }]}
              onPress={handleCreate}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.modalBtnText}>{t('createShort')}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={planModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPlanModalVisible(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('weeklyPlanModalTitle')}</Text>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('book')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planBookScroll}>
              {newTestament.map((b) => (
                <Pressable
                  key={b.id}
                  style={[
                    styles.planBookChip,
                    { backgroundColor: planBookId === b.id ? ACCENT : theme.background },
                  ]}
                  onPress={() => setPlanBookId(b.id)}
                >
                  <Text
                    style={[
                      styles.planBookChipText,
                      { color: planBookId === b.id ? colors.white : theme.text },
                    ]}
                  >
                    {b.shortName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('chapterRangeLabel')}</Text>
            <View style={styles.planChRow}>
              <TextInput
                style={[styles.planChInput, { backgroundColor: theme.background, color: theme.text }]}
                value={String(planChStart)}
                onChangeText={(txt) => setPlanChStart(Math.max(1, parseInt(txt, 10) || 1))}
                keyboardType="number-pad"
                placeholder={t('startRangeLabel')}
                placeholderTextColor={theme.textMuted}
              />
              <Text style={[styles.planChDash, { color: theme.textMuted }]}>–</Text>
              <TextInput
                style={[styles.planChInput, { backgroundColor: theme.background, color: theme.text }]}
                value={String(planChEnd)}
                onChangeText={(txt) => setPlanChEnd(Math.max(1, parseInt(txt, 10) || 1))}
                keyboardType="number-pad"
                placeholder={t('endRangeLabel')}
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: ACCENT }]}
              onPress={setPlanAndNotify}
            >
              <Text style={styles.modalBtnText}>{t('saveAndNotifyCta')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  headerRight: {
    width: 32,
  },
  offlineBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  offlineBannerText: {
    fontSize: 11,
    textAlign: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyButtons: {
    width: '100%',
    gap: 12,
  },
  btnOutline: {
    borderWidth: 1,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnOutlineText: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  btnPrimary: {
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsStrip: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  statsStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  statsStripText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: 14,
    padding: 20,
  },
  groupName: {
    fontFamily: fonts.medium,
    fontSize: 22,
    marginBottom: 4,
  },
  churchName: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  codeLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  copyBtnText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  planChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  planChipText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  planSetBtn: {
    borderRadius: borderRadius.button,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  planSetBtnText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.white,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginBottom: 10,
  },
  prayerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  prayerInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  prayerSendBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  prayerSendBtnText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.white,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  prayerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prayerInitials: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  prayerBody: { flex: 1 },
  prayerText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 2,
  },
  prayerTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  progressTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,149,80,0.15)',
    gap: 10,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  memberName: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  memberWaiting: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  leaveBtn: {
    marginTop: 24,
    alignSelf: 'center',
  },
  leaveBtnText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#C62828',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  codeInput: {
    fontFamily: fonts.medium,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 6,
  },
  textInput: {
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalBtn: {
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
  },
  planBookScroll: {
    marginBottom: 16,
    maxHeight: 44,
  },
  planBookChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  planBookChipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  planChRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  planChInput: {
    width: 80,
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    textAlign: 'center',
  },
  planChDash: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});

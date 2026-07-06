import { EmptyState } from '@/components/EmptyState';
import { SozAlert } from '@/components/SozAlert';
import { useNetwork } from '@/context/NetworkContext';
import { newTestament } from '@/constants/new-testament';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useChurch, generateGroupCode } from '@/hooks/useChurch';
import { useTheme } from '@/hooks/useTheme';
import { useSozAlert } from '@/hooks/useSozAlert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
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

const STORAGE_PRAYERS = '@soz/church/prayers';
const STORAGE_GROUP_PLAN = '@soz/church/groupPlan';

const DEMO_JOIN_CODE = 'SOZI23';
const MOCK_MEMBERS: { initials: string; percent: number; done?: boolean }[] = [
  { initials: 'AY', percent: 80 },
  { initials: 'MK', percent: 45 },
  { initials: 'SB', percent: 100, done: true },
  { initials: 'EÖ', percent: 60 },
  { initials: 'TK', percent: 100, done: true },
];
const DEFAULT_GROUP_PLAN = { reference: 'Matta 5-7', daysLeft: 3 };

type PrayerEntry = { id: string; initials: string; text: string; time: string };
type GroupPlan = { reference: string; daysLeft: number };

export default function ChurchScreen() {
  const { theme } = useTheme();
  const { isOffline } = useNetwork();
  const router = useRouter();
  const { church, setChurch, leaveGroup } = useChurch();
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [copied, setCopied] = useState(false);
  const [prayers, setPrayers] = useState<PrayerEntry[]>([]);
  const [prayerInput, setPrayerInput] = useState('');
  const [groupPlan, setGroupPlan] = useState<GroupPlan>(DEFAULT_GROUP_PLAN);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [planBookId, setPlanBookId] = useState('mat');
  const [planChStart, setPlanChStart] = useState(1);
  const [planChEnd, setPlanChEnd] = useState(7);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();

  const loadPrayers = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PRAYERS);
      if (raw != null) setPrayers(JSON.parse(raw) as PrayerEntry[]);
      else setPrayers([]);
    } catch (_) {
      setPrayers([]);
    }
  }, []);

  const loadGroupPlan = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_GROUP_PLAN);
      if (raw != null) setGroupPlan(JSON.parse(raw) as GroupPlan);
      else setGroupPlan(DEFAULT_GROUP_PLAN);
    } catch (_) {
      setGroupPlan(DEFAULT_GROUP_PLAN);
    }
  }, []);

  useEffect(() => {
    if (church != null) {
      loadPrayers();
      loadGroupPlan();
    }
  }, [church != null, loadPrayers, loadGroupPlan]);

  const sendPrayer = useCallback(async () => {
    const text = prayerInput.trim();
    if (!text) return;
    const entry: PrayerEntry = {
      id: Date.now().toString(),
      initials: 'S',
      text,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    const next = [entry, ...prayers];
    setPrayers(next);
    setPrayerInput('');
    try {
      await AsyncStorage.setItem(STORAGE_PRAYERS, JSON.stringify(next));
    } catch (_) {}
  }, [prayerInput, prayers]);

  const setPlanAndNotify = useCallback(async () => {
    const book = newTestament.find((b) => b.id === planBookId);
    const name = book?.name ?? planBookId;
    const reference = `${name} ${planChStart}-${planChEnd}`;
    const plan: GroupPlan = { reference, daysLeft: 7 };
    setGroupPlan(plan);
    setPlanModalVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_GROUP_PLAN, JSON.stringify(plan));
    } catch (_) {}
    showAlert('Plan kaydedildi', `Grup üyelerine "${reference}" haftalık okuma planı bildirildi.`);
  }, [planBookId, planChStart, planChEnd]);

  const handleJoin = useCallback(() => {
    if (isOffline) {
      showAlert('İnternet gerekli', 'Kilise modu için bağlantı gerekir.');
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) return;
    if (code === DEMO_JOIN_CODE) {
      setChurch({
        groupName: 'Söz Kilise Grubu',
        churchName: 'Demo Kilise',
        code: DEMO_JOIN_CODE,
        role: 'member',
        joinedAt: new Date().toISOString(),
        members: 12,
      });
      setJoinModalVisible(false);
      setJoinCode('');
    } else {
      showAlert('Geçersiz kod', 'Girdiğiniz kod geçerli değil. Demo için "SOZI23" kullanın.');
    }
  }, [joinCode, setChurch, isOffline]);

  const handleCreate = useCallback(() => {
    if (isOffline) {
      showAlert('İnternet gerekli', 'Kilise modu için bağlantı gerekir.');
      return;
    }
    const name = groupName.trim();
    const churchNameTrimmed = churchName.trim();
    if (!name || !churchNameTrimmed) return;
    const code = generateGroupCode();
    setChurch({
      groupName: name,
      churchName: churchNameTrimmed,
      code,
      role: 'admin',
      joinedAt: new Date().toISOString(),
      members: 1,
    });
    setCreateModalVisible(false);
    setGroupName('');
    setChurchName('');
  }, [groupName, churchName, setChurch, isOffline]);

  const handleCopyCode = useCallback(() => {
    if (!church) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Optional: add expo-clipboard and use Clipboard.setStringAsync(church.code)
  }, [church]);

  const handleLeave = useCallback(() => {
    showAlert('Grubu terk et', 'Gruptan ayrılmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Terk Et', style: 'destructive', onPress: async () => {
        await leaveGroup();
      } },
    ]);
  }, [leaveGroup]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.accentBorder }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Kilise Modu</Text>
        <View style={styles.headerRight} />
      </View>

      {isOffline ? (
        <View style={[styles.offlineBanner, { backgroundColor: 'rgba(196,149,80,0.1)' }]}>
          <Text style={[styles.offlineBannerText, { color: theme.textMuted }]}>
            İnternet gerekli — kilise özellikleri çevrimiçi kullanılabilir
          </Text>
        </View>
      ) : null}

      {church == null ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="people-outline"
            title={isOffline ? 'İnternet gerekli' : 'Kilisenizle birlikte okuyun'}
            description={
              isOffline
                ? 'Gruba katılmak veya grup oluşturmak için bağlanın.'
                : 'Papazınızdan grup kodunu alın veya yeni grup oluşturun.'
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
                  showAlert('İnternet gerekli', 'Kilise modu için bağlantı gerekir.');
                } else {
                  setJoinModalVisible(true);
                }
              }}
            >
              <Text style={[styles.btnOutlineText, { color: theme.text }]}>Gruba Katıl</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btnPrimary,
                { backgroundColor: ACCENT, opacity: isOffline ? 0.45 : 1 },
              ]}
              onPress={() => {
                if (isOffline) {
                  showAlert('İnternet gerekli', 'Kilise modu için bağlantı gerekir.');
                } else {
                  setCreateModalVisible(true);
                }
              }}
            >
              <Text style={styles.btnPrimaryText}>Grup Oluştur</Text>
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
              <Ionicons name="book-outline" size={14} color={ACCENT} />
              <Text style={[styles.statsStripText, { color: theme.textMuted }]}>42 ayet okundu</Text>
              <Text style={[styles.statsStripText, { color: theme.textMuted }]}> · </Text>
              <Ionicons name="flame-outline" size={14} color={ACCENT} />
              <Text style={[styles.statsStripText, { color: theme.textMuted }]}>5 gün seri</Text>
              <Text style={[styles.statsStripText, { color: theme.textMuted }]}> · </Text>
              <Ionicons name="people-outline" size={14} color={ACCENT} />
              <Text style={[styles.statsStripText, { color: theme.textMuted }]}>{church.members} üye</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.groupName, { color: theme.text }]}>{church.groupName}</Text>
            <Text style={[styles.churchName, { color: theme.textMuted }]}>{church.churchName}</Text>

            <View style={styles.codeRow}>
              <Text style={[styles.codeLabel, { color: theme.textMuted }]}>
                Grup Kodu: {church.code}
              </Text>
              <Pressable onPress={handleCopyCode} style={styles.copyBtn} hitSlop={8}>
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color={copied ? ACCENT : theme.textMuted}
                />
                <Text style={[styles.copyBtnText, { color: copied ? ACCENT : theme.textMuted }]}>
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </Text>
              </Pressable>
            </View>

            <View style={[styles.planChip, { backgroundColor: colors.accentBadgeBg, borderColor: colors.accentBadgeBorder }]}>
              <Text style={[styles.planChipText, { color: theme.text }]}>
                Bu hafta: {groupPlan.reference} · {groupPlan.daysLeft} gün kaldı
              </Text>
            </View>

            {church.role === 'admin' && (
              <Pressable
                style={[styles.planSetBtn, { backgroundColor: ACCENT }]}
                onPress={() => setPlanModalVisible(true)}
              >
                <Text style={styles.planSetBtnText}>Bu hafta okuma planı belirle</Text>
              </Pressable>
            )}

            <Text style={[styles.sectionLabel, { color: theme.text }]}>Dua İstekleri</Text>
            <View style={styles.prayerRow}>
              <TextInput
                style={[styles.prayerInput, { backgroundColor: theme.background, color: theme.text }]}
                value={prayerInput}
                onChangeText={setPrayerInput}
                placeholder="Dua isteği yazın..."
                placeholderTextColor={theme.textMuted}
                onSubmitEditing={sendPrayer}
              />
              <Pressable style={[styles.prayerSendBtn, { backgroundColor: ACCENT }]} onPress={sendPrayer}>
                <Text style={styles.prayerSendBtnText}>Gönder</Text>
              </Pressable>
            </View>
            {prayers.map((p) => (
              <View key={p.id} style={styles.prayerItem}>
                <View style={[styles.prayerAvatar, { backgroundColor: 'rgba(196,149,80,0.2)' }]}>
                  <Text style={[styles.prayerInitials, { color: ACCENT }]}>{p.initials}</Text>
                </View>
                <View style={styles.prayerBody}>
                  <Text style={[styles.prayerText, { color: theme.text }]}>{p.text}</Text>
                  <Text style={[styles.prayerTime, { color: theme.textMuted }]}>{p.time}</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.progressTitle, { color: theme.text }]}>Üye ilerlemesi</Text>
            {MOCK_MEMBERS.map((m) => (
              <View key={m.initials} style={styles.memberRow}>
                <Text style={[styles.memberInitials, { color: theme.text }]}>{m.initials}</Text>
                <View style={styles.memberProgressWrap}>
                  <View style={[styles.memberProgressBg, { backgroundColor: 'rgba(196,149,80,0.12)' }]}>
                    <View
                      style={[
                        styles.memberProgressFill,
                        {
                          width: `${m.percent}%`,
                          backgroundColor: m.done ? '#2E7D32' : ACCENT,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.memberPercentRow}>
                  <Text style={[styles.memberPercent, { color: theme.textMuted }]}>%{m.percent}</Text>
                  {m.done ? <Ionicons name="checkmark-circle-outline" size={18} color={ACCENT} style={styles.memberPercentCheck} /> : null}
                </View>
              </View>
            ))}

            <Pressable onPress={handleLeave} style={styles.leaveBtn}>
              <Text style={styles.leaveBtnText}>Grubu Terk Et</Text>
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Grup Kodunu Girin</Text>
            <TextInput
              style={[styles.codeInput, { backgroundColor: theme.background, color: theme.text }]}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="SOZI23"
              placeholderTextColor={theme.textMuted}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.modalBtn, { backgroundColor: ACCENT }]}
              onPress={handleJoin}
            >
              <Text style={styles.modalBtnText}>Katıl</Text>
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Grup Oluştur</Text>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Grup Adı</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, color: theme.text }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Örn: Gençlik Grubu"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Kilise Adı</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, color: theme.text }]}
              value={churchName}
              onChangeText={setChurchName}
              placeholder="Örn: İstanbul Kilisesi"
              placeholderTextColor={theme.textMuted}
            />
            <Pressable
              style={[styles.modalBtn, { backgroundColor: ACCENT }]}
              onPress={handleCreate}
            >
              <Text style={styles.modalBtnText}>Oluştur</Text>
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Haftalık okuma planı</Text>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Kitap</Text>
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
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Bölüm aralığı</Text>
            <View style={styles.planChRow}>
              <TextInput
                style={[styles.planChInput, { backgroundColor: theme.background, color: theme.text }]}
                value={String(planChStart)}
                onChangeText={(t) => setPlanChStart(Math.max(1, parseInt(t, 10) || 1))}
                keyboardType="number-pad"
                placeholder="Başlangıç"
                placeholderTextColor={theme.textMuted}
              />
              <Text style={[styles.planChDash, { color: theme.textMuted }]}>–</Text>
              <TextInput
                style={[styles.planChInput, { backgroundColor: theme.background, color: theme.text }]}
                value={String(planChEnd)}
                onChangeText={(t) => setPlanChEnd(Math.max(1, parseInt(t, 10) || 1))}
                keyboardType="number-pad"
                placeholder="Bitiş"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: ACCENT }]}
              onPress={setPlanAndNotify}
            >
              <Text style={styles.modalBtnText}>Kaydet ve bildir</Text>
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
  churchIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: fonts.thin,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontFamily: fonts.italic,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
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
  membersLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 16,
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
  memberInitials: {
    fontFamily: fonts.medium,
    fontSize: 14,
    width: 28,
  },
  memberProgressWrap: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  memberProgressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  memberProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  memberPercentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 36,
  },
  memberPercentCheck: {
    marginLeft: 4,
  },
  memberPercent: {
    fontFamily: fonts.regular,
    fontSize: 14,
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

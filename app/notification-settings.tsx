import {
  cancelAllNotifications,
  registerForPushNotifications,
  scheduleDailyReminder,
} from '@/hooks/useNotifications';
import { colors, fonts } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STORAGE_KEY = '@soz/notifications';

type NotificationPrefs = {
  dailyEnabled: boolean;
  hour: number;
  minute: number;
  streakEnabled: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  dailyEnabled: false,
  hour: 8,
  minute: 0,
  streakEnabled: false,
};

const MINUTE_OPTIONS = [0, 15, 30, 45];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

async function loadPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (_) {}
}

export default function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [pickerKind, setPickerKind] = useState<'hour' | 'minute' | null>(null);
  const isDevice = Device.isDevice;

  const load = useCallback(async () => {
    const p = await loadPrefs();
    setPrefs(p);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updatePrefs = useCallback((next: Partial<NotificationPrefs>) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      savePrefs(merged);
      return merged;
    });
  }, []);

  const onDailyToggle = useCallback(
    async (value: boolean) => {
      if (!isDevice) {
        updatePrefs({ dailyEnabled: false });
        return;
      }
      if (value) {
        const granted = await registerForPushNotifications();
        if (!granted) {
          updatePrefs({ dailyEnabled: false });
          return;
        }
        updatePrefs({ dailyEnabled: true });
        await scheduleDailyReminder(prefs.hour, prefs.minute);
      } else {
        updatePrefs({ dailyEnabled: false });
        await cancelAllNotifications();
      }
    },
    [isDevice, prefs.hour, prefs.minute, updatePrefs]
  );

  const onTimeChange = useCallback(
    (hour?: number, minute?: number) => {
      const newHour = hour ?? prefs.hour;
      const newMinute = minute ?? prefs.minute;
      updatePrefs({ hour: newHour, minute: newMinute });
      if (prefs.dailyEnabled && isDevice) {
        scheduleDailyReminder(newHour, newMinute);
      }
    },
    [prefs.dailyEnabled, prefs.hour, prefs.minute, isDevice, updatePrefs]
  );

  const onStreakToggle = useCallback(
    (value: boolean) => {
      updatePrefs({ streakEnabled: value });
    },
    [updatePrefs]
  );

  const hourLabel = String(prefs.hour).padStart(2, '0');
  const minuteLabel = String(prefs.minute).padStart(2, '0');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.accentBorder }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bildirimler</Text>
        <View style={styles.headerRight} />
      </View>

      {!isDevice ? (
        <View style={styles.unsupportedWrap}>
          <Text style={[styles.unsupportedText, { color: theme.textMuted }]}>
            Bildirimler bu cihazda desteklenmiyor
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabels}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>
                  Günlük okuma hatırlatıcısı
                </Text>
                <Text style={[styles.toggleSubtitle, { color: theme.textMuted }]}>
                  Her gün belirlediğin saatte hatırlatırız
                </Text>
              </View>
              <Switch
                value={prefs.dailyEnabled}
                onValueChange={onDailyToggle}
                trackColor={{ false: theme.textMuted, true: colors.accent }}
                thumbColor={colors.white}
              />
            </View>

            {prefs.dailyEnabled && (
              <View style={styles.timeSection}>
                <Text style={[styles.timeLabel, { color: theme.textMuted }]}>Hatırlatma saati</Text>
                <View style={styles.timeRow}>
                  <Pressable
                    style={[styles.pickerCard, { backgroundColor: theme.background }]}
                    onPress={() => setPickerKind('hour')}
                  >
                    <Text style={[styles.pickerValue, { color: theme.text }]}>{hourLabel}</Text>
                    <Text style={[styles.pickerUnit, { color: theme.textMuted }]}>saat</Text>
                  </Pressable>
                  <Text style={[styles.timeSeparator, { color: theme.textMuted }]}>:</Text>
                  <Pressable
                    style={[styles.pickerCard, { backgroundColor: theme.background }]}
                    onPress={() => setPickerKind('minute')}
                  >
                    <Text style={[styles.pickerValue, { color: theme.text }]}>{minuteLabel}</Text>
                    <Text style={[styles.pickerUnit, { color: theme.textMuted }]}>dakika</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabels}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>
                  Seri bozulma uyarısı
                </Text>
                <Text style={[styles.toggleSubtitle, { color: theme.textMuted }]}>
                  Günlük seriniz bitmeden 2 saat önce hatırlatır
                </Text>
              </View>
              <Switch
                value={prefs.streakEnabled}
                onValueChange={onStreakToggle}
                trackColor={{ false: theme.textMuted, true: colors.accent }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={pickerKind !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerKind(null)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {pickerKind === 'hour' ? 'Saat' : 'Dakika'}
            </Text>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {(pickerKind === 'hour' ? HOURS : MINUTE_OPTIONS).map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.pickerOption,
                    { backgroundColor: theme.background },
                    (pickerKind === 'hour' ? prefs.hour : prefs.minute) === value &&
                      styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    if (pickerKind === 'hour') onTimeChange(value, undefined);
                    else onTimeChange(undefined, value);
                    setPickerKind(null);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { color: theme.text }]}>
                    {String(value).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.modalClose, { backgroundColor: colors.accent }]}
              onPress={() => setPickerKind(null)}
            >
              <Text style={styles.modalCloseText}>Kapat</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  headerRight: { width: 32 },
  unsupportedWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unsupportedText: {
    fontFamily: fonts.italic,
    fontSize: 16,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabels: { flex: 1, marginRight: 12 },
  toggleTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  toggleSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  timeSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: colors.accentBorder },
  timeLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerCard: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  pickerValue: {
    fontFamily: fonts.medium,
    fontSize: 22,
  },
  pickerUnit: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  timeSeparator: {
    fontFamily: fonts.medium,
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 14,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 12,
  },
  pickerScroll: { maxHeight: 240 },
  pickerOption: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  pickerOptionSelected: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  pickerOptionText: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
  },
});

import React, { useState, useRef, useEffect, useCallback, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMoodVerseToFavorites, useFavorites } from '@/hooks/useFavorites';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import { fonts as appFonts } from '@/constants/theme';
import { groqChat } from '@/constants/groq';
import type { TranslationKey } from '@/constants/i18n';
import { useTranslation } from '@/context/LanguageContext';
import { useNetwork } from '@/context/NetworkContext';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';
const ACCENT_LIGHT = '#FFF8EE';

type AppFonts = typeof appFonts;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// ─── Types ────────────────────────────────────────────────────────────────────
type MoodAnalysis = {
  emotion: string;
  intensity: string;
  need: string;
  verses: Array<{
    ref: string;
    book: string;
    chapter: number;
    verseNum: number;
    text: string;
    reason: string;
  }>;
  encouragement: string;
};

type Phase = 'input' | 'result';

// ─── Constants ────────────────────────────────────────────────────────────────
const MOOD_SUGGESTIONS: { icon: IoniconName; labelKey: TranslationKey }[] = [
  { icon: 'heart-dislike-outline', labelKey: 'moodLabelSad' },
  { icon: 'alert-circle-outline', labelKey: 'moodLabelAnxious' },
  { icon: 'thunderstorm-outline', labelKey: 'moodLabelAngry' },
  { icon: 'moon-outline', labelKey: 'moodLabelTired' },
  { icon: 'sunny-outline', labelKey: 'moodLabelHappy' },
  { icon: 'leaf-outline', labelKey: 'moodLabelGrateful' },
  { icon: 'cloudy-outline', labelKey: 'moodLabelPessimistic' },
  { icon: 'flash-outline', labelKey: 'moodLabelStrong' },
  { icon: 'water-outline', labelKey: 'moodLabelWantToCry' },
  { icon: 'help-circle-outline', labelKey: 'moodLabelUnsure' },
  { icon: 'partly-sunny-outline', labelKey: 'moodLabelPeaceful' },
  { icon: 'person-outline', labelKey: 'moodLabelLonely' },
];

// ─── Loading Animation ────────────────────────────────────────────────────────
function LoadingAnimation() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.4, duration: 1000, useNativeDriver: false }),
      ])
    ).start();

    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 300, useNativeDriver: false }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: false }),
          Animated.delay(600),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, [dot1, dot2, dot3, glow]);

  const A = ACCENT;
  return (
    <View style={loadingStyles.anim}>
      <Animated.View
        style={[
          loadingStyles.glow,
          { opacity: glow, backgroundColor: `${A}1A`, borderColor: `${A}4D` },
        ]}
      >
        <View style={[loadingStyles.iconWrap, { backgroundColor: `${A}26` }]}>
          <Ionicons name="heart" size={32} color={A} />
        </View>
      </Animated.View>
      <View style={loadingStyles.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              loadingStyles.dot,
              { transform: [{ translateY: dot }], backgroundColor: A },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  anim: { alignItems: 'center', gap: 20 },
  glow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ─── Verse Card ────────────────────────────────────────────────────────────────
function VerseCard({
  verse,
  index,
  styles,
  colors,
  isFavorite,
  refreshFavorites,
}: {
  verse: MoodAnalysis['verses'][0];
  index: number;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  isFavorite: (verseId: string) => boolean;
  refreshFavorites: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const vid = `${verse.book}-${verse.chapter}-${verse.verseNum}`;
  const fav = isFavorite(vid);

  const handleFavorite = useCallback(async () => {
    if (fav) return;
    try {
      await addMoodVerseToFavorites(verse);
      await refreshFavorites();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [fav, verse, refreshFavorites]);

  const handleRead = useCallback(() => {
    router.push({
      pathname: '/(tabs)/read',
      params: {
        book: verse.book,
        chapter: String(verse.chapter),
        highlightVerse: String(verse.verseNum),
      },
    });
  }, [verse]);

  return (
    <View style={styles.verseCard}>
      <View style={styles.verseCardNum}>
        <Text style={styles.verseCardNumText}>{index + 1}</Text>
      </View>

      <Text style={styles.verseCardRef}>{verse.ref}</Text>

      <Text style={styles.verseCardQuote}>"</Text>

      <Text style={styles.verseCardText}>{verse.text}</Text>

      <View style={styles.verseCardReason}>
        <Ionicons name="sparkles-outline" size={13} color={ACCENT} style={{ marginTop: 1 }} />
        <Text style={styles.verseCardReasonText}>{verse.reason}</Text>
      </View>

      <View style={styles.verseCardActions}>
        <TouchableOpacity style={styles.verseAction} onPress={handleFavorite}>
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={15}
            color={fav ? ACCENT : colors.textMuted}
          />
          <Text style={[styles.verseActionText, fav && { color: ACCENT }]}>
            {fav ? t('moodInFavorites') : t('moodAddFavorite')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.verseAction} onPress={handleRead}>
          <Ionicons name="book-outline" size={15} color={colors.textMuted} />
          <Text style={styles.verseActionText}>{t('readSection')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Result View ───────────────────────────────────────────────────────────────
function ResultView({
  analysis,
  onReset,
  styles,
  colors,
  isFavorite,
  refreshFavorites,
}: {
  analysis: MoodAnalysis;
  onReset: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  isFavorite: (verseId: string) => boolean;
  refreshFavorites: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.emotionCard}>
        <View style={styles.emotionHeader}>
          <View style={styles.emotionBadge}>
            <Text style={styles.emotionBadgeText}>{analysis.emotion}</Text>
          </View>
          <Text style={styles.emotionIntensity}>{analysis.intensity}</Text>
        </View>
        <Text style={styles.encouragementText}>{analysis.encouragement}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t('moodForYouVerses')}</Text>
        <Text style={styles.sectionDesc}>{analysis.need}</Text>
      </View>

      {analysis.verses.map((v, i) => (
        <VerseCard
          key={i}
          verse={v}
          index={i}
          styles={styles}
          colors={colors}
          isFavorite={isFavorite}
          refreshFavorites={refreshFavorites}
        />
      ))}

      <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
        <Ionicons name="refresh-outline" size={16} color={ACCENT} />
        <Text style={styles.resetBtnText}>{t('moodRewrite')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
async function persistLastMoodSession(moods: string[], text: string) {
  try {
    await AsyncStorage.multiSet([
      ['@soz/lastMood', JSON.stringify({ moods, text })],
      ['@soz/lastMoodAt', new Date().toISOString()],
    ]);
  } catch {
    /* ignore */
  }
}

async function persistLastMoodResult(result: MoodAnalysis): Promise<void> {
  try {
    await AsyncStorage.setItem('@soz/lastMoodResult', JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

async function readLastMoodResult(): Promise<MoodAnalysis | null> {
  try {
    const raw = await AsyncStorage.getItem('@soz/lastMoodResult');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MoodAnalysis;
    if (!parsed?.verses?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function MoodScreen() {
  const safeBack = useSafeBack();
  const { t } = useTranslation();
  const { colors, fonts } = useTheme();
  const { isOnline } = useNetwork();
  const { isFavorite, refreshFavorites } = useFavorites();
  const styles = makeStyles(colors, fonts);
  const params = useLocalSearchParams<{ prefill?: string | string[] }>();

  const [moodText, setMoodText] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<TranslationKey[]>([]);
  const [phase, setPhase] = useState<Phase>('input');
  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState('');
  const [userChurch, setUserChurch] = useState('');
  const inputRef = useRef<TextInput>(null);
  const chipsShakeX = useRef(new Animated.Value(0)).current;
  const [moodInputFocused, setMoodInputFocused] = useState(false);

  const runChipsShake = useCallback(() => {
    chipsShakeX.setValue(0);
    Animated.sequence([
      Animated.timing(chipsShakeX, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(chipsShakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(chipsShakeX, { toValue: 5, duration: 45, useNativeDriver: true }),
      Animated.timing(chipsShakeX, { toValue: -5, duration: 45, useNativeDriver: true }),
      Animated.timing(chipsShakeX, { toValue: 3, duration: 45, useNativeDriver: true }),
      Animated.timing(chipsShakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [chipsShakeX]);

  useEffect(() => {
    const raw = params.prefill;
    const p =
      typeof raw === 'string'
        ? raw.trim()
        : Array.isArray(raw)
          ? (raw[0] ?? '').trim()
          : '';
    if (!p) return;
    const match = MOOD_SUGGESTIONS.find(
      (s) => s.labelKey === p || t(s.labelKey) === p,
    );
    if (!match) return;
    const key = match.labelKey;
    setSelectedMoods((prev) => {
      if (prev.includes(key)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }, [params.prefill, t]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [p, c] = await Promise.all([
            AsyncStorage.getItem('@soz/userProfile'),
            AsyncStorage.getItem('@soz/userChurch'),
          ]);
          setUserProfile((p ?? '').trim());
          setUserChurch((c ?? '').trim());
        } catch (e) {
          console.error('Onboarding profil/kilise yükleme (mood):', e);
          setUserProfile('');
          setUserChurch('');
        }
      })();
    }, [])
  );

  const mapMoodError = useCallback((raw: string): string => {
    const msg = raw.toLowerCase();
    if (msg.includes('network error') || msg.includes('network request failed')) {
      return t('moodNoInternet');
    }
    if (msg.includes('parse error') || msg.includes('parse')) {
      return t('moodParseError');
    }
    if (msg.includes('timeout') || msg.includes('zaman aşımı')) {
      return t('moodTimeoutError');
    }
    return t('moodConnectionError');
  }, [t]);

  const analyzeAndSuggest = useCallback(async () => {
    const extra = moodText.trim();
    if (selectedMoods.length === 0 && extra.length < 3) return;
    setError(null);

    if (!isOnline) {
      setError(t('moodNoInternet'));
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    const moodBlock =
      selectedMoods.length > 0
        ? `Kullanıcı şu duyguları hissediyor: ${selectedMoods.map((k) => t(k)).join(', ')}`
        : '';
    const textBlock =
      extra.length >= 3
        ? `${moodBlock ? '\n\n' : ''}Kullanıcı şu an nasıl hissettiğini / düşüncelerini anlattı:\n\n"${extra}"`
        : '';

    const prompt = `Sen bir Hristiyan ruh rehberisin.
${moodBlock}${textBlock}

Bu metni analiz et ve şu JSON formatında yanıt ver (başka hiçbir şey yazma):

{
  "emotion": "Ana duygu (tek kelime/kısa ifade)",
  "intensity": "Hafif/Orta/Derin",
  "need": "Kullanıcının ihtiyacı (kısa)",
  "encouragement": "Kullanıcıya 1-2 cümle kısa, samimi, kişisel teşvik. Türkçe, Hristiyan perspektifinden.",
  "verses": [
    {
      "ref": "Kitap Bölüm:Ayet",
      "book": "Türkçe kitap adı",
      "chapter": sayı,
      "verseNum": sayı,
      "text": "Ayetin Türkçe metni (Kutsal Kitap 2001)",
      "reason": "Bu ayet neden uygun? (1 cümle)"
    }
  ]
}

Önemli kurallar:
- Tam olarak 3 ayet öner
- Yeni Ahit'ten öncelikli seç
- Gerçek ayet metinlerini yaz
- "ref" formatı: "Yuhanna 3:16"
- "book" Türkçe olsun: "Yuhanna"
- JSON dışında hiçbir şey yazma`;

    const systemPrompt = `Kullanıcı profili: ${userProfile}, Kilise geleneği: ${userChurch}`;

    let groqOk = false;
    try {
      const content = (await groqChat(prompt, systemPrompt, 2048))?.trim();
      if (!content) throw new Error('Boş yanıt');

      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed: MoodAnalysis = JSON.parse(cleanContent);

      if (!parsed.verses || parsed.verses.length === 0) throw new Error('Ayet yok');

      setAnalysis(parsed);
      void persistLastMoodSession(selectedMoods, extra);
      void persistLastMoodResult(parsed);
      setPhase('result');
      groqOk = true;
    } catch (e: unknown) {
      console.error('Groq error:', e);
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('AI hatası (mood):', msg);
      setError(mapMoodError(msg));
    } finally {
      setLoading(false);
    }

    if (groqOk) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [moodText, selectedMoods, userProfile, userChurch, isOnline, mapMoodError, t]);

  const retryRequest = useCallback(() => {
    void analyzeAndSuggest();
  }, [analyzeAndSuggest]);

  const handleReset = useCallback(() => {
    setPhase('input');
    setMoodText('');
    setSelectedMoods([]);
    setAnalysis(null);
    setError(null);
    setLoading(false);
    setMoodInputFocused(false);
    inputRef.current?.blur();
  }, []);

  const canSubmit = selectedMoods.length >= 1 || moodText.trim().length >= 3;

  const moodLen = moodText.length;
  const charCountColor = moodLen >= 250 ? ACCENT : colors.textSecondary;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('goBackA11y')}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('moodTitle')}</Text>
          <Text style={styles.headerSub}>{t('moodSubtitle')}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Input phase */}
      {phase === 'input' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isOnline ? (
              <View style={styles.offlineInfo}>
                <Ionicons name="wifi-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.offlineInfoText}>{t('moodOfflineBanner')}</Text>
              </View>
            ) : null}
            <View style={styles.greetingWrap}>
              <Ionicons
                name="heart-outline"
                size={28}
                color={ACCENT}
                style={styles.greetingHeartIcon}
              />
              <Text style={styles.greetingTitle}>{t('moodGreetingTitle')}</Text>
              <Text style={styles.greetingDesc}>{t('moodGreetingDesc')}</Text>
            </View>

            {/* Hızlı seçim chip'leri + limit notu */}
            <View style={styles.chipsSection}>
              <Animated.View
                style={[
                  styles.moodChipsWrap,
                  { transform: [{ translateX: chipsShakeX }] },
                ]}
              >
                {MOOD_SUGGESTIONS.map((mood) => {
                  const selected = selectedMoods.includes(mood.labelKey);
                  return (
                    <TouchableOpacity
                      key={mood.labelKey}
                      style={[styles.moodChip, selected && styles.moodChipSelected]}
                      onPress={() => {
                        setSelectedMoods((prev) => {
                          if (prev.includes(mood.labelKey)) {
                            Haptics.selectionAsync();
                            return prev.filter((l) => l !== mood.labelKey);
                          }
                          if (prev.length >= 3) {
                            runChipsShake();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            return prev;
                          }
                          Haptics.selectionAsync();
                          return [...prev, mood.labelKey];
                        });
                      }}
                    >
                      <Ionicons
                        name={mood.icon}
                        size={16}
                        color={selected ? ACCENT : colors.textSecondary}
                      />
                      <Text
                        style={[styles.moodChipText, selected && styles.moodChipTextSelected]}
                      >
                        {t(mood.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
              <Text style={styles.moodLimitHint}>{t('moodLimitHint')}</Text>
            </View>

            {/* Metin girişi */}
            <View style={styles.inputWrap}>
              <View style={styles.inputInner}>
                <TextInput
                  ref={inputRef}
                  style={[styles.moodInput, moodInputFocused && styles.moodInputFocused]}
                  placeholder={t('moodPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={moodText}
                  onChangeText={(v) => setMoodText(v.slice(0, 300))}
                  onFocus={() => setMoodInputFocused(true)}
                  onBlur={() => setMoodInputFocused(false)}
                  multiline
                  textAlignVertical="top"
                  maxLength={300}
                />
                <Text style={[styles.charCount, { color: charCountColor }]} pointerEvents="none">
                  {moodText.length} / 300
                </Text>
              </View>
            </View>

            {/* Gönder butonu */}
            <TouchableOpacity
              style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled, { opacity: loading ? 0.7 : 1 }]}
              onPress={analyzeAndSuggest}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFF8EE" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color={ACCENT_LIGHT} />
                  <Text style={styles.submitBtnText}>{t('moodFindVerse')}</Text>
                </>
              )}
            </TouchableOpacity>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
                <TouchableOpacity onPress={retryRequest} style={{ marginTop: 8 }}>
                  <Text style={styles.errorRetryText}>{t('moodRetry')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.privacyNoteRow}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.privacyNote}>{t('moodPrivacyNote')}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Result phase */}
      {phase === 'result' && analysis && (
        <ResultView
          analysis={analysis}
          onReset={handleReset}
          styles={styles}
          colors={colors}
          isFavorite={isFavorite}
          refreshFavorites={refreshFavorites}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(colors: ThemeColors, fonts: AppFonts) {
  const A = ACCENT;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, color: colors.text, fontFamily: fonts.regular },
    headerSub: {
      fontSize: 11, color: A, fontFamily: fonts.regular,
      letterSpacing: 0.05, marginTop: 1,
    },
    greetingWrap: { gap: 0, alignItems: 'center' },
    greetingHeartIcon: { marginBottom: 8, alignSelf: 'center' },
    greetingTitle: {
      fontSize: 26,
      color: colors.text,
      fontFamily: fonts.regular,
      letterSpacing: -0.01,
      textAlign: 'center',
    },
    greetingDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: 8,
    },
    chipsSection: { gap: 8 },
    moodChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    moodChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    moodChipSelected: {
      borderColor: ACCENT,
      backgroundColor: `${ACCENT}25`,
    },
    moodChipText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
    },
    moodChipTextSelected: {
      color: ACCENT,
    },
    inputWrap: { gap: 0 },
    inputInner: { position: 'relative' },
    moodInput: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      paddingBottom: 36,
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.regular,
      minHeight: 100,
      maxHeight: 160,
      lineHeight: 26,
      textAlignVertical: 'top',
    },
    moodInputFocused: {
      borderColor: ACCENT,
    },
    charCount: {
      position: 'absolute',
      right: 14,
      bottom: 10,
      fontSize: 12,
      fontFamily: fonts.regular,
    },
    submitBtn: {
      backgroundColor: ACCENT,
      borderRadius: 12,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      opacity: 1,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { fontSize: 16, color: ACCENT_LIGHT, fontFamily: fonts.medium },
    moodLimitHint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      fontFamily: fonts.regular,
    },
    privacyNoteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 8,
    },
    privacyNote: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      flexShrink: 1,
    },
    errorBox: {
      backgroundColor: '#E5737320',
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    errorBoxText: {
      color: '#E57373',
      fontSize: 13,
      textAlign: 'center',
      fontFamily: fonts.regular,
    },
    errorRetryText: {
      color: ACCENT,
      textAlign: 'center',
      fontSize: 13,
      fontFamily: fonts.regular,
    },
    offlineInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: `${ACCENT}1A`,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    offlineInfoText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: fonts.regular,
      textAlign: 'center',
      flexShrink: 1,
    },
    loadingWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 24, paddingHorizontal: 40,
    },
    loadingTitle: {
      fontSize: 18, color: colors.text, fontFamily: fonts.regular, textAlign: 'center',
    },
    loadingDesc: {
      fontSize: 14, color: colors.textMuted, fontStyle: 'italic',
      fontFamily: fonts.italic, textAlign: 'center',
    },
    emotionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      borderWidth: 0.5,
      borderColor: `${A}40`,
    },
    emotionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    emotionBadge: {
      backgroundColor: `${A}1F`,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 0.5,
      borderColor: `${A}4D`,
    },
    emotionBadgeText: { fontSize: 13, color: A, fontFamily: fonts.medium },
    emotionIntensity: {
      fontSize: 12, color: colors.textMuted, fontStyle: 'italic', fontFamily: fonts.italic,
    },
    encouragementText: {
      fontSize: 15, color: colors.text, fontStyle: 'italic', lineHeight: 24, fontFamily: fonts.italic,
    },
    sectionHeader: { gap: 4, paddingHorizontal: 4 },
    sectionLabel: { fontSize: 11, letterSpacing: 0.2, color: A, fontFamily: fonts.medium },
    sectionDesc: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', fontFamily: fonts.italic },
    verseCard: {
      backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 10,
      borderWidth: 0.5, borderColor: colors.border, position: 'relative',
    },
    verseCardNum: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: `${A}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verseCardNumText: { fontSize: 11, color: A, fontFamily: fonts.medium },
    verseCardRef: { fontSize: 12, color: A, letterSpacing: 0.1, fontFamily: fonts.medium },
    verseCardQuote: {
      fontSize: 40,
      color: A,
      opacity: 0.25,
      lineHeight: 32,
      fontFamily: fonts.regular,
    },
    verseCardText: {
      fontSize: 16, fontStyle: 'italic', color: colors.text, lineHeight: 26, fontFamily: fonts.italic,
    },
    verseCardReason: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: `${A}0D`,
      borderRadius: 8,
      padding: 10,
      borderWidth: 0.5,
      borderColor: `${A}26`,
    },
    verseCardReasonText: {
      flex: 1, fontSize: 12, color: colors.textMuted,
      fontStyle: 'italic', lineHeight: 18, fontFamily: fonts.italic,
    },
    verseCardActions: {
      flexDirection: 'row', gap: 16,
      paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.border, marginTop: 4,
    },
    verseAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
    verseActionText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.regular },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderWidth: 0.5,
      borderColor: `${A}4D`,
      borderRadius: 12,
    },
    resetBtnText: { fontSize: 14, color: A, fontFamily: fonts.regular },
  });
}

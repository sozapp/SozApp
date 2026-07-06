import { useHaptics } from '@/hooks/useHaptics';
import { usePremium } from '@/hooks/usePremium';
import { initPurchases, purchasePremium, restorePurchases } from '@/constants/purchases';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#0A0A08';
const ACCENT = '#C4956A';
const TEXT = '#E8E0D0';
const MUTED = 'rgba(232,224,208,0.5)';
const STORAGE_CURRENCY = '@soz/currency';

const FEATURE_LINES = [
  "Sınırsız AI sohbet (Söz'e Sor)",
  'Tüm okuma planları',
  'Gelişmiş ayet kartı temaları',
  'Çeviri karşılaştırma',
  'Kilise grup modu',
  'Reklamsız deneyim',
  'Cloud sync (tüm cihazlar)',
];

const DONATION_URL = 'https://sozapp.com/bagis';

type BillingPeriod = 'monthly' | 'yearly';
type Currency = 'TRY' | 'EUR';

const TrialIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke="#C4956A"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

export default function PaywallScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { refreshPremium } = usePremium();
  const haptics = useHaptics();
  const [period, setPeriod] = useState<BillingPeriod>('yearly');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    initPurchases();
  }, []);

  useEffect(() => {
    try {
      AsyncStorage.getItem(STORAGE_CURRENCY).then((val) => {
        if (val === 'EUR' || val === 'TRY') setCurrency(val);
      });
    } catch {
      /* ignore */
    }
  }, []);

  const setCurrencyAndSave = useCallback((c: Currency) => {
    try {
      setCurrency(c);
      AsyncStorage.setItem(STORAGE_CURRENCY, c).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  const handleActivate = useCallback(async () => {
    if (isPurchasing) return;
    try {
      haptics.medium();
    } catch {
      /* ignore */
    }
    try {
      setIsPurchasing(true);
      const success = await purchasePremium(period);
      if (!success) return;
      await refreshPremium();
      router.back();
    } catch {
      /* ignore */
    } finally {
      setIsPurchasing(false);
    }
  }, [refreshPremium, router, haptics, period, isPurchasing]);

  const handleRestore = useCallback(async () => {
    if (isRestoring) return;
    try {
      setIsRestoring(true);
      const restored = await restorePurchases();
      if (!restored) return;
      await refreshPremium();
      router.back();
    } catch {
      /* ignore */
    } finally {
      setIsRestoring(false);
    }
  }, [refreshPremium, isRestoring, router]);

  const openDonation = useCallback(() => {
    try {
      Linking.openURL(DONATION_URL);
    } catch {
      /* ignore */
    }
  }, []);

  const isTRY = currency === 'TRY';
  const handleSubscribe = handleActivate;
  const swipeBack = useSwipeBack();

  return (
    <View style={styles.safe} {...swipeBack}>
      <SafeAreaView style={styles.safeInner} edges={['top']}>
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <View style={styles.headerCenter}>
            <Svg width={48} height={48} viewBox="0 0 40 40" fill="none">
              <Path
                d="M27 11 C27 11 13 11 13 20 C13 29 27 29 27 29"
                stroke={ACCENT}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <Line x1="13" y1="11" x2="27" y2="11" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" />
              <Line x1="13" y1="29" x2="27" y2="29" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" />
              <Circle cx="20" cy="20" r="2" fill={ACCENT} />
            </Svg>
            <Text style={styles.headTitle}>Premium&apos;a Geç</Text>
            <Text style={styles.headSubtitle}>Tüm özelliklerin kilidini aç</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={14}>
            <Ionicons name="close" size={28} color={TEXT} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.featureList}>
            {FEATURE_LINES.map((line) => (
              <View key={line} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={22} color={ACCENT} style={styles.featureCheck} />
                <Text style={styles.featureText}>{line}</Text>
              </View>
            ))}
          </View>

          <View style={styles.currencyRow}>
            <Pressable
              style={[styles.currencyBtn, isTRY && styles.currencyBtnActive]}
              onPress={() => setCurrencyAndSave('TRY')}
            >
              <Text style={[styles.currencyBtnText, isTRY && styles.currencyBtnTextActive]}>₺ TRY</Text>
            </Pressable>
            <Pressable
              style={[styles.currencyBtn, !isTRY && styles.currencyBtnActive]}
              onPress={() => setCurrencyAndSave('EUR')}
            >
              <Text style={[styles.currencyBtnText, !isTRY && styles.currencyBtnTextActive]}>€ EUR</Text>
            </Pressable>
          </View>

          <View style={styles.trialBanner}>
            <View style={styles.trialIconWrap}>
              <TrialIcon />
            </View>
            <View style={styles.trialTextWrap}>
              <Text style={styles.trialTitle}>7 Gün Tamamen Ücretsiz</Text>
              <Text style={styles.trialDesc}>Kart bilgisi gerekli · İstediğinde iptal</Text>
            </View>
          </View>

          <View style={styles.periodRow}>
            <TouchableOpacity
              onPress={() => {
                setPeriod('yearly');
                void Haptics.selectionAsync();
              }}
              style={[styles.priceCard, period === 'yearly' && styles.priceCardActive]}
              activeOpacity={0.85}
            >
              {period === 'yearly' && (
                <View style={styles.planCheck}>
                  <Ionicons name="checkmark-circle" size={20} color="#C4956A" />
                </View>
              )}
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>EN POPÜLER</Text>
              </View>
              <View style={styles.priceCardTop}>
                <Text style={styles.planName}>Yıllık</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>{isTRY ? '₺' : '€'}</Text>
                  <Text style={styles.priceAmount}>{isTRY ? '499' : '24,99'}</Text>
                  <Text style={styles.pricePeriod}>/yıl</Text>
                </View>
                <Text style={styles.priceMonthly}>
                  {isTRY ? 'Aylık yalnızca ₺41,58' : 'Aylık yalnızca €2,08'}
                </Text>
              </View>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>{isTRY ? '%47 tasarruf' : '%74 tasarruf'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPeriod('monthly');
                void Haptics.selectionAsync();
              }}
              style={[styles.priceCard, period === 'monthly' && styles.priceCardActive]}
              activeOpacity={0.85}
            >
              {period === 'monthly' && (
                <View style={styles.planCheck}>
                  <Ionicons name="checkmark-circle" size={20} color="#C4956A" />
                </View>
              )}
              <View style={styles.priceCardTop}>
                <Text style={styles.planName}>Aylık</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>{isTRY ? '₺' : '€'}</Text>
                  <Text style={styles.priceAmount}>{isTRY ? '79' : '7,99'}</Text>
                  <Text style={styles.pricePeriod}>/ay</Text>
                </View>
                <Text style={styles.priceMonthly}>İstediğin zaman iptal</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Pressable style={styles.donateBlock} onPress={openDonation}>
            <Text style={styles.donateLine1}>Premium almak istemiyor musun?</Text>
            <Text style={styles.donateLine2}>Bağış yaparak da destekleyebilirsin →</Text>
          </Pressable>

          <View style={styles.trustRow}>
            <View style={styles.trustItemRow}>
              <Ionicons name="lock-closed-outline" size={16} color={ACCENT} />
              <Text style={styles.trustItem}>Güvenli ödeme</Text>
            </View>
            <Text style={styles.trustSep}> · </Text>
            <View style={styles.trustItemRow}>
              <Ionicons name="arrow-undo-outline" size={16} color={ACCENT} />
              <Text style={styles.trustItem}>İptal istediğinde</Text>
            </View>
            <Text style={styles.trustSep}> · </Text>
            <View style={styles.trustItemRow}>
              <Ionicons name="star-outline" size={16} color={ACCENT} />
              <Text style={styles.trustItem}>7 gün ücretsiz dene</Text>
            </View>
          </View>

          <Text style={styles.legal}>
            Abonelik otomatik yenilenir.{'\n'}
            İstediğiniz zaman iptal edebilirsiniz.
          </Text>
        </ScrollView>

        <View style={styles.stickyBottom}>
          <LinearGradient
            colors={['transparent', `${colors.background}CC`, colors.background]}
            style={styles.stickyGradient}
            pointerEvents="none"
          />
          <TouchableOpacity
            style={styles.mainBtn}
            onPress={handleSubscribe}
            disabled={isPurchasing}
            activeOpacity={0.88}
          >
            <View style={styles.mainBtnInner}>
              <Text style={styles.mainBtnText}>
                {isPurchasing ? 'Satın Alma İşleniyor...' : 'Satın Al'}
              </Text>
              <Text style={styles.mainBtnSub}>
                {period === 'monthly' ? 'Aylık plan' : 'Yıllık plan'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#0A0A08" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isRestoring}
            activeOpacity={0.82}
          >
            <Text style={styles.restoreBtnText}>
              {isRestoring ? 'Geri Yükleniyor...' : 'Satın Alımları Geri Yükle'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.stickyNote}>Kart bilgisi güvenle saklanır · Apple ile ödeme</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  safeInner: {
    flex: 1,
    backgroundColor: BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerSpacer: {
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitle: {
    fontFamily: fonts.thin,
    fontSize: 28,
    color: TEXT,
    marginTop: 10,
    textAlign: 'center',
  },
  headSubtitle: {
    fontFamily: fonts.italic,
    fontSize: 15,
    color: MUTED,
    marginTop: 6,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  featureList: {
    marginTop: 8,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingRight: 8,
  },
  featureCheck: {
    marginRight: 12,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: TEXT,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(196,149,80,0.35)',
    alignItems: 'center',
  },
  currencyBtnActive: {
    backgroundColor: 'rgba(196,149,80,0.15)',
    borderColor: ACCENT,
  },
  currencyBtnText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: MUTED,
  },
  currencyBtnTextActive: {
    color: ACCENT,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(196,149,80,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,149,80,0.3)',
    marginBottom: 20,
  },
  trialIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(196,149,80,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialTextWrap: {
    flex: 1,
    gap: 4,
  },
  trialTitle: {
    fontSize: 15,
    color: TEXT,
    fontFamily: fonts.medium,
    letterSpacing: -0.01,
  },
  trialDesc: {
    fontSize: 12,
    color: MUTED,
    fontStyle: 'italic',
    fontFamily: fonts.italic,
    marginTop: 2,
  },
  priceCard: {
    flex: 1,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(196,149,80,0.2)',
    backgroundColor: 'rgba(26,22,18,0.6)',
    position: 'relative',
    overflow: 'hidden',
  },
  priceCardActive: {
    borderColor: '#C4956A',
    backgroundColor: 'rgba(196,149,80,0.1)',
    shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  planCheck: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: ACCENT,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularText: {
    fontFamily: fonts.medium,
    fontSize: 8,
    color: BG,
    letterSpacing: 0.15,
  },
  priceCardTop: {
    gap: 4,
    marginTop: 4,
  },
  planName: {
    fontSize: 11,
    color: MUTED,
    fontFamily: fonts.regular,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    marginTop: 4,
  },
  priceCurrency: {
    fontSize: 18,
    color: TEXT,
    fontFamily: fonts.regular,
    marginBottom: 3,
  },
  priceAmount: {
    fontSize: 36,
    color: TEXT,
    fontFamily: fonts.medium,
    letterSpacing: -0.03,
    lineHeight: 40,
  },
  pricePeriod: {
    fontSize: 14,
    color: MUTED,
    fontFamily: fonts.regular,
    marginBottom: 6,
  },
  priceMonthly: {
    fontSize: 12,
    color: '#C4956A',
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    marginTop: 2,
  },
  saveBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(124,184,124,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(124,184,124,0.3)',
    alignSelf: 'flex-start',
  },
  saveText: {
    fontSize: 11,
    color: '#7CB87C',
    fontFamily: fonts.regular,
  },
  mainBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,220,160,0.35)',
  },
  mainBtnInner: {
    gap: 3,
  },
  mainBtnText: {
    fontSize: 17,
    color: '#0A0A08',
    fontFamily: fonts.medium,
    letterSpacing: 0.01,
  },
  mainBtnSub: {
    fontSize: 12,
    color: 'rgba(10,10,8,0.6)',
    fontFamily: fonts.regular,
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 0,
  },
  stickyGradient: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    height: 80,
  },
  stickyNote: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: fonts.italic,
    marginTop: 8,
  },
  restoreBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  restoreBtnText: {
    fontSize: 13,
    color: ACCENT,
    fontFamily: fonts.regular,
  },
  donateBlock: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  donateLine1: {
    fontFamily: fonts.italic,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 4,
  },
  donateLine2: {
    fontFamily: fonts.italic,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  trustItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustItem: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: MUTED,
  },
  trustSep: {
    fontSize: 12,
    color: MUTED,
  },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

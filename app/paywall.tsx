import { useHaptics } from '@/hooks/useHaptics';
import { usePremium } from '@/hooks/usePremium';
import { useTheme } from '@/hooks/useTheme';
import {
  getPremiumPricing,
  initPurchases,
  purchasePremium,
  restorePurchases,
  type PremiumPricing,
} from '@/constants/purchases';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';
const ACCENT_DARK_TEXT = '#0A0A08';

// Mağazadan gerçek fiyat çekilemediğinde (örn. Expo Go / geliştirme ortamı)
// gösterilecek yaklaşık değerler — gerçek fiyat App/Play Store'dan gelir.
const FALLBACK_YEARLY_PRICE = '₺499/yıl';
const FALLBACK_MONTHLY_PRICE = '₺79/ay';

const DONATION_URL = 'https://sozapp.com/bagis';

type BillingPeriod = 'monthly' | 'yearly';

type Feature = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
};

const FEATURES: Feature[] = [
  {
    icon: 'chatbubble-ellipses-outline',
    title: "Sınırsız Söz'e Sor",
    desc: 'Ayetler hakkında istediğin kadar soru sor',
  },
  { icon: 'book-outline', title: 'Tüm okuma planları', desc: 'Kısıtlama olmadan her plana eriş' },
  { icon: 'color-palette-outline', title: 'Gelişmiş ayet kartı temaları', desc: 'Paylaşımların daha özgün görünsün' },
  { icon: 'swap-horizontal-outline', title: 'Çeviri karşılaştırma', desc: 'Farklı çevirileri yan yana oku' },
  { icon: 'people-outline', title: 'Kilise grup modu', desc: 'Topluluğunla birlikte okuyun' },
  { icon: 'ban-outline', title: 'Reklamsız deneyim', desc: 'Kesintisiz, sakin bir okuma' },
  { icon: 'cloud-done-outline', title: 'Cloud sync', desc: 'Notların tüm cihazlarında seninle' },
];

const TrialIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke={ACCENT}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

/** "%499/yıl" gibi yerelleştirilmiş bir fiyat string'inden sayıyı çıkarır (kaba fallback, price alanı yoksa). */
function parseApproxNumber(priceString: string): number | null {
  const match = priceString.match(/[\d.,]+/);
  if (!match) return null;
  const normalized = match[0].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

export default function PaywallScreen() {
  const safeBack = useSafeBack();
  const { colors, fonts } = useTheme();
  const { refreshPremium } = usePremium();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<BillingPeriod>('yearly');
  const [pricing, setPricing] = useState<PremiumPricing | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    initPurchases();
    getPremiumPricing().then(setPricing);
  }, []);

  const yearlyPrice = pricing?.yearly?.priceString ?? FALLBACK_YEARLY_PRICE;
  const monthlyPrice = pricing?.monthly?.priceString ?? FALLBACK_MONTHLY_PRICE;

  const savingsPct = useMemo(() => {
    const yearlyNum = pricing?.yearly?.price ?? parseApproxNumber(yearlyPrice);
    const monthlyNum = pricing?.monthly?.price ?? parseApproxNumber(monthlyPrice);
    if (!yearlyNum || !monthlyNum) return null;
    const fullYearCost = monthlyNum * 12;
    if (fullYearCost <= yearlyNum) return null;
    const pct = Math.round((1 - yearlyNum / fullYearCost) * 100);
    return pct > 0 ? pct : null;
  }, [pricing, yearlyPrice, monthlyPrice]);

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
      safeBack();
    } catch {
      /* ignore */
    } finally {
      setIsPurchasing(false);
    }
  }, [refreshPremium, haptics, period, isPurchasing, safeBack]);

  const handleRestore = useCallback(async () => {
    if (isRestoring) return;
    try {
      setIsRestoring(true);
      const restored = await restorePurchases();
      if (!restored) return;
      await refreshPremium();
      safeBack();
    } catch {
      /* ignore */
    } finally {
      setIsRestoring(false);
    }
  }, [refreshPremium, isRestoring, safeBack]);

  const openDonation = useCallback(() => {
    try {
      Linking.openURL(DONATION_URL);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
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
        <Pressable
          onPress={() => safeBack()}
          style={styles.closeBtn}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headTitle, { color: colors.text, fontFamily: fonts.medium }]}>
          Söz'le bağını derinleştir
        </Text>
        <Text style={[styles.headSubtitle, { color: colors.textMuted, fontFamily: fonts.italic }]}>
          Premium ile hiçbir sınır yok
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${ACCENT}18`, borderColor: `${ACCENT}35` }]}>
                <Ionicons name={f.icon} size={18} color={ACCENT} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: colors.text, fontFamily: fonts.medium }]}>
                  {f.title}
                </Text>
                <Text style={[styles.featureDesc, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                  {f.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.trialBanner,
            { backgroundColor: `${ACCENT}0F`, borderColor: `${ACCENT}30` },
          ]}
        >
          <View style={[styles.trialIconWrap, { backgroundColor: `${ACCENT}14`, borderColor: `${ACCENT}30` }]}>
            <TrialIcon />
          </View>
          <View style={styles.trialTextWrap}>
            <Text style={[styles.trialTitle, { color: colors.text, fontFamily: fonts.medium }]}>
              7 Gün Tamamen Ücretsiz
            </Text>
            <Text style={[styles.trialDesc, { color: colors.textMuted, fontFamily: fonts.italic }]}>
              Kart bilgisi gerekli · İstediğinde iptal
            </Text>
          </View>
        </View>

        <View style={styles.periodRow}>
          <TouchableOpacity
            onPress={() => {
              setPeriod('yearly');
              haptics.selection();
            }}
            style={[
              styles.priceCard,
              { borderColor: `${ACCENT}30`, backgroundColor: colors.card },
              period === 'yearly' && styles.priceCardActive,
            ]}
            activeOpacity={0.85}
          >
            {period === 'yearly' && (
              <View style={styles.planCheck}>
                <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
              </View>
            )}
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>EN POPÜLER</Text>
            </View>
            <View style={styles.priceCardTop}>
              <Text style={[styles.planName, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                Yıllık
              </Text>
              <Text style={[styles.priceAmount, { color: colors.text, fontFamily: fonts.medium }]}>
                {yearlyPrice}
              </Text>
              {savingsPct != null && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>%{savingsPct} tasarruf</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setPeriod('monthly');
              haptics.selection();
            }}
            style={[
              styles.priceCard,
              { borderColor: colors.border, backgroundColor: colors.card },
              period === 'monthly' && styles.priceCardActive,
            ]}
            activeOpacity={0.85}
          >
            {period === 'monthly' && (
              <View style={styles.planCheck}>
                <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
              </View>
            )}
            <View style={styles.priceCardTop}>
              <Text style={[styles.planName, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                Aylık
              </Text>
              <Text style={[styles.priceAmount, { color: colors.text, fontFamily: fonts.medium }]}>
                {monthlyPrice}
              </Text>
              <Text style={[styles.priceMonthly, { fontFamily: fonts.italic }]}>
                İstediğin zaman iptal
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={[styles.priceHint, { color: colors.textFaint, fontFamily: fonts.italic }]}>
          Fiyat, hesabının bağlı olduğu App Store/Play Store bölgesine göre gösterilir.
        </Text>

        <View style={styles.trustRow}>
          <View style={styles.trustItemRow}>
            <Ionicons name="lock-closed-outline" size={15} color={ACCENT} />
            <Text style={[styles.trustItem, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              Güvenli ödeme
            </Text>
          </View>
          <Text style={[styles.trustSep, { color: colors.textMuted }]}> · </Text>
          <View style={styles.trustItemRow}>
            <Ionicons name="arrow-undo-outline" size={15} color={ACCENT} />
            <Text style={[styles.trustItem, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              İptal istediğinde
            </Text>
          </View>
          <Text style={[styles.trustSep, { color: colors.textMuted }]}> · </Text>
          <View style={styles.trustItemRow}>
            <Ionicons name="star-outline" size={15} color={ACCENT} />
            <Text style={[styles.trustItem, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              7 gün ücretsiz
            </Text>
          </View>
        </View>

        <Pressable style={styles.donateBlock} onPress={openDonation}>
          <Text style={[styles.donateLine1, { color: colors.textMuted, fontFamily: fonts.italic }]}>
            Premium almak istemiyor musun?
          </Text>
          <Text style={[styles.donateLine2, { color: colors.textMuted, fontFamily: fonts.italic }]}>
            Bağış yaparak da destekleyebilirsin →
          </Text>
        </Pressable>

        <Text style={[styles.legal, { color: colors.textFaint, fontFamily: fonts.regular }]}>
          Abonelik otomatik yenilenir.{'\n'}
          İstediğiniz zaman iptal edebilirsiniz.
        </Text>
      </ScrollView>

      <View
        style={[
          styles.stickyBottom,
          { borderTopColor: colors.border, paddingBottom: Math.max(20, insets.bottom + 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.mainBtn}
          onPress={handleActivate}
          disabled={isPurchasing}
          activeOpacity={0.88}
        >
          <View style={styles.mainBtnInner}>
            <Text style={styles.mainBtnText}>
              {isPurchasing ? 'İşleniyor...' : 'Ücretsiz Denemeyi Başlat'}
            </Text>
            <Text style={styles.mainBtnSub}>
              {period === 'monthly' ? `Sonra ${monthlyPrice}` : `Sonra ${yearlyPrice}`}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={ACCENT_DARK_TEXT} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={isRestoring}
          activeOpacity={0.82}
        >
          <Text style={[styles.restoreBtnText, { fontFamily: fonts.regular }]}>
            {isRestoring ? 'Geri Yükleniyor...' : 'Satın Alımları Geri Yükle'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.stickyNote, { color: colors.textFaint, fontFamily: fonts.italic }]}>
          Kart bilgisi güvenle saklanır · Apple ile ödeme
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  headerSpacer: {
    width: 26,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 4,
  },
  headSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  featureList: {
    gap: 14,
    marginBottom: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  featureDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 1,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  priceHint: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  trialIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialTextWrap: {
    flex: 1,
    gap: 4,
  },
  trialTitle: {
    fontSize: 15,
    letterSpacing: -0.01,
  },
  trialDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  priceCard: {
    flex: 1,
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  priceCardActive: {
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
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
    fontSize: 8,
    fontWeight: '600',
    color: ACCENT_DARK_TEXT,
    letterSpacing: 0.15,
  },
  priceCardTop: {
    gap: 4,
    marginTop: 4,
  },
  planName: {
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  priceAmount: {
    fontSize: 25,
    letterSpacing: -0.02,
    lineHeight: 29,
  },
  priceMonthly: {
    fontSize: 12,
    color: ACCENT,
    marginTop: 6,
  },
  savingsBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${ACCENT}22`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
  },
  mainBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: ACCENT,
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
    color: ACCENT_DARK_TEXT,
    fontWeight: '600',
    letterSpacing: 0.01,
  },
  mainBtnSub: {
    fontSize: 12,
    color: 'rgba(10,10,8,0.6)',
  },
  stickyBottom: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stickyNote: {
    fontSize: 11,
    textAlign: 'center',
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
  },
  donateBlock: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  donateLine1: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  donateLine2: {
    fontSize: 13,
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
    fontSize: 12,
  },
  trustSep: {
    fontSize: 12,
  },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

import { usePremium } from '@/hooks/usePremium';
import { colors, fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#0A0A08';
const ACCENT = '#C4956A';
const TEXT = '#E8E0D0';
const MUTED = 'rgba(232,224,208,0.5)';

const FEATURES = [
  'Tüm Türkçe çeviriler',
  'Sınırsız okuma planı',
  'Sınırsız not ve vurgulama',
  'Özel ayet kart temaları',
  'Çevrimdışı erişim',
];

type PlanType = 'yearly' | 'monthly';

export default function PaywallScreen() {
  const router = useRouter();
  const { activatePremium } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');

  const handleActivate = useCallback(async () => {
    await activatePremium();
    router.back();
  }, [activatePremium, router]);

  return (
    <View style={styles.safe}>
      <SafeAreaView style={styles.safeInner} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <View style={styles.logoWrap}>
            <Text style={styles.logoS}>S</Text>
            <Text style={styles.premiumLabel}>Premium</Text>
            <Text style={styles.tagline}>Tüm özelliklerin kilidi açılıyor</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={28} color={TEXT} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.featureList}>
            {FEATURES.map((label) => (
              <View key={label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>✦</Text>
                <Text style={styles.featureText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.pricingRow}>
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'yearly' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>En İyi Değer</Text>
              </View>
              <Text style={styles.planTitle}>Yıllık</Text>
              <Text style={styles.planPrice}>₺499 / yıl</Text>
              <Text style={styles.planSub}>Aylık ₺41,58</Text>
            </Pressable>
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={styles.planTitle}>Aylık</Text>
              <Text style={styles.planPrice}>₺79 / ay</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
            onPress={handleActivate}
          >
            <Text style={styles.ctaBtnText}>Premium'a Geç</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.freeLink}>
            <Text style={styles.freeLinkText}>Ücretsiz Devam Et</Text>
          </Pressable>

          <Text style={styles.footer}>
            İstediğin zaman iptal edebilirsin · Gizlilik Politikası
          </Text>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerLeft: { width: 40 },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
  },
  logoS: {
    fontFamily: fonts.thin,
    fontSize: 60,
    color: TEXT,
  },
  premiumLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 2.5,
    color: ACCENT,
    marginTop: 4,
  },
  tagline: {
    fontFamily: fonts.thin,
    fontSize: 28,
    color: TEXT,
    marginTop: 8,
    textAlign: 'center',
  },
  closeBtn: {
    padding: 4,
    width: 40,
    alignItems: 'flex-end',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  featureList: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureIcon: {
    fontSize: 14,
    color: ACCENT,
    marginRight: 12,
  },
  featureText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: TEXT,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  planCard: {
    flex: 1,
    backgroundColor: 'rgba(26,22,18,0.8)',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: ACCENT,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: BG,
  },
  planTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: TEXT,
    marginBottom: 6,
  },
  planPrice: {
    fontFamily: fonts.medium,
    fontSize: 22,
    color: TEXT,
  },
  planSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  ctaBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  ctaBtnPressed: {
    opacity: 0.9,
  },
  ctaBtnText: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.white,
  },
  freeLink: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  freeLinkText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: MUTED,
  },
  footer: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
  },
});

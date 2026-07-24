import Constants, { ExecutionEnvironment } from 'expo-constants';
import Purchases from 'react-native-purchases';
import { trackEvent } from '@/constants/analytics';

let purchasesInitialized = false;

// RevenueCat, Expo Go içinde native mağaza doğrulaması yapamıyor ve gerçek
// (appl_/goog_) key verilirse kendi içinde console.error + throw yapıyor —
// bu da geliştirme sırasında kırmızı LogBox ekranına yol açıyor. Expo Go'da
// sadece test_/rcb_ ile başlayan "Test Store" key'leri destekleniyor, bkz.
// https://rev.cat/sdk-test-store. Uyumsuzsa configure()'ı hiç çağırmayız.
const WEB_COMPATIBLE_KEY_PREFIXES = ['test_', 'rcb_'];

function isRunningInExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export const initPurchases = (): void => {
  if (purchasesInitialized) return;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
  if (!apiKey) {
    return;
  }
  const isTestStoreKey = WEB_COMPATIBLE_KEY_PREFIXES.some((prefix) => apiKey.startsWith(prefix));
  if (isRunningInExpoGo() && !isTestStoreKey) {
    return;
  }
  try {
    Purchases.configure({ apiKey });
    purchasesInitialized = true;
  } catch (e) {
    console.warn('RevenueCat configure error:', e);
  }
};

export const isPurchasesConfigured = (): boolean => purchasesInitialized;

export const loginRevenueCat = async (supabaseUserId: string): Promise<void> => {
  initPurchases();
  if (!purchasesInitialized) return;
  try {
    await Purchases.logIn(supabaseUserId);
  } catch (e) {
    console.warn('RevenueCat logIn error:', e);
  }
};

const findPackageByType = (
  offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>,
  packageType: 'monthly' | 'yearly'
) => {
  return offerings.current?.availablePackages.find(
    (pkg) => String(pkg.packageType).toLowerCase() === packageType
  );
};

export type PremiumPricing = {
  monthly: { priceString: string } | null;
  yearly: { priceString: string } | null;
};

/** Mağazadan gerçek, yerelleştirilmiş fiyatları çeker (kullanıcının ülkesine göre App/Play Store belirler). */
export const getPremiumPricing = async (): Promise<PremiumPricing | null> => {
  try {
    initPurchases();
    if (!purchasesInitialized) return null;
    const offerings = await Purchases.getOfferings();
    const monthlyPkg = findPackageByType(offerings, 'monthly');
    const yearlyPkg = findPackageByType(offerings, 'yearly');
    if (!monthlyPkg && !yearlyPkg) return null;
    return {
      monthly: monthlyPkg ? { priceString: monthlyPkg.product.priceString } : null,
      yearly: yearlyPkg ? { priceString: yearlyPkg.product.priceString } : null,
    };
  } catch (e) {
    console.warn('getPremiumPricing error:', e);
    return null;
  }
};

export const purchasePremium = async (
  packageType: 'monthly' | 'yearly'
): Promise<boolean> => {
  try {
    initPurchases();
    const offerings = await Purchases.getOfferings();
    const pkg = findPackageByType(offerings, packageType);
    if (!pkg) throw new Error('Package not found');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active.premium !== undefined;
    if (isPremium) trackEvent('purchase_completed', { package_type: packageType });
    return isPremium;
  } catch (e) {
    console.error('Purchase error:', e);
    return false;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  try {
    initPurchases();
    const info = await Purchases.restorePurchases();
    return info.entitlements.active.premium !== undefined;
  } catch (e) {
    console.error('Restore purchase error:', e);
    return false;
  }
};

export const getRevenueCatPremiumStatus = async (): Promise<boolean> => {
  try {
    initPurchases();
    if (!purchasesInitialized) return false;
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active.premium !== undefined;
  } catch {
    return false;
  }
};

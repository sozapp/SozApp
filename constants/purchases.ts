import Constants, { ExecutionEnvironment } from 'expo-constants';
import Purchases from 'react-native-purchases';

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
    console.log('RevenueCat key missing; purchases disabled');
    return;
  }
  const isTestStoreKey = WEB_COMPATIBLE_KEY_PREFIXES.some((prefix) => apiKey.startsWith(prefix));
  if (isRunningInExpoGo() && !isTestStoreKey) {
    console.log(
      'RevenueCat: Expo Go içinde gerçek mağaza key kullanılamaz, satın almalar bu ortamda devre dışı. ' +
        'Test etmek için bir Test Store key (test_...) kullanın ya da development build oluşturun.'
    );
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

export const purchasePremium = async (
  packageType: 'monthly' | 'yearly'
): Promise<boolean> => {
  try {
    initPurchases();
    const offerings = await Purchases.getOfferings();
    const pkg = findPackageByType(offerings, packageType);
    if (!pkg) throw new Error('Package not found');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active.premium !== undefined;
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

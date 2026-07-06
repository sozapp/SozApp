import Purchases from 'react-native-purchases';

let purchasesInitialized = false;

export const initPurchases = (): void => {
  if (purchasesInitialized) return;
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
  if (!apiKey) {
    console.log('RevenueCat key missing; purchases disabled');
    return;
  }
  Purchases.configure({ apiKey });
  purchasesInitialized = true;
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

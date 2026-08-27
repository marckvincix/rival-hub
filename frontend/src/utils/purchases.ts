import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

// Must match backend HIGHLIGHTS_PLUS_ENTITLEMENT / RevenueCat dashboard entitlement id.
export const HIGHLIGHTS_PLUS_ENTITLEMENT = 'rival_hub_pro';

let configured = false;

// Called once at app startup, before we know whether anyone is logged in,
// so RevenueCat can already report real per-store prices (e.g. for the
// "create a tournament" paywall preview shown to signed-out users).
// configurePurchases() below correctly upgrades this anonymous session to
// the real identified user via Purchases.logIn() once they authenticate,
// rather than re-configuring — RevenueCat's standard anonymous-then-identify
// flow, so nothing is lost by starting anonymous.
export function configureAnonymousPurchases() {
  if (configured) return;
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  if (!apiKey) return;
  Purchases.configure({ apiKey });
  configured = true;
}

export function configurePurchases(appUserID: string) {
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  if (!apiKey) return;

  // Our own user_id doubles as RevenueCat's app_user_id, so webhook events
  // map straight back to a user row with no separate id-mapping table.
  if (!configured) {
    Purchases.configure({ apiKey, appUserID });
    configured = true;
  } else {
    Purchases.logIn(appUserID).catch(() => {});
  }
}

export async function logOutPurchases() {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // no-op: e.g. already logged out
  }
}

export async function hasHighlightsPlus(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[HIGHLIGHTS_PLUS_ENTITLEMENT];
  } catch {
    return false;
  }
}

export async function getHighlightsPlusOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: NonNullable<PurchasesOffering['availablePackages']>[number]): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

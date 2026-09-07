import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

// Must match backend HIGHLIGHTS_PLUS_ENTITLEMENT / RevenueCat dashboard entitlement id.
export const HIGHLIGHTS_PLUS_ENTITLEMENT = 'rival_hub_pro';

// Independent "Grafiche Social" subscription — must match backend
// SOCIAL_GRAPHICS_ENTITLEMENT / RevenueCat dashboard entitlement id.
// This one is NOT the RevenueCat-dashboard "current" offering (Highlights
// Plus already occupies that slot), so it's fetched by its offering
// identifier below instead — see SOCIAL_GRAPHICS_OFFERING_ID.
export const SOCIAL_GRAPHICS_ENTITLEMENT = 'social_graphics';
// Identifier of the RevenueCat Offering that holds the Grafiche Social
// monthly/annual packages. Must match the offering's "Identifier" field
// in the RevenueCat dashboard (Offerings).
export const SOCIAL_GRAPHICS_OFFERING_ID = 'social_graphics';

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

export async function hasSocialGraphicsPlan(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[SOCIAL_GRAPHICS_ENTITLEMENT];
  } catch {
    return false;
  }
}

export async function getSocialGraphicsOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    // Not offerings.current: Highlights Plus already owns that dashboard
    // slot, so Grafiche Social is looked up by its own offering id instead.
    return offerings.all[SOCIAL_GRAPHICS_OFFERING_ID] || null;
  } catch {
    return null;
  }
}

// Real "X% OFF" savings on the annual package vs. paying monthly for a
// year, computed live from actual store prices — never hardcoded, since
// the real per-store price (and any promo) can differ from whatever a
// static design mockup shows. Returns null (hide the badge) rather than a
// wrong number if either package/price isn't available yet.
export function getAnnualDiscountPercent(
  monthlyPkg: PurchasesPackage | null | undefined,
  annualPkg: PurchasesPackage | null | undefined
): number | null {
  const monthlyPrice = monthlyPkg?.product?.price;
  const annualPrice = annualPkg?.product?.price;
  if (!monthlyPrice || !annualPrice) return null;
  const yearlyIfPaidMonthly = monthlyPrice * 12;
  if (yearlyIfPaidMonthly <= 0) return null;
  const discount = 1 - annualPrice / yearlyIfPaidMonthly;
  if (discount <= 0) return null;
  return Math.round(discount * 100);
}

export async function purchasePackage(pkg: NonNullable<PurchasesOffering['availablePackages']>[number]): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

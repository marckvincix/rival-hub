import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import {
  getHighlightsPlusOffering,
  getSocialGraphicsOffering,
  purchasePackage,
  restorePurchases,
  getAnnualDiscountPercent,
  HIGHLIGHTS_PLUS_ENTITLEMENT,
  SOCIAL_GRAPHICS_ENTITLEMENT,
} from '../utils/purchases';
import { useAuthStore } from '../store/authStore';
import { TermsModal } from './TermsModal';
import api from '../utils/api';

const RivalHubLogoWhite = require('../../assets/images/rival-hub-logo-white.png');
const HighlightsBackground = require('../../assets/paywall/highlights-bg.png');
const SocialGraphicsBackground = require('../../assets/paywall/social-graphics-bg.png');

const NEON_GREEN = '#B0F23A';
// Real gradient values from the design reference — used on the CTA button
// and the discount badge (top → bottom). Exported so SocialGraphicFullPreview
// can use the exact same green for its own "Sblocca" button.
export const GREEN_GRADIENT: [string, string] = ['#c9e265', '#89d957'];

type PaywallVariant = 'highlights' | 'social_graphics';

// Everything that differs between the two paywalls — copy comes from the
// existing highlightsPaywall.*/socialGraphicsPaywall.* i18n namespaces
// (already translated in all 7 locales), only the icons and the
// entitlement/offering wiring are hardcoded here per variant.
const VARIANT_CONFIG: Record<PaywallVariant, {
  i18nKey: 'highlightsPaywall' | 'socialGraphicsPaywall';
  entitlement: string;
  // Each entry is [i18n benefit key, icon] — a variant can use any subset
  // of the namespace's benefit1..4 keys, in any order (Grafiche Social's
  // design reference shows 3 of its 4, skipping benefit3).
  benefits: [string, string][];
  fetchOffering: () => Promise<PurchasesOffering | null>;
  // Real photo assets to be dropped in here once available — falls back to
  // a plain dark gradient until then, so the paywall is fully functional
  // and testable before the final artwork exists.
  backgroundImage: ImageSourcePropType | null;
}> = {
  highlights: {
    i18nKey: 'highlightsPaywall',
    entitlement: HIGHLIGHTS_PLUS_ENTITLEMENT,
    benefits: [
      ['benefit1', 'image-outline'],
      ['benefit2', 'cloud-outline'],
      ['benefit3', 'videocam-outline'],
      ['benefit4', 'lock-closed-outline'],
    ],
    fetchOffering: getHighlightsPlusOffering,
    backgroundImage: HighlightsBackground,
  },
  social_graphics: {
    i18nKey: 'socialGraphicsPaywall',
    entitlement: SOCIAL_GRAPHICS_ENTITLEMENT,
    // Design reference shows 3 of the 4 available benefits — skips
    // benefit3 (unlimited exports), keeps 1/2/4 in order.
    benefits: [
      ['benefit1', 'images-outline'],
      ['benefit2', 'download-outline'],
      ['benefit4', 'football-outline'],
    ],
    fetchOffering: getSocialGraphicsOffering,
    backgroundImage: SocialGraphicsBackground,
  },
};

interface FullPagePaywallProps {
  visible: boolean;
  variant: PaywallVariant;
  onClose: () => void;
  onSubscribed: () => void;
}

export function FullPagePaywall({ visible, variant, onClose, onSubscribed }: FullPagePaywallProps) {
  const { t } = useTranslation();
  // Read insets explicitly rather than relying on <SafeAreaView>'s
  // automatic behavior — inside a <Modal> (its own native window on iOS)
  // that auto-behavior can silently resolve to 0, pushing content (the
  // close button in particular) up under the notch/Dynamic Island.
  const insets = useSafeAreaInsets();
  const config = VARIANT_CONFIG[variant];
  const tt = (key: string, fallback?: string) => t(`${config.i18nKey}.${key}`, fallback as string);

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [selected, setSelected] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoadingOffering(true);
    config.fetchOffering()
      .then((off) => setOffering(off))
      .finally(() => setLoadingOffering(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, variant]);

  const monthlyPkg = offering?.availablePackages.find((p) => p.packageType === 'MONTHLY') || null;
  const annualPkg = offering?.availablePackages.find((p) => p.packageType === 'ANNUAL') || null;
  const selectedPkg = selected === 'annual' ? annualPkg : monthlyPkg;
  // Real, live-computed savings — never a hardcoded number, since the
  // actual store price (or a promo) can differ from any static reference.
  const discountPercent = getAnnualDiscountPercent(monthlyPkg, annualPkg);
  const annualMonthlyEquivalent = annualPkg?.product.pricePerMonth
    ? annualPkg.product.pricePerMonth.toFixed(2).replace('.', ',')
    : null;

  const benefits = config.benefits.map(([key, icon]) => ({
    icon: icon as keyof typeof Ionicons.glyphMap,
    text: tt(key),
  }));

  const refreshBackendPlan = async () => {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await api.get('/api/auth/me');
    } catch {
      // ignore
    }
    await useAuthStore.getState().checkAuth();
  };

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const info = await purchasePackage(selectedPkg);
      if (info.entitlements.active[config.entitlement]) {
        await refreshBackendPlan();
        onSubscribed();
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert(tt('purchaseFailedTitle'), e?.message || tt('purchaseFailedGeneric'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info.entitlements.active[config.entitlement]) {
        await refreshBackendPlan();
        onSubscribed();
      } else {
        Alert.alert(tt('noSubscriptionTitle'), tt('noSubscriptionMessage'));
      }
    } catch (e: any) {
      Alert.alert(tt('restoreFailedTitle'), e?.message || tt('purchaseFailedGeneric'));
    } finally {
      setRestoring(false);
    }
  };

  const Background: React.ComponentType<any> = config.backgroundImage ? ImageBackground : View;
  const backgroundProps = config.backgroundImage ? { source: config.backgroundImage } : {};

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
      <Background {...(backgroundProps as any)} style={styles.background} resizeMode="cover">
        {/* Fades the photo to solid black toward the bottom so the price
            cards/button stay legible over any image — matches the design
            reference regardless of which photo ends up here. */}
        <LinearGradient
          colors={config.backgroundImage
            ? ['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)', '#000']
            : ['#232323', '#141414', '#000']}
          locations={config.backgroundImage ? [0, 0.42, 0.72, 1] : undefined}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.topRow}>
            <Image source={RivalHubLogoWhite} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.headline}>
              <Text style={[styles.headlineText, styles.headlineWhite]} numberOfLines={1} adjustsFontSizeToFit>
                {tt('headlineLine1')}
              </Text>
              <Text style={[styles.headlineText, styles.headlineGreen]} numberOfLines={1} adjustsFontSizeToFit>
                {tt('headlineLine2')}
              </Text>
            </View>

            <View style={styles.benefits}>
              {benefits.map((b) => (
                <View key={b.text} style={styles.benefitRow}>
                  <Ionicons name={b.icon} size={19} color="#FFF" style={styles.benefitIcon} />
                  <Text style={styles.benefitText}>{b.text.toUpperCase()}</Text>
                </View>
              ))}
            </View>

            {loadingOffering ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            ) : !offering || offering.availablePackages.length === 0 ? (
              <Text style={styles.unavailableText}>{tt('unavailable')}</Text>
            ) : (
              <View style={styles.packages}>
                {annualPkg && (
                  <TouchableOpacity
                    style={[styles.packageCard, selected === 'annual' && styles.packageCardActive]}
                    onPress={() => setSelected('annual')}
                    activeOpacity={0.85}
                  >
                    {discountPercent !== null && (
                      <LinearGradient colors={GREEN_GRADIENT} style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>{discountPercent}% OFF</Text>
                      </LinearGradient>
                    )}
                    <View style={styles.packageRow}>
                      <View style={[styles.radio, selected === 'annual' && styles.radioActive]}>
                        {selected === 'annual' && <Ionicons name="checkmark" size={14} color="#000" />}
                      </View>
                      <View style={styles.packageLabelCol}>
                        <Text style={styles.packageLabel}>{tt('annual').toUpperCase()}</Text>
                        {annualMonthlyEquivalent && (
                          <Text style={styles.packageSub}>solo {annualMonthlyEquivalent}€/mese</Text>
                        )}
                      </View>
                      <Text style={styles.packagePrice}>{annualPkg.product.priceString}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {monthlyPkg && (
                  <TouchableOpacity
                    style={[styles.packageCard, selected === 'monthly' && styles.packageCardActive]}
                    onPress={() => setSelected('monthly')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.packageRow}>
                      <View style={[styles.radio, selected === 'monthly' && styles.radioActive]}>
                        {selected === 'monthly' && <Ionicons name="checkmark" size={14} color="#000" />}
                      </View>
                      <Text style={[styles.packageLabel, { flex: 1 }]}>{tt('monthly').toUpperCase()}</Text>
                      <Text style={styles.packagePrice}>{monthlyPkg.product.priceString}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.subscribeBtn, (!selectedPkg || purchasing) && styles.subscribeBtnDisabled]}
              onPress={handlePurchase}
              disabled={!selectedPkg || purchasing}
              activeOpacity={0.85}
            >
              <LinearGradient colors={GREEN_GRADIENT} style={styles.subscribeBtnGradient}>
                {purchasing ? <ActivityIndicator color="#000" /> : <Text style={styles.subscribeBtnText}>{tt('subscribe').toUpperCase()}</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {/* Apple requires an auto-renewable subscription's purchase
                screen to show a renewal disclosure plus working links to
                Terms of Use and Privacy Policy (App Review Guideline
                3.1.2) — RevenueCat's own paywall builder adds these by
                default, so this custom screen needs them explicitly too. */}
            <Text style={styles.renewalNote}>{tt('renewalNote')}</Text>

            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => setShowTerms(true)}>
                <Text style={styles.legalLinkText}>{tt('termsLink')}</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>·</Text>
              <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreLink}>
                <Text style={styles.legalLinkText}>
                  {restoring ? tt('restoring') : tt('restorePurchases')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Background>
      </View>

      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  background: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  logo: { width: 118, height: 34 },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingBottom: Platform.select({ ios: 8, default: 20 }),
  },
  headline: { marginBottom: 22 },
  headlineText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 52,
    lineHeight: 54,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    transform: [{ skewX: '-6deg' }],
  },
  headlineWhite: { color: '#FFF' },
  headlineGreen: { color: NEON_GREEN, alignSelf: 'flex-end' },
  benefits: { gap: 12, marginBottom: 20 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  benefitIcon: { marginTop: 1 },
  benefitText: {
    flex: 1,
    fontFamily: 'Anton_400Regular',
    fontSize: 14.5,
    lineHeight: 18,
    color: '#FFF',
    letterSpacing: 0.2,
  },
  loadingBox: { paddingVertical: 16, alignItems: 'center' },
  unavailableText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  packages: { gap: 10, marginBottom: 16 },
  packageCard: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  packageCardActive: { borderColor: '#FFF' },
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: '#FFF' },
  packageLabelCol: { flex: 1 },
  packageLabel: {
    fontFamily: 'Anton_400Regular',
    fontSize: 15,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  packageSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  packagePrice: {
    fontFamily: 'Anton_400Regular',
    fontSize: 19,
    color: '#FFF',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  saveBadgeText: { fontFamily: 'Anton_400Regular', fontSize: 11, color: '#000' },
  subscribeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  subscribeBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBtnDisabled: { opacity: 0.5 },
  subscribeBtnText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 16,
    color: '#000',
    letterSpacing: 0.6,
  },
  restoreLink: { alignItems: 'center' },
  renewalNote: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 14,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  legalDot: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  legalLinkText: { fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textDecorationLine: 'underline' },
});

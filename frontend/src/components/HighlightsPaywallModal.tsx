import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import {
  getHighlightsPlusOffering,
  purchasePackage,
  restorePurchases,
  HIGHLIGHTS_PLUS_ENTITLEMENT,
} from '../utils/purchases';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

interface HighlightsPaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribed: () => void;
}

export function HighlightsPaywallModal({ visible, onClose, onSubscribed }: HighlightsPaywallModalProps) {
  const { t } = useTranslation();
  const { user, checkAuth } = useAuthStore();

  const BENEFITS = [
    { icon: 'image-outline' as const, text: t('highlightsPaywall.benefit1') },
    { icon: 'cloud-outline' as const, text: t('highlightsPaywall.benefit2') },
    { icon: 'infinite-outline' as const, text: t('highlightsPaywall.benefit3') },
    { icon: 'people-outline' as const, text: t('highlightsPaywall.benefit4') },
  ];
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoadingOffering(true);
    getHighlightsPlusOffering()
      .then((off) => {
        setOffering(off);
        const annual = off?.availablePackages.find((p) => p.packageType === 'ANNUAL');
        setSelected(annual || off?.availablePackages[0] || null);
      })
      .finally(() => setLoadingOffering(false));
  }, [visible]);

  const refreshBackendPlan = async () => {
    // The RevenueCat webhook usually beats the app back to our server, but
    // give it a moment before refreshing the locally-cached user/plan.
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await api.get('/api/auth/me');
    } catch {
      // ignore
    }
    await checkAuth();
  };

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchasing(true);
    try {
      const info = await purchasePackage(selected);
      if (info.entitlements.active[HIGHLIGHTS_PLUS_ENTITLEMENT]) {
        await refreshBackendPlan();
        onSubscribed();
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert(t('highlightsPaywall.purchaseFailedTitle'), e?.message || t('highlightsPaywall.purchaseFailedGeneric'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info.entitlements.active[HIGHLIGHTS_PLUS_ENTITLEMENT]) {
        await refreshBackendPlan();
        onSubscribed();
      } else {
        Alert.alert(t('highlightsPaywall.noSubscriptionTitle'), t('highlightsPaywall.noSubscriptionMessage'));
      }
    } catch (e: any) {
      Alert.alert(t('highlightsPaywall.restoreFailedTitle'), e?.message || t('highlightsPaywall.purchaseFailedGeneric'));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#000" />
          </TouchableOpacity>

          <View style={styles.badge}>
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={styles.badgeText}>{t('highlightsPaywall.badge')}</Text>
          </View>
          <Text style={styles.title}>{t('highlightsPaywall.title')}</Text>
          <Text style={styles.subtitle}>
            {t('highlightsPaywall.subtitle')}
          </Text>

          <View style={styles.benefitsList}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefitRow}>
                <Ionicons name={b.icon} size={18} color="#000" />
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {loadingOffering ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : !offering || offering.availablePackages.length === 0 ? (
            <Text style={styles.unavailableText}>
              {t('highlightsPaywall.unavailable')}
            </Text>
          ) : (
            <View style={styles.packagesRow}>
              {offering.availablePackages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, selected?.identifier === pkg.identifier && styles.packageCardActive]}
                  onPress={() => setSelected(pkg)}
                >
                  {pkg.packageType === 'ANNUAL' && (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>{t('highlightsPaywall.save')}</Text>
                    </View>
                  )}
                  <Text style={[styles.packageLabel, selected?.identifier === pkg.identifier && styles.packageLabelActive]}>
                    {pkg.packageType === 'ANNUAL' ? t('highlightsPaywall.annual') : pkg.packageType === 'MONTHLY' ? t('highlightsPaywall.monthly') : pkg.identifier}
                  </Text>
                  <Text style={[styles.packagePrice, selected?.identifier === pkg.identifier && styles.packagePriceActive]}>
                    {pkg.product.priceString}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.subscribeButton, (!selected || purchasing) && styles.subscribeButtonDisabled]}
            onPress={handlePurchase}
            disabled={!selected || purchasing}
            activeOpacity={0.8}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.subscribeButtonText}>{t('highlightsPaywall.subscribe')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreLink}>
            <Text style={styles.restoreLinkText}>
              {restoring ? t('highlightsPaywall.restoring') : t('highlightsPaywall.restorePurchases')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 18,
    lineHeight: 18,
  },
  benefitsList: {
    gap: 12,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  packagesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  packageCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#EEE',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  packageCardActive: {
    borderColor: '#000',
    backgroundColor: '#F5F5F5',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#E53935',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  saveBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  packageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 6,
    marginTop: 4,
  },
  packageLabelActive: {
    color: '#000',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  packagePriceActive: {
    color: '#000',
  },
  subscribeButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonDisabled: {
    backgroundColor: '#999',
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  restoreLink: {
    alignItems: 'center',
    marginTop: 14,
  },
  restoreLinkText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

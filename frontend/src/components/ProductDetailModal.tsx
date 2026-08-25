import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import { Product } from '../types';

interface ProductDetailModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);
const GALLERY_HEIGHT = MODAL_WIDTH;

export function ProductDetailModal({ visible, product, onClose }: ProductDetailModalProps) {
  const { t } = useTranslation();
  const [imageIndex, setImageIndex] = useState(0);

  if (!product) return null;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / MODAL_WIDTH);
    setImageIndex(idx);
  };

  const handleBuy = () => {
    if (product.referral_link) {
      Linking.openURL(product.referral_link);
    }
  };

  const images = product.images?.length ? product.images : [];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.content, { width: MODAL_WIDTH }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.galleryWrap}>
              {images.length > 0 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {images.map((uri, i) => (
                    <Image
                      key={i}
                      source={{ uri }}
                      style={{ width: MODAL_WIDTH, height: GALLERY_HEIGHT }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={[styles.imagePlaceholder, { width: MODAL_WIDTH, height: GALLERY_HEIGHT }]}>
                  <Ionicons name="shirt-outline" size={48} color="#CCC" />
                </View>
              )}

              {images.length > 1 && (
                <View style={styles.dotsRow}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#000" />
              </TouchableOpacity>

              {!!product.discount_percent && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>-{Math.round(product.discount_percent)}%</Text>
                </View>
              )}
            </View>

            <View style={styles.body}>
              <Text style={styles.brand}>{product.brand}</Text>
              <Text style={styles.name}>{product.name}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceCurrent}>€{product.price_current.toFixed(2)}</Text>
                {!!product.price_original && (
                  <Text style={styles.priceOriginal}>€{product.price_original.toFixed(2)}</Text>
                )}
                {!!product.discount_percent && (
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>
                      -{Math.round(product.discount_percent)}% {t('products.off', 'di sconto')}
                    </Text>
                  </View>
                )}
              </View>

              {product.free_shipping && (
                <View style={styles.shippingRow}>
                  <Ionicons name="rocket-outline" size={14} color="#2E7D32" />
                  <Text style={styles.shippingText}>{t('products.freeShipping', 'Spedizione gratuita')}</Text>
                </View>
              )}

              <View style={styles.infoGrid}>
                {!!product.category && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('products.category', 'Categoria')}</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{product.category.split(',')[0]}</Text>
                  </View>
                )}
                {!!product.gender && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('products.gender', 'Genere')}</Text>
                    <Text style={styles.infoValue}>{product.gender}</Text>
                  </View>
                )}
                {!!product.colour && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Colore</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{product.colour}</Text>
                  </View>
                )}
              </View>

              {product.sizes?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('products.sizesAvailable', 'Misure disponibili')}</Text>
                  <View style={styles.sizesRow}>
                    {product.sizes.map((s) => (
                      <View
                        key={s.size}
                        style={[styles.sizeChip, !s.in_stock && styles.sizeChipDisabled]}
                      >
                        <Text style={[styles.sizeChipText, !s.in_stock && styles.sizeChipTextDisabled]}>
                          {s.size}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {!!product.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('products.description', 'Descrizione')}</Text>
                  <Text style={styles.description}>{product.description}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.buyButton} onPress={handleBuy} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.buyButtonText}>{t('products.buyOnOfficialSite', 'Acquista sul sito ufficiale')}</Text>
              </TouchableOpacity>
              <Text style={styles.redirectNotice}>
                {t('products.redirectNotice', {
                  brand: product.brand,
                  defaultValue: `Verrai reindirizzato al sito ufficiale di ${product.brand} per completare l'acquisto.`,
                })}
              </Text>
            </View>
          </ScrollView>
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
    maxHeight: '88%',
    overflow: 'hidden',
  },
  galleryWrap: {
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#E53935',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    padding: 18,
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  priceCurrent: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  priceOriginal: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  discountPillText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '700',
  },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  shippingText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  infoItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 90,
  },
  infoLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sizeChipDisabled: {
    borderColor: '#DDD',
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  sizeChipTextDisabled: {
    color: '#CCC',
    textDecorationLine: 'line-through',
  },
  description: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 6,
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  redirectNotice: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

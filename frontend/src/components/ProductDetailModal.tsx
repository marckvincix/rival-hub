import React, { useEffect, useRef, useState } from 'react';
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
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  findNodeHandle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useTranslation } from '../i18n';
import { Product } from '../types';

interface ProductDetailModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
}

interface FamilyMember {
  id: string;
  colour?: string | null;
  image?: string | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);
const GALLERY_HEIGHT = MODAL_WIDTH;

export function ProductDetailModal({ visible, product, onClose }: ProductDetailModalProps) {
  const { t } = useTranslation();
  const [imageIndex, setImageIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(product);
  const [switchingColor, setSwitchingColor] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const sizesRef = useRef<View>(null);

  const scrollToSizes = () => {
    if (sizesRef.current && scrollRef.current) {
      const node = findNodeHandle(scrollRef.current);
      if (node) {
        sizesRef.current.measureLayout(
          node,
          (_x: number, y: number) => scrollRef.current?.scrollTo({ y: y - 12, animated: true }),
          () => {}
        );
      }
    }
  };

  useEffect(() => {
    setActiveProduct(product);
    // Fixed once per product opened from the carousel, not recomputed when
    // switching colours within the popup — otherwise the swatch row would
    // reshuffle every time (whichever variant becomes "active" would jump to
    // the front and disappear from the list of others).
    if (product) {
      setFamilyMembers([
        { id: product.id, colour: product.colour, image: product.images?.[0] || null },
        ...(product.color_variants || []),
      ]);
    } else {
      setFamilyMembers([]);
    }
  }, [product]);

  useEffect(() => {
    setImageIndex(0);
    setDescExpanded(false);
  }, [activeProduct?.id]);

  if (!activeProduct) return null;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / MODAL_WIDTH);
    setImageIndex(idx);
  };

  const handleBuy = () => {
    if (activeProduct.referral_link) {
      Linking.openURL(activeProduct.referral_link);
    }
  };

  const handleSelectColor = async (variantId: string) => {
    if (variantId === activeProduct.id || switchingColor) return;
    setSwitchingColor(true);
    try {
      const res = await api.get(`/api/products/${variantId}`);
      setActiveProduct(res.data);
    } catch {
      // keep showing the current product if the switch fails
    } finally {
      setSwitchingColor(false);
    }
  };

  const images = activeProduct.images?.length ? activeProduct.images : [];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.content, { width: MODAL_WIDTH }]}>
          <ScrollView ref={scrollRef} key={activeProduct.id} showsVerticalScrollIndicator={false}>
            <View style={styles.galleryWrap}>
              {switchingColor && (
                <View style={styles.switchingOverlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              )}
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
                  <View style={styles.dotsPill}>
                    {images.map((_, i) => (
                      <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#000" />
              </TouchableOpacity>

              {!!activeProduct.discount_percent && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>-{Math.round(activeProduct.discount_percent)}%</Text>
                </View>
              )}
            </View>

            <View style={styles.body}>
              <Text style={styles.brand}>{activeProduct.brand}</Text>
              <Text style={styles.name}>{activeProduct.name}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceCurrent}>€{activeProduct.price_current.toFixed(2)}</Text>
                {!!activeProduct.price_original && (
                  <Text style={styles.priceOriginal}>€{activeProduct.price_original.toFixed(2)}</Text>
                )}
                {!!activeProduct.discount_percent && (
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>
                      -{Math.round(activeProduct.discount_percent)}% {t('products.off', 'di sconto')}
                    </Text>
                  </View>
                )}
              </View>

              {activeProduct.free_shipping && (
                <View style={styles.shippingRow}>
                  <Ionicons name="rocket-outline" size={14} color="#2E7D32" />
                  <Text style={styles.shippingText}>{t('products.freeShipping', 'Spedizione gratuita')}</Text>
                </View>
              )}

              {activeProduct.sizes?.length > 0 && (
                <TouchableOpacity style={styles.sizesJumpButton} onPress={scrollToSizes} activeOpacity={0.7}>
                  <Ionicons name="resize-outline" size={14} color="#000" style={{ marginRight: 6 }} />
                  <Text style={styles.sizesJumpButtonText}>
                    {t('products.sizesAvailable', 'Misure disponibili')} ({activeProduct.sizes.length})
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#000" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.buyButton} onPress={handleBuy} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.buyButtonText}>{t('products.buyOnOfficialSite', 'Acquista sul sito ufficiale')}</Text>
              </TouchableOpacity>
              <Text style={styles.redirectNotice}>
                {t('products.redirectNotice', {
                  brand: activeProduct.brand,
                  defaultValue: `Verrai reindirizzato al sito ufficiale di ${activeProduct.brand} per completare l'acquisto.`,
                })}
              </Text>

              {familyMembers.length > 1 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('products.colors', 'Colori disponibili')}</Text>
                  <View style={styles.colorsRow}>
                    {familyMembers.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.colorSwatch, member.id === activeProduct.id && styles.colorSwatchActive]}
                        onPress={() => handleSelectColor(member.id)}
                      >
                        {member.image ? (
                          <Image source={{ uri: member.image }} style={styles.colorSwatchImage} />
                        ) : (
                          <View style={[styles.colorSwatchImage, styles.imagePlaceholder]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {!!activeProduct.colour && (
                    <Text style={styles.colorNameLabel}>
                      {t('products.colorSelected', 'Colore selezionato')}: {activeProduct.colour}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.infoGrid}>
                {!!activeProduct.category && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('products.category', 'Categoria')}</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{activeProduct.category.split(',')[0]}</Text>
                  </View>
                )}
                {!!activeProduct.gender && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('products.gender', 'Genere')}</Text>
                    <Text style={styles.infoValue}>{activeProduct.gender}</Text>
                  </View>
                )}
              </View>

              {activeProduct.sizes?.length > 0 && (
                <View style={styles.section} ref={sizesRef}>
                  <Text style={styles.sectionTitle}>{t('products.sizesAvailable', 'Misure disponibili')}</Text>
                  <View style={styles.sizesRow}>
                    {activeProduct.sizes.map((s) => (
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

              {!!activeProduct.description && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeaderRow}
                    onPress={() => setDescExpanded((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sectionTitle}>{t('products.description', 'Descrizione')}</Text>
                    <Ionicons name={descExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                  </TouchableOpacity>
                  {descExpanded && (
                    <Text style={styles.description}>{activeProduct.description}</Text>
                  )}
                </View>
              )}
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
  switchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  dotsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
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
  sizesJumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD',
    paddingVertical: 10,
    marginBottom: 10,
  },
  sizesJumpButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 2,
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
    marginBottom: 18,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#EEE',
    overflow: 'hidden',
  },
  colorSwatchActive: {
    borderColor: '#000',
  },
  colorSwatchImage: {
    width: '100%',
    height: '100%',
  },
  colorNameLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    marginTop: 8,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 4,
  },
});

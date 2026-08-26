import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useTranslation } from '../i18n';
import { Product, Sport } from '../types';
import { ProductDetailModal } from './ProductDetailModal';

interface ProductCarouselProps {
  sport: Sport;
  title?: string;
}

type SortFilter = 'relevance' | 'price_asc' | 'newest' | 20 | 30 | 40 | 50;
type GenderFilter = 'Uomo' | 'Donna' | 'Bambini';
type CategoryFilter = 'Scarpe' | 'Abbigliamento' | 'Accessori';

const FILTERS: { key: SortFilter; labelKey: string }[] = [
  { key: 'relevance', labelKey: 'products.sortRelevance' },
  { key: 'price_asc', labelKey: 'products.sortPriceAsc' },
  { key: 'newest', labelKey: 'products.sortNewest' },
  { key: 20, labelKey: 'products.discount20' },
  { key: 30, labelKey: 'products.discount30' },
  { key: 40, labelKey: 'products.discount40' },
  { key: 50, labelKey: 'products.discount50' },
];

const GENDER_FILTERS: { key: GenderFilter; labelKey: string }[] = [
  { key: 'Uomo', labelKey: 'products.genderMale' },
  { key: 'Donna', labelKey: 'products.genderFemale' },
  { key: 'Bambini', labelKey: 'products.genderKids' },
];

const CATEGORY_FILTERS: { key: CategoryFilter; labelKey: string }[] = [
  { key: 'Scarpe', labelKey: 'products.categoryShoes' },
  { key: 'Abbigliamento', labelKey: 'products.categoryClothing' },
  { key: 'Accessori', labelKey: 'products.categoryAccessories' },
];

// Official brand logos, added as more Awin brand partners come on board.
const BRAND_LOGOS: Record<string, any> = {
  Adidas: require('../../assets/images/brands/adidas-logo.jpg'),
};

const CARD_WIDTH = 150;

export function ProductCarousel({ sport, title }: ProductCarouselProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SortFilter>('relevance');
  const [gender, setGender] = useState<GenderFilter | null>(null);
  const [category, setCategory] = useState<CategoryFilter | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const requestId = useRef(0);

  const activeSortFilter = FILTERS.find((f) => f.key === filter) || FILTERS[0];

  useEffect(() => {
    api
      .get('/api/products/brands', { params: { sport } })
      .then((res) => setBrands(res.data || []))
      .catch(() => setBrands([]));
  }, [sport]);

  useEffect(() => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    const params: Record<string, string | number> = { sport, limit: 1000 };
    if (typeof filter === 'number') {
      params.sort = 'discount';
      params.min_discount = filter;
    } else {
      params.sort = filter;
    }
    if (gender) {
      params.gender = gender;
    }
    if (category) {
      params.category = category;
    }
    if (brand) {
      params.brand = brand;
    }
    api
      .get('/api/products', { params })
      .then((res) => {
        if (requestId.current === thisRequest) setProducts(res.data || []);
      })
      .catch(() => {
        if (requestId.current === thisRequest) setProducts([]);
      })
      .finally(() => {
        if (requestId.current === thisRequest) setLoading(false);
      });
  }, [sport, filter, gender, category, brand]);

  const hasActiveFilters = !!gender || !!category || !!brand || filter !== 'relevance';

  // Only hide the whole carousel (filters included) when there's no
  // inventory for this sport at all. If the user narrowed it down with
  // filters to zero results, keep the filters visible with an empty-state
  // message instead of the section vanishing on them.
  if (!loading && products.length === 0 && !hasActiveFilters) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || t('products.sponsoredTitle', 'Prodotti consigliati')}</Text>

      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {GENDER_FILTERS.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[styles.filterChip, styles.genderChip, gender === g.key && styles.filterChipActive]}
              onPress={() => setGender(gender === g.key ? null : g.key)}
            >
              <Text style={[styles.filterChipText, gender === g.key && styles.filterChipTextActive]}>
                {t(g.labelKey, g.key)}
              </Text>
              {gender === g.key && <Ionicons name="close" size={13} color="#FFF" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        {brands.length > 0 && (
          <TouchableOpacity style={styles.sortDropdown} onPress={() => setBrandMenuOpen(true)} activeOpacity={0.7}>
            {brand && BRAND_LOGOS[brand] && (
              <Image source={BRAND_LOGOS[brand]} style={styles.brandDropdownLogo} resizeMode="contain" />
            )}
            <Text style={styles.sortDropdownText}>{brand || t('products.brandAll', 'Tutti i brand')}</Text>
            <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={brandMenuOpen} transparent animationType="fade" onRequestClose={() => setBrandMenuOpen(false)}>
        <TouchableOpacity
          style={styles.sortMenuOverlay}
          activeOpacity={1}
          onPress={() => setBrandMenuOpen(false)}
        >
          <View style={styles.sortMenuCard}>
            <TouchableOpacity
              style={styles.sortMenuItem}
              onPress={() => {
                setBrand(null);
                setBrandMenuOpen(false);
              }}
            >
              <Text style={[styles.sortMenuItemText, !brand && styles.sortMenuItemTextActive]}>
                {t('products.brandAll', 'Tutti i brand')}
              </Text>
              {!brand && <Ionicons name="checkmark" size={16} color="#000" />}
            </TouchableOpacity>
            {brands.map((b) => (
              <TouchableOpacity
                key={b}
                style={styles.sortMenuItem}
                onPress={() => {
                  setBrand(b);
                  setBrandMenuOpen(false);
                }}
              >
                <View style={styles.sortMenuItemLeft}>
                  <View style={styles.brandAvatar}>
                    {BRAND_LOGOS[b] ? (
                      <Image source={BRAND_LOGOS[b]} style={styles.brandLogoImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.brandAvatarText}>{b.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={[styles.sortMenuItemText, brand === b && styles.sortMenuItemTextActive]}>{b}</Text>
                </View>
                {brand === b && <Ionicons name="checkmark" size={16} color="#000" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORY_FILTERS.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.filterChip, styles.genderChip, category === c.key && styles.filterChipActive]}
              onPress={() => setCategory(category === c.key ? null : c.key)}
            >
              <Text style={[styles.filterChipText, category === c.key && styles.filterChipTextActive]}>
                {t(c.labelKey, c.key)}
              </Text>
              {category === c.key && <Ionicons name="close" size={13} color="#FFF" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.sortDropdown} onPress={() => setSortMenuOpen(true)} activeOpacity={0.7}>
          <Text style={styles.sortDropdownText}>{t(activeSortFilter.labelKey, String(activeSortFilter.key))}</Text>
          <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <Modal visible={sortMenuOpen} transparent animationType="fade" onRequestClose={() => setSortMenuOpen(false)}>
        <TouchableOpacity
          style={styles.sortMenuOverlay}
          activeOpacity={1}
          onPress={() => setSortMenuOpen(false)}
        >
          <View style={styles.sortMenuCard}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={String(f.key)}
                style={styles.sortMenuItem}
                onPress={() => {
                  setFilter(f.key);
                  setSortMenuOpen(false);
                }}
              >
                <Text style={[styles.sortMenuItemText, filter === f.key && styles.sortMenuItemTextActive]}>
                  {t(f.labelKey, String(f.key))}
                </Text>
                {filter === f.key && <Ionicons name="checkmark" size={16} color="#000" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="search-outline" size={20} color="#CCC" />
          <Text style={styles.emptyBoxText}>
            {t('products.noResults', 'Nessun prodotto trovato con questi filtri')}
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={products}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsRow}
          initialNumToRender={6}
          windowSize={5}
          renderItem={({ item: product }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setSelectedProduct(product)}
            >
              <View style={styles.imageWrap}>
                {product.images?.[0] ? (
                  <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Ionicons name="shirt-outline" size={28} color="#CCC" />
                  </View>
                )}
                {!!product.discount_percent && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>-{Math.round(product.discount_percent)}%</Text>
                  </View>
                )}
              </View>
              <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
              <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceCurrent}>€{product.price_current.toFixed(2)}</Text>
                {!!product.price_original && (
                  <Text style={styles.priceOriginal}>€{product.price_original.toFixed(2)}</Text>
                )}
              </View>
              {product.free_shipping && (
                <View style={styles.shippingRow}>
                  <Ionicons name="rocket-outline" size={12} color="#2E7D32" />
                  <Text style={styles.shippingText}>{t('products.freeShipping', 'Spedizione gratuita')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.viewButton}
                activeOpacity={0.8}
                onPress={() => setSelectedProduct(product)}
              >
                <Ionicons name="eye-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.viewButtonText}>{t('products.viewDetails', 'Vedi meglio')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      <ProductDetailModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  brandAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  brandAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  brandDropdownLogo: {
    width: 16,
    height: 16,
    marginRight: 6,
    borderRadius: 8,
  },
  genderChip: {
    borderColor: '#CCC',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 10,
    gap: 8,
  },
  categoryScroll: {
    flex: 1,
  },
  categoryScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  sortDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  sortMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  sortMenuCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sortMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortMenuItemText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  sortMenuItemTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  filterChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyBoxText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textAlign: 'center',
  },
  productsRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 2,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 8,
  },
  imageWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  image: {
    width: '100%',
    height: CARD_WIDTH - 16,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#E53935',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  brand: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
    minHeight: 32,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceCurrent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  priceOriginal: {
    fontSize: 11,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  shippingText: {
    fontSize: 9,
    color: '#2E7D32',
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 8,
  },
  viewButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

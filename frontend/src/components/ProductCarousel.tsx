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

const CARD_WIDTH = 150;

export function ProductCarousel({ sport, title }: ProductCarouselProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SortFilter>('relevance');
  const [gender, setGender] = useState<GenderFilter | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const requestId = useRef(0);

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
  }, [sport, filter, gender, brand]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || t('products.sponsoredTitle', 'Prodotti consigliati')}</Text>

      {brands.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.brandChip, !brand && styles.filterChipActive]}
            onPress={() => setBrand(null)}
          >
            <Text style={[styles.filterChipText, !brand && styles.filterChipTextActive]}>
              {t('products.brandAll', 'Tutti i brand')}
            </Text>
          </TouchableOpacity>
          {brands.map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.brandChip, brand === b && styles.filterChipActive]}
              onPress={() => setBrand(brand === b ? null : b)}
            >
              <View style={[styles.brandAvatar, brand === b && styles.brandAvatarActive]}>
                <Text style={[styles.brandAvatarText, brand === b && styles.brandAvatarTextActive]}>
                  {b.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.filterChipText, brand === b && styles.filterChipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
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
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingTop: 0 }]}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {t(f.labelKey, String(f.key))}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#000" />
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    paddingLeft: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  brandAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAvatarActive: {
    backgroundColor: '#FFF',
  },
  brandAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  brandAvatarTextActive: {
    color: '#000',
  },
  genderChip: {
    borderColor: '#CCC',
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

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

const FILTERS: { key: SortFilter; labelKey: string }[] = [
  { key: 'relevance', labelKey: 'products.sortRelevance' },
  { key: 'price_asc', labelKey: 'products.sortPriceAsc' },
  { key: 'newest', labelKey: 'products.sortNewest' },
  { key: 20, labelKey: 'products.discount20' },
  { key: 30, labelKey: 'products.discount30' },
  { key: 40, labelKey: 'products.discount40' },
  { key: 50, labelKey: 'products.discount50' },
];

export function ProductCarousel({ sport, title }: ProductCarouselProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SortFilter>('relevance');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string | number> = { sport, limit: 20 };
    if (typeof filter === 'number') {
      params.sort = 'discount';
      params.min_discount = filter;
    } else {
      params.sort = filter;
    }
    api
      .get('/api/products', { params })
      .then((res) => {
        if (!cancelled) setProducts(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sport, filter]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || t('products.sponsoredTitle', 'Prodotti consigliati')}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsRow}
        >
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
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
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={styles.disclosure}>
        {t(
          'products.disclosure',
          "I prodotti sono venduti direttamente dal brand ufficiale. Cliccando su un prodotto verrai reindirizzato al sito ufficiale del brand per l'acquisto."
        )}
      </Text>

      <ProductDetailModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </View>
  );
}

const CARD_WIDTH = 150;

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
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
    paddingBottom: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
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
  disclosure: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginTop: 10,
    lineHeight: 15,
  },
});

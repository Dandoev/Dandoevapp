import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { Search, Zap, Gauge, Battery, ShieldCheck, ArrowRight, X, Sparkles } from 'lucide-react-native';
import { demoStore, DemoProduct } from '../lib/demo-data';
import { getProductAsset } from '../lib/bike-assets';
import { getLiveBikes } from '../lib/catalog';

interface BikesScreenProps {
  onSelectProduct?: (product: DemoProduct) => void;
  token?: string | null;
}

type MobileCadence = 'daily' | 'bidaily' | 'weekly' | 'monthly';

export default function BikesScreen({ onSelectProduct, token }: BikesScreenProps) {
  const isDemo = Boolean(token?.startsWith('demo-'));
  const [products, setProducts] = useState<DemoProduct[]>(isDemo ? demoStore.getProducts() : []);
  const [catalogError, setCatalogError] = useState(false);
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    getLiveBikes().then((bikes) => { if (active) setProducts(bikes); }).catch(() => { if (active) setCatalogError(true); });
    return () => { active = false; };
  }, [isDemo]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const cadence: MobileCadence = 'weekly';

  const categories = ['All', 'E-Bikes', 'Batteries', 'Chargers'];

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'E-Bikes') return p.type === 'bike';
    if (selectedCategory === 'Batteries') return p.category?.toLowerCase().includes('batter') || p.name.toLowerCase().includes('battery');
    if (selectedCategory === 'Chargers') return p.category?.toLowerCase().includes('charger') || p.name.toLowerCase().includes('charger');
    return true;
  }).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getInstallmentDisplay = (price: number) => {
    // 12 months tenure, weekly deduction (48 weeks)
    return { amount: Math.round((price * 1.16) / 48), suffix: '/wk' };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Find your ride.</Text>
          <View style={styles.shopBadge}>
            <Sparkles size={12} color="#2E3192" />
            <Text style={styles.shopBadgeText}>CURATED FOR YOU</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Electric bikes and essentials for wherever life takes you.</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search e-bikes, batteries, chargers..."
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search products"
            returnKeyType="search"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Pay-As-You-Ride Weekly Deduction Badge */}
        <View style={styles.cadenceBar}>
          <Text style={styles.cadenceLabel}>Payment schedule</Text>
          <View style={[styles.cadenceBtn, styles.cadenceBtnActive, { paddingHorizontal: 14 }]}>
            <Text style={styles.cadenceBtnTextActive}>Weekly deduction</Text>
          </View>
        </View>
      </View>

      {/* Product Cards List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {catalogError && <Text style={styles.emptyDescription}>The live catalog is unavailable. Please try again later.</Text>}
        <View style={styles.countRow}>
          <Text style={styles.countText}>{filteredProducts.length} pieces to explore</Text>
          <Text style={styles.tagText}>BUILT TO MOVE</Text>
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Search size={25} color="#2E3192" />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyDescription}>Try another search or see the full collection.</Text>
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedCategory('All'); }} accessibilityRole="button" style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Show all products</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredProducts.map((product) => {
          const { amount: instAmt, suffix: instSuffix } = getInstallmentDisplay(product.price);
          const isBattery = product.category === 'Batteries';
          const isCharger = product.category === 'Chargers';
          const isFlagship = product.name.includes('G90') && !product.name.includes('Lite');
          const isSports = product.name.includes('X5') || product.name.includes('X6');
          const badgeText = isFlagship ? 'FLAGSHIP' : isSports ? (product.name.includes('X6') ? 'ALL-TERRAIN' : 'SPORTS') : product.category.toUpperCase();

          return (
            <TouchableOpacity
              key={product.id}
              style={styles.bikeCard}
              activeOpacity={0.88}
              onPress={() => onSelectProduct?.(product)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={[
                    styles.categoryBadge,
                    isFlagship && styles.flagshipBadge,
                    isSports && styles.sportsBadge,
                    isBattery && { backgroundColor: '#EEF2FF' },
                    isCharger && { backgroundColor: '#FFFBEB' }
                  ]}>
                    {isFlagship && <Text style={styles.flagshipCrown}>👑 </Text>}
                    <Text style={[
                      styles.categoryBadgeText,
                      isFlagship && styles.flagshipBadgeText,
                      isSports && styles.sportsBadgeText,
                      isBattery && { color: '#087F75' },
                      isCharger && { color: '#D97706' }
                    ]}>
                      {badgeText}
                    </Text>
                  </View>
                  <Text style={styles.bikeName}>{product.name}</Text>
                  <Text style={styles.bikeBrand}>
                    {isFlagship ? 'Premium commuter e-bike' : isSports ? 'Sports fat-tire e-bike' : product.brand}
                  </Text>
                </View>
                <View style={styles.priceBox}>
                  <Text style={styles.price}>₦{product.price.toLocaleString()}</Text>
                  {product.type === 'bike' ? (
                    <Text style={styles.dailyBadge}>
                      ₦{instAmt.toLocaleString()}{instSuffix}
                    </Text>
                  ) : (
                    <Text style={[styles.dailyBadge, { color: '#0284C7' }]}>Outright Only</Text>
                  )}
                </View>
              </View>

              {/* Product Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={getProductAsset(product.model || product.name)}
                  style={styles.bikeImage}
                  resizeMode="contain"
                />
              </View>

              {/* Specs Pills in unified pill row */}
              <View style={styles.specsRow}>
                {product.motorPower ? (
                  <View style={styles.specItem}>
                    <Zap size={13} color="#F59E0B" />
                    <Text style={styles.specText}>{product.motorPower}W</Text>
                  </View>
                ) : null}
                {product.batteryCapacity ? (
                  <View style={styles.specItem}>
                    <Battery size={13} color="#2E3192" />
                    <Text style={styles.specText}>{product.batteryCapacity}Ah</Text>
                  </View>
                ) : null}
                {product.voltage ? (
                  <View style={styles.specItem}>
                    <Zap size={13} color="#4338CA" />
                    <Text style={styles.specText}>{product.voltage}V</Text>
                  </View>
                ) : null}
                {product.rangeKm ? (
                  <View style={styles.specItem}>
                    <Gauge size={13} color="#06B6D4" />
                    <Text style={styles.specText}>{product.rangeKm}km</Text>
                  </View>
                ) : null}
                {product.topSpeed ? (
                  <View style={styles.specItem}>
                    <Gauge size={13} color="#8B5CF6" />
                    <Text style={styles.specText}>{product.topSpeed}km/h</Text>
                  </View>
                ) : null}
              </View>

              {/* Action Button */}
              <View style={styles.cardFooter}>
                <Text style={styles.monthlyText}>
                  {product.inStock ? 'Available now' : 'Available on backorder'}
                </Text>
                <View style={styles.detailsButton}>
                  <Text style={styles.detailsButtonText}>
                    See more details
                  </Text>
                  <ArrowRight size={14} color="#2E3192" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#0A154F',
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  emptyDescription: {
    color: '#66728A',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#2E3192',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  container: { flex: 1, backgroundColor: '#F6F7FC' },
  header: {
    backgroundColor: '#F6F7FC',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 14,
    borderBottomWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F6FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shopBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 5,
    marginBottom: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F4F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0A154F',
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F4F9',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#1E1B4B',
  },
  categoryText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#475569',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  cadenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cadenceLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E293B',
  },
  cadencePills: {
    flexDirection: 'row',
    gap: 4,
  },
  cadenceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cadenceBtnActive: {
    backgroundColor: '#1E1B4B',
  },
  cadenceBtnText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#64748B',
  },
  cadenceBtnTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countText: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_600SemiBold',
  },
  tagText: {
    fontSize: 11,
    color: '#2E3192',
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  bikeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    borderCurve: 'continuous',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagshipBadge: {
    backgroundColor: '#FEF3C7',
  },
  flagshipCrown: {
    fontSize: 11,
  },
  flagshipBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  sportsBadge: {
    backgroundColor: '#E0E7FF',
  },
  sportsBadgeText: {
    color: '#3730A3',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  categoryBadgeText: {
    color: '#1E1B4B',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  bikeName: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    letterSpacing: -0.4,
  },
  bikeBrand: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#1E1B4B',
    letterSpacing: -0.3,
  },
  dailyBadge: {
    fontSize: 12,
    color: '#1E1B4B',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    marginTop: 3,
  },
  imageWrapper: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  bikeImage: {
    width: '92%',
    height: '92%',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  monthlyText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E1B4B',
  },
});

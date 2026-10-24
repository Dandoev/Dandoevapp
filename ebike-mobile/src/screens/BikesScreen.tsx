import React, { useState } from 'react';
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

interface BikesScreenProps {
  onSelectProduct?: (product: DemoProduct) => void;
}

type MobileCadence = 'daily' | 'bidaily' | 'weekly' | 'monthly';

export default function BikesScreen({ onSelectProduct }: BikesScreenProps) {
  const products = demoStore.getProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cadence, setCadence] = useState<MobileCadence>('bidaily');

  const categories = ['All', 'E-Bikes', 'Batteries', 'Chargers'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      (selectedCategory === 'E-Bikes' && p.category === 'E-Bikes') ||
      (selectedCategory === 'Batteries' && p.category === 'Batteries') ||
      (selectedCategory === 'Chargers' && p.category === 'Chargers');

    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getInstallmentDisplay = (price: number) => {
    // 12 months tenure, 4% monthly flat rate, plus ₦1,000/day compulsory returnable savings
    const totalObligation = price * 1.48;
    const dailyBase = Math.round(totalObligation / 360) + 1000;
    if (cadence === 'daily') {
      return { amount: dailyBase, suffix: '/day' };
    }
    if (cadence === 'bidaily') {
      return { amount: dailyBase * 2, suffix: '/2 days' };
    }
    if (cadence === 'weekly') {
      return { amount: Math.round(( price * 1.16 ) / 48), suffix: '/wk' };
    }
    return { amount: Math.round(totalObligation / 12), suffix: '/mo' };
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
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search e-bikes, batteries, chargers..."
            placeholderTextColor="#9CA3AF"
            accessibilityLabel="Search products"
            returnKeyType="search"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <X size={16} color="#9CA3AF" />
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

        {/* Pay-As-You-Ride Cadence Switcher */}
        <View style={styles.cadenceBar}>
          <Text style={styles.cadenceLabel}>Payment view</Text>
          <View style={styles.cadencePills}>
            {(
              [
                { id: 'daily', label: 'Daily' },
                { id: 'bidaily', label: '2 Days' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ] as const
            ).map((item) => {
              const active = cadence === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.cadenceBtn, active && styles.cadenceBtnActive]}
                  onPress={() => setCadence(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.cadenceBtnText, active && styles.cadenceBtnTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Product Cards List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
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

          return (
            <TouchableOpacity
              key={product.id}
              style={styles.bikeCard}
              activeOpacity={0.85}
              onPress={() => onSelectProduct?.(product)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={[
                    styles.categoryBadge,
                    isBattery && { backgroundColor: '#EEF2FF' },
                    isCharger && { backgroundColor: '#FFFBEB' }
                  ]}>
                    <Text style={[
                      styles.categoryBadgeText,
                      isBattery && { color: '#087F75' },
                      isCharger && { color: '#D97706' }
                    ]}>
                      {product.category.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.bikeName}>{product.name}</Text>
                  <Text style={styles.bikeBrand}>{product.brand}</Text>
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
                  source={getProductAsset(product.id)}
                  style={styles.bikeImage}
                  resizeMode="contain"
                />
              </View>

              {/* Specs Pills */}
              <View style={styles.specsRow}>
                {product.motorPower ? (
                  <View style={styles.specItem}>
                    <Zap size={14} color="#F59E0B" />
                    <Text style={styles.specText}>{product.motorPower}W</Text>
                  </View>
                ) : null}
                {product.batteryCapacity ? (
                  <View style={styles.specItem}>
                    <Battery size={14} color="#2E3192" />
                    <Text style={styles.specText}>{product.batteryCapacity}Ah</Text>
                  </View>
                ) : null}
                {product.voltage ? (
                  <View style={styles.specItem}>
                    <Zap size={14} color="#2E3192" />
                    <Text style={styles.specText}>{product.voltage}V</Text>
                  </View>
                ) : null}
                {product.rangeKm ? (
                  <View style={styles.specItem}>
                    <Gauge size={14} color="#06B6D4" />
                    <Text style={styles.specText}>{product.rangeKm}km</Text>
                  </View>
                ) : null}
                {product.topSpeed ? (
                  <View style={styles.specItem}>
                    <Gauge size={14} color="#8B5CF6" />
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
                    {product.type === 'bike' ? 'Explore ride' : 'View details'}
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
    fontSize: 30,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F9F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4E8C8',
  },
  shopBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 5,
    marginBottom: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2FA',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#111827',
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 26,
    backgroundColor: '#EDF2FA',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#2E3192',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#66728A',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  cadenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F7FC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  cadenceLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#475569',
  },
  cadencePills: {
    flexDirection: 'row',
    gap: 4,
  },
  cadenceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cadenceBtnActive: {
    backgroundColor: '#2E3192',
  },
  cadenceBtnText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#66728A',
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
    borderRadius: 26,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    borderCurve: 'continuous',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#E7F9F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryBadgeText: {
    color: '#2E3192',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  bikeBrand: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
  },
  dailyBadge: {
    fontSize: 11,
    color: '#2E3192',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    marginTop: 2,
  },
  imageWrapper: {
    height: 178,
    backgroundColor: '#F6F7FC',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bikeImage: {
    width: '90%',
    height: '90%',
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F6F7FC',
    padding: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EDF2FA',
    paddingTop: 10,
  },
  monthlyText: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#2E3192',
  },
});

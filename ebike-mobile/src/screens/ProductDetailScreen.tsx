import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  Share2,
  Zap,
  Gauge,
  Battery,
  ShieldCheck,
  Check,
  CreditCard,
  Truck,
  Sparkles,
  Award,
  Receipt,
  CheckCircle2,
  X,
  ShoppingBag,
  Clock,
} from 'lucide-react-native';
import { demoStore, DemoProduct, getProductPriceBreakdown, DeliveryType } from '../lib/demo-data';
import { getProductAsset } from '../lib/bike-assets';
import { MobileApi } from '../lib/api';

interface ProductDetailScreenProps {
  product?: DemoProduct;
  onBack: () => void;
  onApplyBNPL: (product: DemoProduct, tenureMonths: number) => void;
}

export default function ProductDetailScreen({
  product = demoStore.getSelectedProduct(),
  onBack,
  onApplyBNPL,
}: ProductDetailScreenProps) {
  const [selectedTenure, setSelectedTenure] = useState<number>(12);
  const [selectedCadence, setSelectedCadence] = useState<'daily' | 'bidaily' | 'weekly' | 'monthly'>('bidaily');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [showOutrightModal, setShowOutrightModal] = useState<boolean>(false);
  const [outrightSuccess, setOutrightSuccess] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const isBike = product.type === 'bike';
  const breakdown = getProductPriceBreakdown(product, selectedTenure, deliveryType);

  const weeklyAmt = breakdown.weeklyDeduction || 0;
  const dailyAmt = Math.round(weeklyAmt / 7);
  const biDailyAmt = dailyAmt * 2;
  const monthlyAmt = Math.round(weeklyAmt * 4.33);

  const activeCadenceAmount =
    selectedCadence === 'daily'
      ? dailyAmt
      : selectedCadence === 'bidaily'
      ? biDailyAmt
      : selectedCadence === 'weekly'
      ? weeklyAmt
      : monthlyAmt;
  const activeCadenceSuffix =
    selectedCadence === 'daily'
      ? '/day'
      : selectedCadence === 'bidaily'
      ? '/2 days'
      : selectedCadence === 'weekly'
      ? '/wk'
      : '/mo';

  const handleShare = () => {
    setShareToast(`Link for ${product.name} copied to clipboard!`);
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleBuyOutright = async () => {
    demoStore.fundWallet(-breakdown.totalOutright, `Outright Purchase: ${product.name}`);
    setOutrightSuccess(true);
    try {
      await MobileApi.createOrder({
        bikeId: product.type === 'bike' ? product.id : undefined,
        quantity: 1,
        paymentMethod: 'wallet',
        deliveryType,
        deliveryAddress: deliveryType === 'pickup' ? 'Lagos Central Pickup Hub' : '24 Sandstrip Oworoshoki',
        deliveryCity: 'Lagos',
        deliveryState: deliveryType === 'delivery_outside' ? 'Abuja' : 'Lagos',
        deliveryPhone: '08099001122',
        accessories: product.type !== 'bike' ? [{ id: product.id, quantity: 1 }] : undefined,
      });
    } catch {
      // Local demo store already updated
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
          <Share2 size={18} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {shareToast && (
        <View style={{ backgroundColor: '#021064', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' }}>
          <Text style={{ color: '#26FEDC', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>{shareToast}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image Card */}
        <View style={styles.heroImageCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{product.category.toUpperCase()}</Text>
          </View>
          <Image
            source={getProductAsset(product.id)}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>In Stock • Lagos Warehouse</Text>
          </View>
        </View>

        {/* Title & Pricing Section */}
        <View style={styles.headerSection}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.brandModel}>
            Brand: {product.brand} • Model: {product.model}
          </Text>

          <View style={styles.pricingCard}>
            <View>
              <Text style={styles.cashLabel}>Base Item Price</Text>
              <Text style={styles.cashPrice}>₦{product.price.toLocaleString()}</Text>
              <Text style={styles.cashSub}>Exclusive of delivery & insurance</Text>
            </View>

            {isBike ? (
              <View style={styles.bnplTagBox}>
                <Text style={styles.bnplTagHeader}>PAY-AS-YOU-RIDE</Text>
                <Text style={styles.bnplTagPrice}>
                  ₦{activeCadenceAmount.toLocaleString()}{activeCadenceSuffix}
                </Text>
                <Text style={styles.bnplTagSub}>100% Returnable Escrow • {selectedTenure} Mo</Text>
              </View>
            ) : (
              <View style={[styles.bnplTagBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.bnplTagHeader, { color: '#15803D' }]}>PURCHASE MODEL</Text>
                <Text style={[styles.bnplTagPrice, { color: '#166534', fontSize: 13 }]}>Outright Only</Text>
                <Text style={[styles.bnplTagSub, { color: '#15803D' }]}>No BNPL for Accessories</Text>
              </View>
            )}
          </View>
        </View>

        {/* Technical Specifications Matrix */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Key Technical Specifications</Text>
          <View style={styles.specsGrid}>
            {product.motorPower && (
              <View style={styles.specTile}>
                <Zap size={20} color="#2E3192" />
                <Text style={styles.specTileLabel}>Motor Power</Text>
                <Text style={styles.specTileVal}>{product.motorPower} Watts</Text>
              </View>
            )}
            {product.batteryCapacity && (
              <View style={styles.specTile}>
                <Battery size={20} color="#2E3192" />
                <Text style={styles.specTileLabel}>Battery Capacity</Text>
                <Text style={styles.specTileVal}>{product.batteryCapacity} Ah Lithium</Text>
              </View>
            )}
            {product.voltage && (
              <View style={styles.specTile}>
                <Zap size={20} color="#2E3192" />
                <Text style={styles.specTileLabel}>System Voltage</Text>
                <Text style={styles.specTileVal}>{product.voltage} Volts</Text>
              </View>
            )}
            {product.rangeKm && (
              <View style={styles.specTile}>
                <Gauge size={20} color="#06B6D4" />
                <Text style={styles.specTileLabel}>Max Range</Text>
                <Text style={styles.specTileVal}>{product.rangeKm} km / charge</Text>
              </View>
            )}
            {product.topSpeed && (
              <View style={styles.specTile}>
                <Zap size={20} color="#F59E0B" />
                <Text style={styles.specTileLabel}>Top Speed</Text>
                <Text style={styles.specTileVal}>{product.topSpeed} km/h</Text>
              </View>
            )}
            <View style={styles.specTile}>
              <ShieldCheck size={20} color="#7C3AED" />
              <Text style={styles.specTileLabel}>Warranty</Text>
              <Text style={styles.specTileVal}>{product.warranty}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Product Overview</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>

        {/* Features Bullets */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Included Features & Capabilities</Text>
          {product.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Fulfillment & Delivery Method Selector */}
        <View style={styles.deliverySelectorSection}>
          <View style={styles.deliverySectionHeader}>
            <Truck size={18} color="#2E3192" />
            <Text style={styles.deliverySectionTitle}>Fulfillment & Delivery Option</Text>
          </View>
          <Text style={styles.deliverySectionSub}>
            Select pickup or delivery location (applies to both Outright & BNPL):
          </Text>

          <View style={styles.deliveryOptionsList}>
            {/* Option 1: Pickup */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryType === 'pickup' && styles.deliveryOptionCardActive,
              ]}
              onPress={() => setDeliveryType('pickup')}
              activeOpacity={0.8}
            >
              <View style={styles.deliveryOptionRadio}>
                <View
                  style={[
                    styles.radioInner,
                    deliveryType === 'pickup' && styles.radioInnerActive,
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={styles.deliveryOptionName}>🏪 Hub Self-Pickup</Text>
                  <Text style={[styles.deliveryOptionPrice, { color: '#087F75' }]}>FREE (₦0)</Text>
                </View>
                <Text style={styles.deliveryOptionDesc}>
                  Collect directly at Ikeja Service & Central Swap Hub. Ready in 24 hrs.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Within Lagos */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryType === 'delivery_lagos' && styles.deliveryOptionCardActive,
              ]}
              onPress={() => setDeliveryType('delivery_lagos')}
              activeOpacity={0.8}
            >
              <View style={styles.deliveryOptionRadio}>
                <View
                  style={[
                    styles.radioInner,
                    deliveryType === 'delivery_lagos' && styles.radioInnerActive,
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={styles.deliveryOptionName}>🚚 Delivery Within Lagos</Text>
                  <Text style={styles.deliveryOptionPrice}>₦20,000</Text>
                </View>
                <Text style={styles.deliveryOptionDesc}>
                  Doorstep courier & pre-assembly across all Lagos State zones (1–2 days).
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 3: Outside Lagos */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryType === 'delivery_outside' && styles.deliveryOptionCardActive,
              ]}
              onPress={() => setDeliveryType('delivery_outside')}
              activeOpacity={0.8}
            >
              <View style={styles.deliveryOptionRadio}>
                <View
                  style={[
                    styles.radioInner,
                    deliveryType === 'delivery_outside' && styles.radioInnerActive,
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={styles.deliveryOptionName}>🚛 Delivery Outside Lagos</Text>
                  <Text style={styles.deliveryOptionPrice}>₦50,000</Text>
                </View>
                <Text style={styles.deliveryOptionDesc}>
                  Tracked nationwide interstate courier with protective crating (3–5 days).
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Outright Itemized Price & Delivery Breakdown */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Receipt size={18} color="#2E3192" />
              <Text style={styles.breakdownHeaderTitle}>Outright Purchase Breakdown</Text>
            </View>
            <View style={styles.breakdownTypeBadge}>
              <Text style={styles.breakdownTypeBadgeText}>No Hidden Fees</Text>
            </View>
          </View>

          <View style={styles.breakdownList}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownItemLabel}>Base Asset Price</Text>
              <Text style={styles.breakdownItemVal}>₦{breakdown.basePrice.toLocaleString()}</Text>
            </View>

            <View style={[styles.breakdownItem, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.breakdownItemLabel}>
                  {deliveryType === 'pickup'
                    ? 'Fulfillment (Hub Self-Pickup)'
                    : deliveryType === 'delivery_lagos'
                    ? 'Doorstep Delivery (Within Lagos)'
                    : 'Interstate Delivery (Outside Lagos)'}
                </Text>
                <Text style={styles.breakdownItemHint}>
                  {deliveryType === 'pickup'
                    ? 'Zero shipping charges at Lagos Hub'
                    : deliveryType === 'delivery_lagos'
                    ? 'Insured express delivery within Lagos State'
                    : 'Tracked nationwide freight across Nigeria'}
                </Text>
              </View>
              <Text style={[styles.breakdownItemVal, breakdown.deliveryFee === 0 && { color: '#087F75' }]}>
                {breakdown.deliveryFee === 0 ? 'FREE (₦0)' : `₦${breakdown.deliveryFee.toLocaleString()}`}
              </Text>
            </View>
          </View>

          <View style={styles.breakdownTotalRow}>
            <Text style={styles.breakdownTotalLabel}>Total Outright Amount Payable</Text>
            <Text style={styles.breakdownTotalVal}>₦{breakdown.totalOutright.toLocaleString()}</Text>
          </View>
        </View>

        {/* BNPL Financing Simulator (ONLY FOR E-BIKES) */}
        {isBike ? (
          <View style={styles.calculatorCard}>
            <View style={styles.calcHeaderRow}>
              <View style={styles.calcHeaderLeft}>
                <Sparkles size={18} color="#D97706" />
                <Text style={styles.calcTitle}>Pay-As-You-Ride BNPL Simulator</Text>
              </View>
              <Text style={styles.calcRateBadge}>4% / Month Fixed</Text>
            </View>

            <Text style={styles.calcSubtitle}>
              Select your preferred tenure and deduction cadence:
            </Text>

            {/* Cadence Switcher Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {(
                [
                  { id: 'daily', label: 'Daily' },
                  { id: 'bidaily', label: 'Every 2 Days' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                ] as const
              ).map((item) => {
                const active = selectedCadence === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedCadence(item.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: active ? '#2E3192' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: active ? '#2E3192' : '#DBE2F0',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: 'PlusJakartaSans_700Bold',
                        color: active ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tenure Chips */}
            <View style={styles.tenureChipRow}>
              {[6, 12, 18].map((months) => {
                const isSelected = selectedTenure === months;
                return (
                  <TouchableOpacity
                    key={months}
                    style={[styles.tenureChip, isSelected && styles.tenureChipActive]}
                    onPress={() => setSelectedTenure(months)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tenureChipNum, isSelected && styles.tenureChipNumActive]}>
                      {months} Months
                    </Text>
                    <Text style={[styles.tenureChipWeeks, isSelected && styles.tenureChipWeeksActive]}>
                      ({Math.round(months * 4.33)} Weeks)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* BNPL Itemized Breakdown */}
            <View style={styles.bnplFinancingDetails}>
              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>Base Asset Price:</Text>
                <Text style={styles.bnplDetailVal}>₦{breakdown.basePrice.toLocaleString()}</Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <View>
                  <Text style={styles.bnplDetailLabel}>1-Year Comprehensive Insurance (7%):</Text>
                  <Text style={styles.bnplDetailHint}>Theft, fire, accident & battery cover</Text>
                </View>
                <Text style={styles.bnplDetailVal}>₦{breakdown.insuranceFee.toLocaleString()}</Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <View>
                  <Text style={styles.bnplDetailLabel}>Platform & Loan Servicing Fee:</Text>
                  <Text style={styles.bnplDetailHint}>Underwriting & direct-debit setup</Text>
                </View>
                <Text style={styles.bnplDetailVal}>₦{breakdown.serviceFee.toLocaleString()}</Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>
                  {deliveryType === 'pickup'
                    ? 'Fulfillment (Hub Pickup):'
                    : deliveryType === 'delivery_lagos'
                    ? 'Delivery (Within Lagos):'
                    : 'Delivery (Outside Lagos):'}
                </Text>
                <Text style={[styles.bnplDetailVal, breakdown.deliveryFee === 0 && { color: '#087F75' }]}>
                  {breakdown.deliveryFee === 0 ? 'FREE (₦0)' : `₦${breakdown.deliveryFee.toLocaleString()}`}
                </Text>
              </View>

              <View style={[styles.bnplDetailRow, { borderTopWidth: 1, borderTopColor: '#DBE2F0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.bnplDetailLabel, { fontWeight: '800', color: '#0A154F' }]}>
                  Total Financed Sum:
                </Text>
                <Text style={[styles.bnplDetailVal, { fontWeight: '900', color: '#2E3192' }]}>
                  ₦{breakdown.totalFinanced?.toLocaleString()}
                </Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>Total Interest ({selectedTenure} Mo @ 4%/mo):</Text>
                <Text style={styles.bnplDetailVal}>₦{breakdown.totalInterest?.toLocaleString()}</Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>Save-As-You-Ride Sweep (100% Returnable):</Text>
                <Text style={styles.bnplDetailVal}>₦1,000/day (Unlocked at Payoff)</Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>Initial Down Payment:</Text>
                <Text style={[styles.bnplDetailVal, { color: '#2E3192', fontWeight: '900' }]}>
                  ₦0 (0% Down Promo)
                </Text>
              </View>
            </View>

            {/* Result Highlight Box */}
            <View style={styles.calcResultBox}>
              <View>
                <Text style={styles.calcResultLabel}>
                  Scheduled Auto-Debit Deduction ({selectedTenure} Months)
                </Text>
                <Text style={styles.calcResultAmount}>
                  ₦{activeCadenceAmount.toLocaleString()}{activeCadenceSuffix}
                </Text>
                <Text style={styles.calcResultSub}>
                  Includes 100% returnable compulsory savings unlocked upon loan completion
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {isBike ? (
          <View style={styles.dualBtnRow}>
            <TouchableOpacity
              style={styles.outrightSecondaryBtn}
              onPress={() => setShowOutrightModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.outrightSecondaryBtnText}>
                Buy Outright (₦{breakdown.totalOutright.toLocaleString()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => onApplyBNPL(product, selectedTenure)}
              activeOpacity={0.85}
            >
              <CreditCard size={18} color="#FFFFFF" />
              <Text style={styles.applyBtnText}>
                Apply BNPL (₦{activeCadenceAmount.toLocaleString()}{activeCadenceSuffix})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => setShowOutrightModal(true)}
            activeOpacity={0.85}
          >
            <ShoppingBag size={18} color="#FFFFFF" />
            <Text style={styles.applyBtnText}>
              Buy Outright Now (₦{breakdown.totalOutright.toLocaleString()})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Outright Checkout & Receipt Modal */}
      <Modal visible={showOutrightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {outrightSuccess ? 'Order Confirmed! 🚀' : 'Outright Purchase Checkout'}
                </Text>
                <Text style={styles.modalSub}>
                  {outrightSuccess ? 'Dispatched from Lagos Hub' : 'No BNPL loan • Direct one-time payment'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowOutrightModal(false);
                  setOutrightSuccess(false);
                }}
              >
                <X size={20} color="#66728A" />
              </TouchableOpacity>
            </View>

            {outrightSuccess ? (
              <View style={styles.successContent}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={48} color="#2E3192" />
                </View>
                <Text style={styles.successHeading}>₦{breakdown.totalOutright.toLocaleString()} Paid</Text>
                <Text style={styles.successMsg}>
                  Your order for <Text style={{ fontWeight: '800' }}>{product.name}</Text> has been processed. Delivery is scheduled within 24–48 hours to your registered address.
                </Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setShowOutrightModal(false);
                    setOutrightSuccess(false);
                    onBack();
                  }}
                >
                  <Text style={styles.doneBtnText}>Return to Shop</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.orderSummaryBox}>
                  <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>Item:</Text>
                    <Text style={styles.orderVal}>{product.name}</Text>
                  </View>
                  <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>Base Price:</Text>
                    <Text style={styles.orderVal}>₦{breakdown.basePrice.toLocaleString()}</Text>
                  </View>
                  <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>
                      {deliveryType === 'pickup'
                        ? 'Hub Pickup:'
                        : deliveryType === 'delivery_lagos'
                        ? 'Delivery (Lagos):'
                        : 'Delivery (Interstate):'}
                    </Text>
                    <Text style={[styles.orderVal, breakdown.deliveryFee === 0 && { color: '#087F75' }]}>
                      {breakdown.deliveryFee === 0 ? 'FREE (₦0)' : `₦${breakdown.deliveryFee.toLocaleString()}`}
                    </Text>
                  </View>
                  <View style={[styles.orderRow, styles.orderRowTotal]}>
                    <Text style={styles.orderTotalLabel}>Total Amount:</Text>
                    <Text style={styles.orderTotalAmount}>₦{breakdown.totalOutright.toLocaleString()}</Text>
                  </View>
                </View>

                <Text style={styles.paymentMethodNotice}>
                  ⚡ Payment will be completed via Mono DirectPay (Pay with Bank / Card / Transfer) or Wallet Balance.
                </Text>

                <TouchableOpacity
                  style={styles.confirmBuyBtn}
                  onPress={handleBuyOutright}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBuyBtnText}>
                    Confirm & Pay ₦{breakdown.totalOutright.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F6F7FC',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBE2F0',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    maxWidth: 240,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  heroImageCard: {
    height: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 16,
    position: 'relative',
    padding: 20,
  },
  heroImage: {
    width: '90%',
    height: '90%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#E7F9F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#4A50AE',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  stockBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  stockBadgeText: {
    color: '#2E3192',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  brandModel: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    marginBottom: 14,
  },
  pricingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F6F7FC',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  cashLabel: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
  },
  cashPrice: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginTop: 1,
  },
  cashSub: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  bnplTagBox: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'flex-end',
  },
  bnplTagHeader: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#065F46',
  },
  bnplTagPrice: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#047857',
  },
  bnplTagSub: {
    fontSize: 9,
    color: '#087F75',
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
    marginBottom: 12,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specTile: {
    flexBasis: '48%',
    backgroundColor: '#F6F7FC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  specTileLabel: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
    marginTop: 6,
  },
  specTileVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2E3192',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#334155',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  calculatorCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  calcHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  calcHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calcTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#92400E',
  },
  calcRateBadge: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  calcSubtitle: {
    fontSize: 11,
    color: '#B45309',
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  tenureChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tenureChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  tenureChipActive: {
    backgroundColor: '#2E3192',
    borderColor: '#2E3192',
  },
  tenureChipNum: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#78350F',
  },
  tenureChipNumActive: {
    color: '#FFFFFF',
  },
  tenureChipWeeks: {
    fontSize: 9,
    color: '#92400E',
    fontFamily: 'Inter_500Medium',
  },
  tenureChipWeeksActive: {
    color: '#E0E7FF',
  },
  calcResultBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  calcResultLabel: {
    fontSize: 11,
    color: '#78350F',
    fontFamily: 'Inter_600SemiBold',
  },
  calcResultAmount: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
    marginVertical: 2,
  },
  calcResultSub: {
    fontSize: 10,
    color: '#92400E',
    fontFamily: 'Inter_400Regular',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#DBE2F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  applyBtn: {
    backgroundColor: '#2E3192',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  dualBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outrightSecondaryBtn: {
    flex: 1,
    backgroundColor: '#EDF2FA',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  outrightSecondaryBtnText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },

  /* Itemized Breakdown Card */
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 16,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  breakdownHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  breakdownTypeBadge: {
    backgroundColor: '#E7F9F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  breakdownTypeBadgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#4A50AE',
  },
  breakdownList: {
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2FA',
  },
  breakdownItemLabel: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'Inter_600SemiBold',
  },
  breakdownItemHint: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  breakdownItemVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0A154F',
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F6F7FC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBE2F0',
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  breakdownTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
  },

  /* BNPL Details */
  bnplFinancingDetails: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
    gap: 6,
  },
  bnplDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bnplDetailLabel: {
    fontSize: 11,
    color: '#92400E',
    fontFamily: 'Inter_500Medium',
  },
  bnplDetailVal: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#78350F',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  modalSub: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#EDF2FA',
  },
  orderSummaryBox: {
    backgroundColor: '#F6F7FC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  orderLabel: {
    fontSize: 12,
    color: '#66728A',
    fontFamily: 'Inter_500Medium',
  },
  orderVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1E293B',
  },
  orderRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#DBE2F0',
    paddingTop: 10,
    marginTop: 6,
  },
  orderTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  orderTotalAmount: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
  },
  paymentMethodNotice: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
    backgroundColor: '#E7F9F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  confirmBuyBtn: {
    backgroundColor: '#2E3192',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2E3192',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBuyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#065F46',
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  doneBtn: {
    backgroundColor: '#2E3192',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  deliverySelectorSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBE2F0',
    shadowColor: '#0A154F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  deliverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deliverySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  deliverySectionSub: {
    fontSize: 11,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  deliveryOptionsList: {
    gap: 8,
  },
  deliveryOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DBE2F0',
    backgroundColor: '#F6F7FC',
  },
  deliveryOptionCardActive: {
    borderColor: '#2E3192',
    backgroundColor: '#E7F9F6',
  },
  deliveryOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  radioInnerActive: {
    backgroundColor: '#2E3192',
  },
  deliveryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  deliveryOptionName: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0A154F',
  },
  deliveryOptionPrice: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
  },
  deliveryOptionDesc: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    lineHeight: 14,
  },
  bnplDetailHint: {
    fontSize: 10,
    color: '#66728A',
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
});

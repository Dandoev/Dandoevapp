import React, { useState } from "react";
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
  TextInput,
  Linking,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
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
  AlertTriangle,
  RefreshCw,
  Phone,
  MapPin,
  ChevronRight,
  MessageSquare,
} from "lucide-react-native";
import {
  demoStore,
  DemoProduct,
  getProductPriceBreakdown,
  DeliveryType,
} from "../lib/demo-data";
import { getProductAsset } from "../lib/bike-assets";
import { MobileApi } from "../lib/api";
import { APP_CONFIG } from "../lib/config";

interface ProductDetailScreenProps {
  product?: DemoProduct;
  token: string | null;
  onBack: () => void;
  onApplyBNPL: (product: DemoProduct, tenureMonths: number) => void;
}

export default function ProductDetailScreen({
  product = demoStore.getSelectedProduct(),
  token,
  onBack,
  onApplyBNPL,
}: ProductDetailScreenProps) {
  const [selectedTenure, setSelectedTenure] = useState<number>(12);
  const selectedCadence: "weekly" = "weekly";
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [showOutrightModal, setShowOutrightModal] = useState<boolean>(false);
  const [outrightSuccess, setOutrightSuccess] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [pendingPayment, setPendingPayment] = useState<{
    reference: string;
    authorizationUrl: string;
  } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{
    id: string;
    amount: number;
  } | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [confirmedOrderData, setConfirmedOrderData] = useState<{
    orderId: string;
    reference: string;
    amount: number;
    itemName: string;
    deliveryType: DeliveryType;
    deliveryAddress: string;
    deliveryPhone: string;
  } | null>(null);

  const isBike = product.type === "bike";
  const breakdown = getProductPriceBreakdown(
    product,
    selectedTenure,
    deliveryType,
  );

  const weeklyAmt = breakdown.weeklyDeduction || 0;
  const activeCadenceAmount = weeklyAmt;
  const activeCadenceSuffix = "/wk";

  const handleShare = () => {
    setShareToast(`Link for ${product.name} copied to clipboard!`);
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleBuyOutright = async () => {
    if (!token || token.startsWith("demo-token")) {
      setPurchaseError(
        "Sign in with your customer account to complete a real purchase.",
      );
      return;
    }
    if (!/^\+?\d{10,15}$/.test(deliveryPhone.trim())) {
      setPurchaseError("Enter a valid phone number for your order.");
      return;
    }
    if (
      deliveryType !== "pickup" &&
      (!deliveryAddress.trim() || !deliveryCity.trim() || !deliveryState.trim())
    ) {
      setPurchaseError("Enter your delivery address, city and state.");
      return;
    }
    setPurchaseLoading(true);
    setPurchaseError(null);
    setPaymentNotice(null);
    try {
      let payment = pendingPayment;
      let order = pendingOrder;
      if (!payment) {
        if (!order) {
          const created = await MobileApi.createOrder(
            {
              bikeId: product.type === "bike" ? product.id : undefined,
              quantity: 1,
              paymentMethod: "bank_transfer",
              deliveryType,
              deliveryAddress:
                deliveryType === "pickup"
                  ? "Lagos Central Pickup Hub"
                  : deliveryAddress.trim(),
              deliveryCity:
                deliveryType === "pickup" ? "Ikeja" : deliveryCity.trim(),
              deliveryState:
                deliveryType === "pickup" ? "Lagos" : deliveryState.trim(),
              deliveryPhone: deliveryPhone.trim(),
              accessories:
                product.type !== "bike"
                  ? [{ id: product.id, quantity: 1 }]
                  : undefined,
            },
            token,
          );
          if (!created.orderId || !Number.isFinite(Number(created.totalAmount)))
            throw new Error("The order could not be created.");
          order = { id: created.orderId, amount: Number(created.totalAmount) };
          setPendingOrder(order);
        }

        const initialized = await MobileApi.initializePayment(
          {
            amount: order.amount,
            orderId: order.id,
            provider: "mono",
            callbackUrl: `${APP_CONFIG.apiBaseUrl}/checkout/mobile-return`,
          },
          token,
        );
        if (
          !initialized.data?.authorizationUrl ||
          !/^https:\/\//i.test(initialized.data.authorizationUrl)
        ) {
          throw new Error(
            "The payment provider did not return a valid secure payment link. Please try again.",
          );
        }
        payment = {
          reference: initialized.data.reference,
          authorizationUrl: initialized.data.authorizationUrl,
        };
        setPendingPayment(payment);
      }
      const browserResult = await WebBrowser.openAuthSessionAsync(
        payment.authorizationUrl,
        "dandoev://payment-callback",
      );
      if (browserResult.type !== "success") {
        setPaymentNotice(
          "Payment window closed. Your order is saved. You can return to payment or check its status.",
        );
        return;
      }
      const verification = await MobileApi.verifyPayment(
        payment.reference,
        token,
      );
      if (verification.data.status !== "success") {
        setPaymentNotice(
          "Mono is still confirming your payment. Use Check payment status shortly.",
        );
        return;
      }
      setConfirmedOrderData({
        orderId: order?.id || pendingOrder?.id || "DND-ORDER",
        reference: payment.reference,
        amount: order?.amount || breakdown.totalOutright,
        itemName: product.name,
        deliveryType,
        deliveryAddress:
          deliveryType === "pickup"
            ? "DandoEv Central Lagos Hub (Ikeja, Lagos)"
            : [
                deliveryAddress.trim(),
                deliveryCity.trim(),
                deliveryState.trim(),
              ]
                .filter(Boolean)
                .join(", "),
        deliveryPhone: deliveryPhone.trim(),
      });
      setPendingPayment(null);
      setPendingOrder(null);
      setPurchaseError(null);
      setPaymentNotice(null);
      setOutrightSuccess(true);
    } catch (error) {
      setPurchaseError(
        error instanceof Error
          ? error.message
          : "Unable to complete this purchase.",
      );
    } finally {
      setPurchaseLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!pendingPayment || !token) return;
    setPurchaseLoading(true);
    setPurchaseError(null);
    try {
      const result = await MobileApi.verifyPayment(
        pendingPayment.reference,
        token,
      );
      if (result.data.status === "success") {
        setConfirmedOrderData({
          orderId:
            pendingOrder?.id ||
            "DND-" + pendingPayment.reference.slice(-6).toUpperCase(),
          reference: pendingPayment.reference,
          amount: pendingOrder?.amount || breakdown.totalOutright,
          itemName: product.name,
          deliveryType,
          deliveryAddress:
            deliveryType === "pickup"
              ? "DandoEv Central Lagos Hub (Ikeja, Lagos)"
              : [
                  deliveryAddress.trim(),
                  deliveryCity.trim(),
                  deliveryState.trim(),
                ]
                  .filter(Boolean)
                  .join(", "),
          deliveryPhone: deliveryPhone.trim(),
        });
        setOutrightSuccess(true);
        setPendingPayment(null);
        setPendingOrder(null);
        setPaymentNotice(null);
        setPurchaseError(null);
      } else {
        setPaymentNotice("Payment is still awaiting confirmation from Mono.");
      }
    } catch (error) {
      setPaymentNotice(
        error instanceof Error
          ? error.message
          : "Payment is still awaiting confirmation.",
      );
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
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
        <View
          style={{
            backgroundColor: "#021064",
            paddingVertical: 8,
            paddingHorizontal: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#26FEDC",
              fontSize: 12,
              fontFamily: "PlusJakartaSans_700Bold",
            }}
          >
            {shareToast}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Card */}
        <View style={styles.heroImageCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {product.category.toUpperCase()}
            </Text>
          </View>
          <Image
            source={getProductAsset(product.model || product.name)}
            style={[
              styles.heroImage,
              product.id === "bike-g90" && styles.heroImageLarge,
            ]}
            resizeMode="contain"
          />
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>
              In Stock • Lagos Warehouse
            </Text>
          </View>
        </View>

        {/* Title & Pricing Section */}
        <View style={styles.headerSection}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.brandModel}>
            Brand: {product.brand} • Model: {product.model}
          </Text>

          <View style={styles.pricingCard}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text style={styles.cashLabel}>Base Item Price</Text>
              <Text style={styles.cashPrice}>
                ₦{product.price.toLocaleString()}
              </Text>
              <Text style={styles.cashSub}>
                10% insurance included on checkout
              </Text>
            </View>

            {isBike ? (
              <View style={styles.bnplTagBox}>
                <Text style={styles.bnplTagHeader}>PAY-AS-YOU-RIDE</Text>
                <Text style={styles.bnplTagPrice}>
                  ₦{activeCadenceAmount.toLocaleString()}
                  {activeCadenceSuffix}
                </Text>
                <Text style={styles.bnplTagSub}>
                  100% Returnable Escrow • {selectedTenure} Mo
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.bnplTagBox,
                  { backgroundColor: "#E8F6FE", borderColor: "#BFDBFE" },
                ]}
              >
                <Text style={[styles.bnplTagHeader, { color: "#1768D1" }]}>
                  PURCHASE MODEL
                </Text>
                <Text
                  style={[
                    styles.bnplTagPrice,
                    { color: "#0A154F", fontSize: 13 },
                  ]}
                >
                  Outright Only
                </Text>
                <Text style={[styles.bnplTagSub, { color: "#1768D1" }]}>
                  No BNPL for Accessories
                </Text>
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
                <Text style={styles.specTileVal}>
                  {product.motorPower} Watts
                </Text>
              </View>
            )}
            {product.batteryCapacity && (
              <View style={styles.specTile}>
                <Battery size={20} color="#2E3192" />
                <Text style={styles.specTileLabel}>Battery Capacity</Text>
                <Text style={styles.specTileVal}>
                  {product.batteryCapacity} Ah Lithium
                </Text>
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
                <Text style={styles.specTileVal}>
                  {product.rangeKm} km / charge
                </Text>
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
          <Text style={styles.sectionHeader}>
            Included Features & Capabilities
          </Text>
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
            <Text style={styles.deliverySectionTitle}>
              Fulfillment & Delivery Option
            </Text>
          </View>
          <Text style={styles.deliverySectionSub}>
            Select pickup or delivery location (applies to both Outright &
            BNPL):
          </Text>

          <View style={styles.deliveryOptionsList}>
            {/* Option 1: Pickup */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryType === "pickup" && styles.deliveryOptionCardActive,
              ]}
              onPress={() => setDeliveryType("pickup")}
              activeOpacity={0.8}
            >
              <View style={styles.deliveryOptionRadio}>
                <View
                  style={[
                    styles.radioInner,
                    deliveryType === "pickup" && styles.radioInnerActive,
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={styles.deliveryOptionName}>
                    🏪 Hub Self-Pickup
                  </Text>
                  <Text
                    style={[styles.deliveryOptionPrice, { color: "#087F75" }]}
                  >
                    FREE (₦0)
                  </Text>
                </View>
                <Text style={styles.deliveryOptionDesc}>
                  Collect directly at Ikeja Service & Central Swap Hub. Ready in
                  24 hrs.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Within Lagos */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryType === "delivery_lagos" &&
                  styles.deliveryOptionCardActive,
              ]}
              onPress={() => setDeliveryType("delivery_lagos")}
              activeOpacity={0.8}
            >
              <View style={styles.deliveryOptionRadio}>
                <View
                  style={[
                    styles.radioInner,
                    deliveryType === "delivery_lagos" &&
                      styles.radioInnerActive,
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={styles.deliveryOptionName}>
                    🚚 Delivery Within Lagos
                  </Text>
                  <Text style={styles.deliveryOptionPrice}>₦20,000</Text>
                </View>
                <Text style={styles.deliveryOptionDesc}>
                  Doorstep courier across Lagos Mainland, Lagos Island & Lekki
                  axis, and Badagry (1–2 days).
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 3: Hauling / Outside Lagos */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryType === "delivery_outside" &&
                  styles.deliveryOptionCardActive,
              ]}
              onPress={() => setDeliveryType("delivery_outside")}
              activeOpacity={0.8}
            >
              <View style={styles.deliveryOptionRadio}>
                <View
                  style={[
                    styles.radioInner,
                    deliveryType === "delivery_outside" &&
                      styles.radioInnerActive,
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={styles.deliveryOptionName}>
                    🚛 Interstate Hauling & Delivery
                  </Text>
                  <Text style={styles.deliveryOptionPrice}>₦50,000</Text>
                </View>
                <Text style={styles.deliveryOptionDesc}>
                  Tracked nationwide freight hauling with protective crating
                  (3–5 days).
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Detailed Lagos Delivery Zones Reference */}
          {deliveryType === "delivery_lagos" && (
            <View style={styles.zonesBox}>
              <Text style={styles.zonesHeader}>
                Covered Delivery Locations for Riders:
              </Text>

              <View style={styles.zoneGroup}>
                <Text style={styles.zoneGroupTitle}>• Lagos Mainland:</Text>
                <Text style={styles.zoneGroupText}>
                  Ikeja, Ogba, Agege, Alimosho, Egbeda, Ipaja, Iyana-Ipaja,
                  Abule-Egba, Ikotun, Oshodi, Isolo, Ejigbo, Mushin, Surulere,
                  Yaba, Ebute-Metta, Apapa, Festac, Mile 2, Amuwo-Odofin,
                  Maryland, Anthony, Gbagada, Somolu, Bariga, Ketu, Mile 12,
                  Magodo, Ojodu, Berger, and Ikorodu.
                </Text>
              </View>

              <View style={styles.zoneGroup}>
                <Text style={styles.zoneGroupTitle}>
                  • Lagos Island & Lekki axis:
                </Text>
                <Text style={styles.zoneGroupText}>
                  Lagos Island, Marina, CMS, Ikoyi, Victoria Island, Lekki Phase
                  1, Chevron, VGC, Ajah, Sangotedo, Awoyaya, Epe, and
                  Ibeju-Lekki.
                </Text>
              </View>

              <View style={styles.zoneGroup}>
                <Text style={styles.zoneGroupTitle}>
                  • Other parts of Lagos State:
                </Text>
                <Text style={styles.zoneGroupText}>
                  Badagry and surrounding areas.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Outright Itemized Price & Delivery Breakdown */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeaderRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Receipt size={18} color="#2E3192" />
              <Text style={styles.breakdownHeaderTitle}>
                Outright Purchase Breakdown
              </Text>
            </View>
            <View style={styles.breakdownTypeBadge}>
              <Text style={styles.breakdownTypeBadgeText}>No Hidden Fees</Text>
            </View>
          </View>

          <View style={styles.breakdownList}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownItemLabel}>Base Asset Price</Text>
              <Text style={styles.breakdownItemVal}>
                ₦{breakdown.basePrice.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.breakdownItem, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.breakdownItemLabel}>
                  {deliveryType === "pickup"
                    ? "Fulfillment (Hub Self-Pickup)"
                    : deliveryType === "delivery_lagos"
                      ? "Doorstep Delivery (Within Lagos)"
                      : "Interstate Delivery (Outside Lagos)"}
                </Text>
                <Text style={styles.breakdownItemHint}>
                  {deliveryType === "pickup"
                    ? "Zero shipping charges at Lagos Hub"
                    : deliveryType === "delivery_lagos"
                      ? "Insured express delivery within Lagos State"
                      : "Tracked nationwide freight across Nigeria"}
                </Text>
              </View>
              <Text
                style={[
                  styles.breakdownItemVal,
                  breakdown.deliveryFee === 0 && { color: "#087F75" },
                ]}
              >
                {breakdown.deliveryFee === 0
                  ? "FREE (₦0)"
                  : `₦${breakdown.deliveryFee.toLocaleString()}`}
              </Text>
            </View>
          </View>

          <View style={styles.breakdownTotalRow}>
            <Text style={styles.breakdownTotalLabel}>
              Total Outright Amount Payable
            </Text>
            <Text style={styles.breakdownTotalVal}>
              ₦{breakdown.totalOutright.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* BNPL Financing Simulator (ONLY FOR E-BIKES) */}
        {isBike ? (
          <View style={styles.calculatorCard}>
            <View style={styles.calcHeaderRow}>
              <View style={styles.calcHeaderLeft}>
                <Sparkles size={18} color="#D97706" />
                <Text style={styles.calcTitle}>
                  Pay-As-You-Ride BNPL Simulator
                </Text>
              </View>
              <Text style={styles.calcRateBadge}>4% / Month Fixed</Text>
            </View>

            <Text style={styles.calcSubtitle}>
              Select your preferred repayment tenure (weekly deduction
              schedule):
            </Text>

            {/* Weekly Deduction Locked Indicator */}
            <View style={{ flexDirection: "row", marginBottom: 14 }}>
              <View
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: "#2E3192",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: "#FFFFFF",
                  }}
                >
                  Weekly Deduction
                </Text>
              </View>
            </View>

            {/* Tenure Chips */}
            <View style={styles.tenureChipRow}>
              {[6, 12, 18].map((months) => {
                const isSelected = selectedTenure === months;
                return (
                  <TouchableOpacity
                    key={months}
                    style={[
                      styles.tenureChip,
                      isSelected && styles.tenureChipActive,
                    ]}
                    onPress={() => setSelectedTenure(months)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tenureChipNum,
                        isSelected && styles.tenureChipNumActive,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {months} Months
                    </Text>
                    <Text
                      style={[
                        styles.tenureChipWeeks,
                        isSelected && styles.tenureChipWeeksActive,
                      ]}
                      numberOfLines={1}
                    >
                      ({Math.round(months * 4.33)} Wks)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* BNPL Itemized Breakdown */}
            <View style={styles.bnplFinancingDetails}>
              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>Base Asset Price:</Text>
                <Text style={styles.bnplDetailVal}>
                  ₦{breakdown.basePrice.toLocaleString()}
                </Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <View>
                  <Text style={styles.bnplDetailLabel}>
                    1-Year Comprehensive Insurance (10%):
                  </Text>
                  <Text style={styles.bnplDetailHint}>
                    Compulsory theft, fire, accident & battery cover
                  </Text>
                </View>
                <Text style={styles.bnplDetailVal}>
                  ₦{breakdown.insuranceFee.toLocaleString()}
                </Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <View>
                  <Text style={styles.bnplDetailLabel}>
                    Platform & Loan Servicing Fee:
                  </Text>
                  <Text style={styles.bnplDetailHint}>
                    Underwriting & direct-debit setup
                  </Text>
                </View>
                <Text style={styles.bnplDetailVal}>
                  ₦{breakdown.serviceFee.toLocaleString()}
                </Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>
                  {deliveryType === "pickup"
                    ? "Fulfillment (Hub Pickup):"
                    : deliveryType === "delivery_lagos"
                      ? "Delivery (Within Lagos):"
                      : "Delivery (Outside Lagos):"}
                </Text>
                <Text
                  style={[
                    styles.bnplDetailVal,
                    breakdown.deliveryFee === 0 && { color: "#087F75" },
                  ]}
                >
                  {breakdown.deliveryFee === 0
                    ? "FREE (₦0)"
                    : `₦${breakdown.deliveryFee.toLocaleString()}`}
                </Text>
              </View>

              <View
                style={[
                  styles.bnplDetailRow,
                  {
                    borderTopWidth: 1,
                    borderTopColor: "#DBE2F0",
                    paddingTop: 8,
                    marginTop: 4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bnplDetailLabel,
                    { fontWeight: "800", color: "#0A154F" },
                  ]}
                >
                  Total Financed Sum:
                </Text>
                <Text
                  style={[
                    styles.bnplDetailVal,
                    { fontWeight: "900", color: "#2E3192" },
                  ]}
                >
                  ₦{breakdown.totalFinanced?.toLocaleString()}
                </Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>
                  Total Interest ({selectedTenure} Mo @ 4%/mo):
                </Text>
                <Text style={styles.bnplDetailVal}>
                  ₦{breakdown.totalInterest?.toLocaleString()}
                </Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>
                  Save-As-You-Ride Sweep (100% Returnable):
                </Text>
                <Text style={styles.bnplDetailVal}>
                  ₦1,000/day (Unlocked at Payoff)
                </Text>
              </View>

              <View style={styles.bnplDetailRow}>
                <Text style={styles.bnplDetailLabel}>
                  Initial Down Payment:
                </Text>
                <Text
                  style={[
                    styles.bnplDetailVal,
                    { color: "#2E3192", fontWeight: "900" },
                  ]}
                >
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
                  ₦{activeCadenceAmount.toLocaleString()}
                  {activeCadenceSuffix}
                </Text>
                <Text style={styles.calcResultSub}>
                  Includes 100% returnable compulsory savings unlocked upon loan
                  completion
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
              <Text
                style={styles.outrightSecondaryBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Buy Outright
              </Text>
              <Text style={styles.outrightSecondaryBtnSub} numberOfLines={1}>
                ₦{breakdown.totalOutright.toLocaleString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => onApplyBNPL(product, selectedTenure)}
              activeOpacity={0.85}
            >
              <CreditCard size={16} color="#FFFFFF" />
              <View style={{ alignItems: "center" }}>
                <Text
                  style={styles.applyBtnText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Apply BNPL
                </Text>
                <Text style={styles.applyBtnSub} numberOfLines={1}>
                  ₦{activeCadenceAmount.toLocaleString()}
                  {activeCadenceSuffix}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => setShowOutrightModal(true)}
            activeOpacity={0.85}
          >
            <ShoppingBag size={18} color="#FFFFFF" />
            <Text style={styles.applyBtnText} numberOfLines={1}>
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
                  {outrightSuccess
                    ? "Order Confirmed! 🚀"
                    : "Outright Purchase Checkout"}
                </Text>
                <Text style={styles.modalSub}>
                  {outrightSuccess
                    ? "Payment verified • Order confirmed"
                    : "Secure one-time payment"}
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
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View style={styles.receiptHero}>
                  <View style={styles.receiptIconBubble}>
                    <CheckCircle2 size={40} color="#10B981" />
                  </View>
                  <Text style={styles.receiptEyebrow}>PAYMENT VERIFIED</Text>
                  <Text style={styles.receiptTitle}>Order Confirmed! 🚀</Text>
                  <Text style={styles.receiptAmount}>
                    ₦
                    {(
                      confirmedOrderData?.amount || breakdown.totalOutright
                    ).toLocaleString()}
                  </Text>
                  <Text style={styles.receiptSub}>
                    We have received your payment for{" "}
                    <Text style={{ fontWeight: "800", color: "#0A154F" }}>
                      {product.name}
                    </Text>
                    . An official confirmation email and SMS have been
                    dispatched.
                  </Text>
                  <View style={styles.receiptRefRow}>
                    <Text style={styles.receiptRefLabel}>ORDER REF:</Text>
                    <Text style={styles.receiptRefVal}>
                      #
                      {(confirmedOrderData?.orderId || "ORDER")
                        .slice(0, 8)
                        .toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptCard}>
                  <Text style={styles.receiptCardTitle}>
                    Fulfillment Details
                  </Text>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Method:</Text>
                    <Text style={styles.receiptDetailVal}>
                      {deliveryType === "pickup"
                        ? "Hub Self-Pickup"
                        : deliveryType === "delivery_lagos"
                          ? "Doorstep Delivery (Lagos)"
                          : "Interstate Delivery"}
                    </Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Location:</Text>
                    <Text style={styles.receiptDetailVal}>
                      {deliveryType === "pickup"
                        ? "DandoEv Central Hub (Ikeja, Lagos)"
                        : confirmedOrderData?.deliveryAddress ||
                          deliveryAddress ||
                          "Address on file"}
                    </Text>
                  </View>
                  <View
                    style={[styles.receiptDetailRow, { borderBottomWidth: 0 }]}
                  >
                    <Text style={styles.receiptDetailLabel}>
                      Contact Phone:
                    </Text>
                    <Text style={styles.receiptDetailVal}>
                      {confirmedOrderData?.deliveryPhone ||
                        deliveryPhone ||
                        "On file"}
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptCard}>
                  <Text style={styles.receiptCardTitle}>
                    Order Progress Tracker
                  </Text>
                  <View style={styles.trackerStep}>
                    <View style={[styles.trackerDot, styles.trackerDotDone]}>
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    <View style={styles.trackerContent}>
                      <Text style={styles.trackerTitle}>
                        1. Payment Verified & Reconciled
                      </Text>
                      <Text style={styles.trackerDesc}>
                        Mono transaction settled successfully.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.trackerStep}>
                    <View style={[styles.trackerDot, styles.trackerDotActive]}>
                      <Text style={styles.trackerDotNum}>2</Text>
                    </View>
                    <View style={styles.trackerContent}>
                      <Text style={styles.trackerTitle}>
                        2. PDI Diagnostics & Vehicle Preparation
                      </Text>
                      <Text style={styles.trackerDesc}>
                        Our technicians are preparing the battery and vehicle.
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.trackerStep,
                      { borderLeftWidth: 0, paddingBottom: 0 },
                    ]}
                  >
                    <View style={styles.trackerDot}>
                      <Text style={styles.trackerDotNum}>3</Text>
                    </View>
                    <View style={styles.trackerContent}>
                      <Text style={styles.trackerTitle}>
                        3. Handover & Key Release
                      </Text>
                      <Text style={styles.trackerDesc}>
                        Available for collection or courier dispatch in 24–48
                        hours.
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setShowOutrightModal(false);
                    setOutrightSuccess(false);
                    onBack();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.doneBtnText}>Return to Catalog</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.orderSummaryBox}>
                  <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>Item:</Text>
                    <Text style={styles.orderVal}>{product.name}</Text>
                  </View>
                  <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>Base Price:</Text>
                    <Text style={styles.orderVal}>
                      ₦{breakdown.basePrice.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>
                      Comprehensive Insurance (10%):
                    </Text>
                    <Text style={styles.orderVal}>
                      ₦{breakdown.insuranceFee.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>
                      {deliveryType === "pickup"
                        ? "Hub Pickup:"
                        : deliveryType === "delivery_lagos"
                          ? "Delivery (Lagos):"
                          : "Delivery (Interstate):"}
                    </Text>
                    <Text
                      style={[
                        styles.orderVal,
                        breakdown.deliveryFee === 0 && { color: "#087F75" },
                      ]}
                    >
                      {breakdown.deliveryFee === 0
                        ? "FREE (₦0)"
                        : `₦${breakdown.deliveryFee.toLocaleString()}`}
                    </Text>
                  </View>
                  <View style={[styles.orderRow, styles.orderRowTotal]}>
                    <Text style={styles.orderTotalLabel}>Total Amount:</Text>
                    <Text style={styles.orderTotalAmount}>
                      ₦{breakdown.totalOutright.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {!pendingOrder && (
                  <View style={styles.checkoutFields}>
                    <Text style={styles.checkoutLabel}>Delivery method</Text>
                    <View style={styles.deliveryChoices}>
                      {(
                        [
                          "pickup",
                          "delivery_lagos",
                          "delivery_outside",
                        ] as DeliveryType[]
                      ).map((choice) => (
                        <TouchableOpacity
                          key={choice}
                          onPress={() => setDeliveryType(choice)}
                          style={[
                            styles.deliveryChoice,
                            deliveryType === choice &&
                              styles.deliveryChoiceSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.deliveryChoiceText,
                              deliveryType === choice &&
                                styles.deliveryChoiceTextSelected,
                            ]}
                          >
                            {choice === "pickup"
                              ? "Pickup"
                              : choice === "delivery_lagos"
                                ? "Lagos"
                                : "Other state"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.checkoutLabel}>Contact phone</Text>
                    <TextInput
                      style={styles.checkoutInput}
                      value={deliveryPhone}
                      onChangeText={setDeliveryPhone}
                      keyboardType="phone-pad"
                      placeholder="080…"
                      placeholderTextColor="#94A3B8"
                      autoComplete="tel"
                    />
                    {deliveryType !== "pickup" && (
                      <>
                        <Text style={styles.checkoutLabel}>Street address</Text>
                        <TextInput
                          style={styles.checkoutInput}
                          value={deliveryAddress}
                          onChangeText={setDeliveryAddress}
                          placeholder="House number and street"
                          placeholderTextColor="#94A3B8"
                        />
                        <Text style={styles.checkoutLabel}>City</Text>
                        <TextInput
                          style={styles.checkoutInput}
                          value={deliveryCity}
                          onChangeText={setDeliveryCity}
                          placeholder="City"
                          placeholderTextColor="#94A3B8"
                        />
                        <Text style={styles.checkoutLabel}>State</Text>
                        <TextInput
                          style={styles.checkoutInput}
                          value={deliveryState}
                          onChangeText={setDeliveryState}
                          placeholder="State"
                          placeholderTextColor="#94A3B8"
                        />
                      </>
                    )}
                  </View>
                )}

                <Text style={styles.paymentMethodNotice}>
                  Your bank payment opens securely with Mono. Your order is
                  confirmed only after payment verification.
                </Text>

                {purchaseLoading && (
                  <View style={styles.loadingBanner}>
                    <ActivityIndicator size="small" color="#2E3192" />
                    <Text style={styles.loadingBannerText}>
                      Connecting to Mono DirectPay... Please keep this screen
                      open.
                    </Text>
                  </View>
                )}

                {/* Structured Failure & Warning Card */}
                {purchaseError ? (
                  <View style={styles.failureCard}>
                    <View style={styles.failureCardHeader}>
                      <AlertTriangle size={18} color="#DC2626" />
                      <Text style={styles.failureCardTitle}>
                        Payment Was Not Completed
                      </Text>
                    </View>
                    <Text style={styles.failureCardMsg}>{purchaseError}</Text>
                    <View style={styles.failureActionsRow}>
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={handleBuyOutright}
                        disabled={purchaseLoading}
                        activeOpacity={0.8}
                      >
                        <RefreshCw size={14} color="#FFFFFF" />
                        <Text style={styles.retryBtnText}>Retry Payment</Text>
                      </TouchableOpacity>
                      {pendingOrder && (
                        <TouchableOpacity
                          style={styles.resetBtn}
                          onPress={() => {
                            setPendingOrder(null);
                            setPendingPayment(null);
                            setPurchaseError(null);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.resetBtnText}>Edit Details</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : null}

                {paymentNotice ? (
                  <View style={styles.noticeCard}>
                    <AlertTriangle size={16} color="#D97706" />
                    <Text style={styles.noticeCardText}>{paymentNotice}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.confirmBuyBtn,
                    purchaseLoading && { opacity: 0.7 },
                  ]}
                  onPress={handleBuyOutright}
                  disabled={purchaseLoading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBuyBtnText}>
                    {purchaseLoading
                      ? "Processing…"
                      : pendingPayment
                        ? "Return to secure payment"
                        : `Confirm & Pay ₦${breakdown.totalOutright.toLocaleString()}`}
                  </Text>
                </TouchableOpacity>
                {pendingPayment && (
                  <TouchableOpacity
                    style={styles.checkStatusButton}
                    onPress={() => void checkPaymentStatus()}
                    disabled={purchaseLoading}
                    activeOpacity={0.8}
                  >
                    <RefreshCw
                      size={15}
                      color="#2E3192"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.checkStatusText}>
                      Check payment status
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
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
    backgroundColor: "#F6F7FC",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#DBE2F0",
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDF2FA",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
    maxWidth: 240,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  heroImageCard: {
    height: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBE2F0",
    shadowColor: "#0A154F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 16,
    position: "relative",
    padding: 20,
  },
  heroImage: {
    width: "90%",
    height: "90%",
  },
  heroImageLarge: {
    width: "135%",
    height: "135%",
  },
  categoryBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "#E8F6FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: "#4A50AE",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  stockBadge: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  stockBadgeText: {
    color: "#2E3192",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  headerSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DBE2F0",
    marginBottom: 16,
  },
  productName: {
    fontSize: 26,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
  },
  brandModel: {
    fontSize: 14,
    color: "#66728A",
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    marginBottom: 14,
  },
  pricingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F6F7FC",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBE2F0",
  },
  cashLabel: {
    fontSize: 12,
    color: "#66728A",
    fontFamily: "Inter_500Medium",
  },
  cashPrice: {
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
    marginTop: 1,
  },
  cashSub: {
    fontSize: 12,
    color: "#66728A",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  bnplTagBox: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    alignItems: "flex-end",
  },
  bnplTagHeader: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#065F46",
  },
  bnplTagPrice: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#047857",
  },
  bnplTagSub: {
    fontSize: 9,
    color: "#087F75",
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DBE2F0",
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
    marginBottom: 12,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specTile: {
    flexBasis: "48%",
    backgroundColor: "#F6F7FC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DBE2F0",
  },
  specTileLabel: {
    fontSize: 10,
    color: "#66728A",
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  specTileVal: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#0A154F",
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: "#475569",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2E3192",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    color: "#334155",
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  calculatorCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
  },
  calcHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  calcHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calcTitle: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#92400E",
  },
  calcRateBadge: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  calcSubtitle: {
    fontSize: 13,
    color: "#B45309",
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  tenureChipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tenureChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  tenureChipActive: {
    backgroundColor: "#1E1B4B",
    borderColor: "#1E1B4B",
  },
  tenureChipNum: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#78350F",
  },
  tenureChipNumActive: {
    color: "#FFFFFF",
  },
  tenureChipWeeks: {
    fontSize: 9.5,
    color: "#92400E",
    fontFamily: "Inter_600SemiBold",
    marginTop: 1,
  },
  tenureChipWeeksActive: {
    color: "#E0E7FF",
  },
  calcResultBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  calcResultLabel: {
    fontSize: 13,
    color: "#78350F",
    fontFamily: "Inter_600SemiBold",
  },
  calcResultAmount: {
    fontSize: 26,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#2E3192",
    marginVertical: 2,
  },
  calcResultSub: {
    fontSize: 12,
    color: "#92400E",
    fontFamily: "Inter_400Regular",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#DBE2F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  applyBtn: {
    backgroundColor: "#1E1B4B",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    lineHeight: 16,
  },
  applyBtnSub: {
    color: "#E0E7FF",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    lineHeight: 14,
  },
  dualBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  outrightSecondaryBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  outrightSecondaryBtnText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    lineHeight: 16,
  },
  outrightSecondaryBtnSub: {
    color: "#475569",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    lineHeight: 14,
  },

  /* Itemized Breakdown Card */
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DBE2F0",
    marginBottom: 16,
  },
  breakdownHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  breakdownHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
  },
  breakdownTypeBadge: {
    backgroundColor: "#E8F6FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  breakdownTypeBadgeText: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#4A50AE",
  },
  breakdownList: {
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2FA",
  },
  breakdownItemLabel: {
    fontSize: 12,
    color: "#334155",
    fontFamily: "Inter_600SemiBold",
  },
  breakdownItemHint: {
    fontSize: 10,
    color: "#66728A",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  breakdownItemVal: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#0A154F",
  },
  breakdownTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F6F7FC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBE2F0",
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
  },
  breakdownTotalVal: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#2E3192",
  },

  /* BNPL Details */
  bnplFinancingDetails: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 14,
    gap: 6,
  },
  bnplDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  bnplDetailLabel: {
    fontSize: 13,
    color: "#92400E",
    fontFamily: "Inter_500Medium",
    flex: 1,
    flexShrink: 1,
  },
  bnplDetailVal: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#78350F",
    flexShrink: 1,
    textAlign: "right",
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
  },
  modalSub: {
    fontSize: 11,
    color: "#66728A",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#EDF2FA",
  },
  orderSummaryBox: {
    backgroundColor: "#F6F7FC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DBE2F0",
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  orderLabel: {
    fontSize: 12,
    color: "#66728A",
    fontFamily: "Inter_500Medium",
  },
  orderVal: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1E293B",
  },
  orderRowTotal: {
    borderTopWidth: 1,
    borderTopColor: "#DBE2F0",
    paddingTop: 10,
    marginTop: 6,
  },
  orderTotalLabel: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
  },
  orderTotalAmount: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#2E3192",
  },
  paymentMethodNotice: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
    backgroundColor: "#E8F6FE",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  checkoutFields: { marginBottom: 16 },
  checkoutLabel: {
    color: "#102152",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 7,
    marginTop: 10,
  },
  checkoutInput: {
    borderWidth: 1,
    borderColor: "#D8E5EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#102152",
    fontFamily: "Inter_400Regular",
    backgroundColor: "#FAFCFD",
  },
  deliveryChoices: { flexDirection: "row", gap: 7, marginBottom: 4 },
  deliveryChoice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D8E5EB",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  deliveryChoiceSelected: {
    borderColor: "#117F78",
    backgroundColor: "#E3F9F1",
  },
  deliveryChoiceText: {
    color: "#607384",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  deliveryChoiceTextSelected: { color: "#102152" },
  paymentNotice: {
    backgroundColor: "#E3F9F1",
    color: "#102152",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkStatusButton: { alignItems: "center", padding: 15 },
  checkStatusText: {
    color: "#117F78",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  confirmBuyBtn: {
    backgroundColor: "#2E3192",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#2E3192",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBuyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  successContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#065F46",
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  doneBtn: {
    backgroundColor: "#2E3192",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  deliverySelectorSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBE2F0",
    shadowColor: "#0A154F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  deliverySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  deliverySectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
  },
  deliverySectionSub: {
    fontSize: 11,
    color: "#66728A",
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  deliveryOptionsList: {
    gap: 8,
  },
  deliveryOptionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#DBE2F0",
    backgroundColor: "#F6F7FC",
  },
  deliveryOptionCardActive: {
    borderColor: "#2E3192",
    backgroundColor: "#E8F6FE",
  },
  deliveryOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  radioInnerActive: {
    backgroundColor: "#2E3192",
  },
  deliveryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  deliveryOptionName: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
  },
  deliveryOptionPrice: {
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#2E3192",
  },
  deliveryOptionDesc: {
    fontSize: 10,
    color: "#66728A",
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },
  zonesBox: {
    marginTop: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  zonesHeader: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#0A154F",
    marginBottom: 8,
  },
  zoneGroup: {
    marginBottom: 6,
  },
  zoneGroupTitle: {
    fontSize: 10.5,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1E1B4B",
    marginBottom: 2,
  },
  zoneGroupText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    lineHeight: 15,
  },
  bnplDetailHint: {
    fontSize: 10,
    color: "#66728A",
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  receiptHero: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 14,
  },
  receiptIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  receiptEyebrow: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#10B981",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
    marginBottom: 6,
  },
  receiptAmount: {
    fontSize: 24,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#10B981",
    marginBottom: 6,
  },
  receiptSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  receiptRefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  receiptRefLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontFamily: "Inter_600SemiBold",
  },
  receiptRefVal: {
    fontSize: 11.5,
    color: "#0A154F",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  receiptCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  receiptCardTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#0A154F",
    marginBottom: 10,
  },
  receiptDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2FA",
  },
  receiptDetailLabel: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
  },
  receiptDetailVal: {
    fontSize: 12,
    color: "#0A154F",
    fontFamily: "Inter_600SemiBold",
    maxWidth: "65%",
    textAlign: "right",
  },
  trackerStep: {
    flexDirection: "row",
    gap: 12,
    paddingLeft: 4,
    paddingBottom: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#E2E8F0",
    marginLeft: 8,
  },
  trackerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -11,
  },
  trackerDotDone: { backgroundColor: "#10B981" },
  trackerDotActive: { backgroundColor: "#2E3192" },
  trackerDotNum: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  trackerContent: { flex: 1, marginTop: -2 },
  trackerTitle: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#0A154F",
  },
  trackerDesc: { fontSize: 11, color: "#64748B", lineHeight: 15, marginTop: 1 },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  loadingBannerText: {
    fontSize: 12,
    color: "#1E40AF",
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  failureCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  failureCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  failureCardTitle: {
    fontSize: 13.5,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#991B1B",
  },
  failureCardMsg: {
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 17,
    marginBottom: 10,
  },
  failureActionsRow: { flexDirection: "row", gap: 8 },
  retryBtn: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  resetBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetBtnText: {
    color: "#B91C1C",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noticeCardText: {
    color: "#92400E",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});

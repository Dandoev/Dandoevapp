// ============================================================
// DandoEv Mobile — Centralized Demo Data Store & Mock Services
// ============================================================

export type ProductType = 'bike' | 'battery' | 'charger';
export type DeductionFrequency = 'weekly' | 'daily' | 'monthly';

export interface DemoProduct {
  id: string;
  type: ProductType;
  name: string;
  brand: string;
  model: string;
  category: string; // 'Commuter', 'Sports', 'Battery', 'Charger'
  price: number;
  weeklyRate: number;
  dailyRate: number;
  image: string;
  images: string[];
  motorPower?: number; // Watts
  batteryCapacity?: number; // Ah
  voltage?: number; // Volts
  rangeKm?: number;
  topSpeed?: number; // km/h
  weight?: number; // kg
  warranty: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  features: string[];
  description: string;
}

export interface DemoRepayment {
  id: string;
  installmentNumber: number;
  periodLabel: string; // 'Week 5 of 48', 'Month 2 of 12'
  amount: number;
  dueDate: string;
  status: 'paid' | 'upcoming' | 'overdue';
  paidDate?: string;
  paymentMethod?: string;
}

export interface DemoLoan {
  id: string;
  bikeName: string;
  bikeModel: string;
  bikeImage: string;
  totalAmount: number;
  loanAmount: number;
  downPayment: number;
  weeklyRepayment: number;
  monthlyRepayment: number;
  tenureMonths: number;
  installmentsPaid: number;
  totalInstallments: number;
  nextDueDate: string;
  nextDueAmount: number;
  daysRemaining: number;
  status: 'active' | 'completed' | 'under_review';
  deductionFrequency: DeductionFrequency;
  repayments: DemoRepayment[];
  bikeSerialNumber?: string;
  chassisNumber?: string;
  batteryNumber1?: string;
  batteryNumber2?: string;
  chargerNumber?: string;
  approvedAt?: string;
}

export interface DemoUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  employmentStatus: string;
  employer: string;
  monthlyIncome: number;
  kycTier: number;
  kycStatus: 'verified' | 'pending';
  bvnVerified: boolean;
  ninVerified: boolean;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorStatus?: 'accepted' | 'invited';
}

export interface DemoVirtualCard {
  cardNumber: string; // '5399 4182 9021 4829'
  cardholderName: string; // 'SOLOMON DUNU'
  expiry: string; // '08/29'
  cvv: string; // '492'
  network: 'mastercard' | 'verve';
  bankName: 'Providus Bank / DandoPay';
  virtualNuban: string; // '9928172635'
  isFrozen: boolean;
}

export interface LinkedCardMethod {
  type: 'card';
  bankName: string; // 'Guaranty Trust Bank'
  cardholderName: string; // 'SOLOMON DUNU'
  cardNumberMasked: string; // '5399 •••• •••• 4829'
  expiry: string; // '08/28'
  network: 'Mastercard' | 'Visa' | 'Verve';
  autopayStatus: 'active';
  lastDebited: string;
}

export interface LinkedBankMethod {
  type: 'bank';
  bankName: string; // 'Access Bank Plc'
  accountNumberMasked: string; // '0124 •••• 2104'
  accountNumberFull: string; // '0124892104'
  accountName: string; // 'SOLOMON DUNU'
  mandateReference: string; // 'NIBSS-AUTODBT-99214'
  mandateType: 'NIBSS Direct Debit e-Mandate';
  autopayStatus: 'active';
  lastDebited: string;
}

export type LinkedPaymentMethod = LinkedCardMethod | LinkedBankMethod;

export type DeliveryType = 'pickup' | 'delivery_lagos' | 'delivery_outside';

export interface PriceBreakdown {
  basePrice: number;
  deliveryType: DeliveryType;
  deliveryFee: number; // 0 for pickup, 20000 within Lagos, 50000 outside Lagos
  insuranceFee: number; // 0 for outright buyers, 25000 for BNPL
  serviceFee: number; // 0 for outright buyers, 20000 for BNPL
  // Backward compatibility aliases
  insurance: number;
  registration: number;
  gpsTelematics: number;
  delivery: number;
  totalOutright: number;
  isBnplEligible: boolean;
  totalFinanced?: number;
  tenureMonths?: number;
  monthlyInterest?: number;
  totalInterest?: number;
  totalRepayable?: number;
  weeklyDeduction?: number;
  compulsorySavingsSweepWeekly?: number;
}

export function getProductPriceBreakdown(
  product: DemoProduct,
  tenureMonths: number = 12,
  deliveryType: DeliveryType = 'pickup'
): PriceBreakdown {
  const isBike = product.type === 'bike';
  const basePrice = product.price;
  const deliveryFee = deliveryType === 'pickup' ? 0 : deliveryType === 'delivery_lagos' ? 20000 : 50000;

  // 10% COMPREHENSIVE INSURANCE ACROSS ALL PRODUCTS
  // Buy Outright Total = Base Price + 10% Insurance + Delivery Fee
  const insuranceFee = Math.round(basePrice * 0.10);
  const totalOutright = basePrice + insuranceFee + deliveryFee;

  if (!isBike) {
    return {
      basePrice,
      deliveryType,
      deliveryFee,
      insuranceFee,
      serviceFee: 0,
      insurance: insuranceFee,
      registration: 0,
      gpsTelematics: 0,
      delivery: deliveryFee,
      totalOutright,
      isBnplEligible: false,
    };
  }

  // BNPL FINANCING (E-Bikes):
  // Comprehensive Insurance: 10% of base asset price
  // Service fee: ₦20,000
  // Total Financed = Base Price + Insurance (10%) + Service Fee (₦20k) + Delivery Fee (₦0/20k/50k)
  const serviceFee = 20000;
  const totalFinanced = basePrice + insuranceFee + serviceFee + deliveryFee;
  const monthlyRate = 0.04;
  const totalInterest = Math.round(totalFinanced * monthlyRate * tenureMonths);
  const totalRepayable = totalFinanced + totalInterest;
  const weeks = Math.round(tenureMonths * 4.33);
  const weeklyDeduction = Math.round(totalRepayable / weeks);
  const compulsorySavingsSweepWeekly = 7000;

  return {
    basePrice,
    deliveryType,
    deliveryFee,
    insuranceFee,
    serviceFee,
    insurance: insuranceFee,
    registration: 0,
    gpsTelematics: 0,
    delivery: deliveryFee,
    totalOutright,
    isBnplEligible: true,
    totalFinanced,
    tenureMonths,
    monthlyInterest: Math.round(totalFinanced * monthlyRate),
    totalInterest,
    totalRepayable,
    weeklyDeduction,
    compulsorySavingsSweepWeekly,
  };
}

export interface DemoWallet {
  mainBalance: number;
  lockedSaving: number;
  lockedUntil: string;
  weeklySavingAmount: number;
  dailySavingAmount: number;
  dailySavingsEnabled: boolean;
  collectedWeeks: number;
  totalWeeks: number;
  missedWeeks: number;
  virtualCard: DemoVirtualCard;
}

export interface DemoNotification {
  id: string;
  type: 'payment' | 'message' | 'update';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  amount?: number;
}

// ---- Master Products Catalog (Bikes, Batteries, Chargers) ----
export const ALL_PRODUCTS: DemoProduct[] = [
  // E-Bikes
  {
    id: 'bike-g90',
    type: 'bike',
    name: 'DandoEv G90 Flagship Commuter',
    brand: 'DandoEv',
    model: 'G90',
    category: 'Commuter',
    price: 1700000,
    weeklyRate: 41000,
    dailyRate: 0,
    image: 'bike-g90',
    images: ['bike-g90'],
    motorPower: 750,
    batteryCapacity: 20,
    voltage: 48,
    rangeKm: 85,
    topSpeed: 45,
    weight: 41,
    warranty: '1 Year Full Warranty',
    rating: 4.9,
    reviewCount: 94,
    inStock: true,
    description: 'Our flagship commercial e-bike in Nigeria. Engineered with a rugged metal frame, 20x4 pneumatic tubeless puncture-resistant fat tyres, single 48V 20Ah swappable battery, and high-efficiency 750W motor.',
    features: [
      'Digital dashboard / NFC card',
      'Anti-theft motion alerts',
      'Google Maps navigation',
      'Pneumatic tubeless puncture-resistant tyres (20*4)',
      'Electronic Hydraulic Disc Brakes',
      '7-Speed Shimano Gear System',
      'Single 48V 20Ah Lithium-Ion Battery',
      'Full Throttle 85km / PAS 115km',
      'Max Load 240kg (Delivery Rack Ready)',
      'USB phone charger on the dashboard with phone holder',
    ],
  },
  {
    id: 'bike-x5',
    type: 'bike',
    name: 'DandoEv X5 Sports Fat-Tire',
    brand: 'DandoEv',
    model: 'X5',
    category: 'Sports',
    price: 1550000,
    weeklyRate: 37450,
    dailyRate: 0,
    image: 'bike-x5',
    images: ['bike-x5'],
    motorPower: 750,
    batteryCapacity: 20,
    voltage: 48,
    rangeKm: 80,
    topSpeed: 40,
    weight: 40,
    warranty: '1 Year Full Warranty',
    rating: 4.8,
    reviewCount: 48,
    inStock: true,
    description: 'Built for sports enthusiasts and high-torque delivery riders. Features 750W motor, single 48V 20Ah battery, 26x4 inch pneumatic tubeless puncture-resistant fat tyres, digital dashboard with NFC card, anti-theft motion alerts, and Google Maps.',
    features: [
      'Digital dashboard / NFC card',
      'Anti-theft motion alerts',
      'Google Maps navigation',
      'Pneumatic tubeless puncture-resistant tyres (26*4)',
      'Hydraulic Front & Rear Brakes',
      '7-Speed Shimano Gear System',
      'Single 48V 20Ah Battery Pack',
      'USB phone charger on the dashboard with phone holder',
    ],
  },
  {
    id: 'bike-x6',
    type: 'bike',
    name: 'DandoEv X6 All-Terrain',
    brand: 'DandoEv',
    model: 'X6',
    category: 'Sports',
    price: 1500000,
    weeklyRate: 36250,
    dailyRate: 0,
    image: 'bike-x6',
    images: ['bike-x6'],
    motorPower: 500,
    batteryCapacity: 20,
    voltage: 48,
    rangeKm: 80,
    topSpeed: 40,
    weight: 42,
    warranty: '1 Year Full Warranty',
    rating: 4.7,
    reviewCount: 52,
    inStock: true,
    description: 'Powerhouse 29-inch wheel commuter and commercial cargo bike with 500W motor, single 48V 20Ah battery, 29-inch pneumatic tubeless puncture-resistant tyres, digital dashboard with NFC card, anti-theft motion alerts, and Google Maps.',
    features: [
      'Digital dashboard / NFC card',
      'Anti-theft motion alerts',
      'Google Maps navigation',
      'Pneumatic tubeless puncture-resistant tyres (29 inch)',
      'Hydraulic Disc Brakes',
      'Front Suspension Fork',
      'Single 48V 20Ah Battery Pack',
      'USB phone charger on the dashboard with phone holder',
    ],
  },
  {
    id: 'bike-x4',
    type: 'bike',
    name: 'DandoEv X4 Utility',
    brand: 'DandoEv',
    model: 'X4',
    category: 'Commuter',
    price: 1300000,
    weeklyRate: 31400,
    dailyRate: 0,
    image: 'bike-x4',
    images: ['bike-x4'],
    motorPower: 500,
    batteryCapacity: 15,
    voltage: 48,
    rangeKm: 70,
    topSpeed: 38,
    weight: 38,
    warranty: '1 Year Full Warranty',
    rating: 4.7,
    reviewCount: 31,
    inStock: true,
    description: 'Rugged 29-inch utility e-bike with 500W motor, single 48V 15Ah battery, 29-inch tyres and disc brakes. Optional extra 48V 15Ah battery available for ₦350,000.',
    features: [
      'Basic LCD dashboard',
      'Single 48V 15Ah battery',
      'Optional extra battery (+₦350,000)',
      '29-inch tyres',
      'Front & rear disc brakes',
      'No NFC, phone charger, USB, GPS or anti-theft alerts',
    ],
  },
  {
    id: 'bike-x5-lite',
    type: 'bike',
    name: 'DandoEv X5 Lite Fat-Tire',
    brand: 'DandoEv',
    model: 'X5 Lite',
    category: 'Sports',
    price: 1350000,
    weeklyRate: 32600,
    dailyRate: 0,
    image: 'bike-x5-lite',
    images: ['bike-x5-lite'],
    motorPower: 500,
    batteryCapacity: 15,
    voltage: 48,
    rangeKm: 70,
    topSpeed: 38,
    weight: 36,
    warranty: '1 Year Full Warranty',
    rating: 4.8,
    reviewCount: 39,
    inStock: true,
    description: 'Lightweight fat-tire e-bike with 500W motor, single 48V 15Ah battery, 26x4 inch fat tyres and disc brakes. Optional extra 48V 15Ah battery available for ₦350,000.',
    features: [
      'Basic LCD dashboard',
      'Single 48V 15Ah battery',
      'Optional extra battery (+₦350,000)',
      '26*4 fat tyres',
      'Front & rear disc brakes',
      'No NFC, phone charger, USB, GPS or anti-theft alerts',
    ],
  },
  {
    id: 'bike-x2',
    type: 'bike',
    name: 'DandoEv X2 Urban Commuter',
    brand: 'DandoEv',
    model: 'X2',
    category: 'Commuter',
    price: 850000,
    weeklyRate: 20550,
    dailyRate: 0,
    image: 'bike-x2',
    images: ['bike-x2'],
    motorPower: 350,
    batteryCapacity: 15,
    voltage: 36,
    rangeKm: 60,
    topSpeed: 32,
    weight: 30,
    warranty: '1 Year Full Warranty',
    rating: 4.6,
    reviewCount: 22,
    inStock: true,
    description: 'Accessible urban commuter e-bike with 350W motor, single 36V 15Ah battery, 26-inch tyres and disc brakes. Optional extra 36V 15Ah battery available for ₦250,000.',
    features: [
      'Basic LCD dashboard',
      'Single 36V 15Ah battery',
      'Optional extra battery (+₦250,000)',
      '26-inch tyres',
      'Disc brakes',
      'No NFC, phone charger, USB, GPS or anti-theft alerts',
    ],
  },

  // Batteries
  {
    id: 'battery-48v-20ah',
    type: 'battery',
    name: '48V 20Ah Replacement Battery Pack (G90, X5, X6)',
    brand: 'DandoEv Energy',
    model: 'BAT-4820',
    category: 'Battery',
    price: 385000,
    weeklyRate: 3500,
    dailyRate: 0,
    image: 'battery-48v-20ah',
    images: ['battery-48v-20ah'],
    batteryCapacity: 20,
    voltage: 48,
    warranty: '2 Years Manufacturer Warranty',
    rating: 4.9,
    reviewCount: 114,
    inStock: true,
    description: 'High-density Tier-1 Grade-A Lithium-ion cells. Up to 85km range with built-in Smart BMS protecting against overcharge, voltage surges, and Lagos heat.',
    features: [
      'Smart Thermal & Short-Circuit BMS Protection',
      'Integrated LED Charge Level Gauge',
      'Ergonomic Carry Handle for Fast Swaps',
      'Over 1,200 Full Charge Cycles',
      'Weather-Sealed Waterproof Casing (IP67)',
    ],
  },
  {
    id: 'battery-48v-15ah',
    type: 'battery',
    name: '48V 15Ah Extra Battery Pack (X4 & X5 Lite)',
    brand: 'DandoEv Energy',
    model: 'BAT-4815',
    category: 'Battery',
    price: 350000,
    weeklyRate: 3200,
    dailyRate: 0,
    image: 'battery-48v-15ah',
    images: ['battery-48v-15ah'],
    batteryCapacity: 15,
    voltage: 48,
    warranty: '18 Months Warranty',
    rating: 4.8,
    reviewCount: 88,
    inStock: true,
    description: 'The standard extra battery pack compatible with DandoEv X4 and X5 Lite models. Provides dependable 70km commuting backup.',
    features: [
      'Grade-A 18650 Lithium-ion Cells',
      'Built-in Anti-Theft Key Lock',
      'Fast 4-Hour Charge Cycle',
      'Shock-Absorbing Internal Rails',
    ],
  },
  {
    id: 'battery-36v-15ah',
    type: 'battery',
    name: '36V 15Ah Extra Battery Pack (X2)',
    brand: 'DandoEv Energy',
    model: 'BAT-3615',
    category: 'Battery',
    price: 250000,
    weeklyRate: 2300,
    dailyRate: 0,
    image: 'battery-36v-15ah',
    images: ['battery-36v-15ah'],
    batteryCapacity: 15,
    voltage: 36,
    warranty: '1 Year Warranty',
    rating: 4.7,
    reviewCount: 36,
    inStock: true,
    description: 'Compact extra battery pack compatible with DandoEv X2 urban commuter.',
    features: [
      'Under 3.5kg Ultra-Light Construction',
      'Keyed Safety Release Mechanism',
      'LED State-of-Charge Bar',
    ],
  },
  {
    id: 'battery-36v-10ah',
    type: 'battery',
    name: '36V 10Ah Compact Urban Pack',
    brand: 'DandoEv Energy',
    model: 'BAT-3610',
    category: 'Battery',
    price: 180000,
    weeklyRate: 1700,
    dailyRate: 300,
    image: 'battery-36v-10ah',
    images: ['battery-36v-10ah'],
    batteryCapacity: 10,
    voltage: 36,
    warranty: '1 Year Warranty',
    rating: 4.6,
    reviewCount: 19,
    inStock: true,
    description: 'Affordable compact battery replacement for 36V urban bikes.',
    features: [
      'Economical Daily Replacements',
      'Quick 2.5-Hour Charge',
    ],
  },

  // Chargers
  {
    id: 'charger-fast-54v',
    type: 'charger',
    name: 'Li-Ion Fast Charger 54.6V - 2A (SJF-T25)',
    brand: 'DandoEv Energy',
    model: 'SJF-T25',
    category: 'Charger',
    price: 60000,
    weeklyRate: 700,
    dailyRate: 150,
    image: 'charger-fast-54v',
    images: ['charger-fast-54v'],
    voltage: 54.6,
    warranty: '1 Year Warranty',
    rating: 4.9,
    reviewCount: 152,
    inStock: true,
    description: 'Industrial-grade fast charger specifically calibrated for 48V Lithium-ion e-bike batteries. Input: 100-240V 50/60Hz AC | Output: 54.6V - 2A DC. Features smart active cooling fan and auto-shutoff when full.',
    features: [
      'Active Silent Cooling Fan',
      'Smart Auto-Cutoff Prevents Overcharging',
      'Dual-Color LED Status (Red = Charging, Green = Full)',
      'Surge-Protected Nigerian Plug Adapter',
    ],
  },
  {
    id: 'charger-standard-42v',
    type: 'charger',
    name: 'Standard 42V - 2A Smart Charger',
    brand: 'DandoEv Energy',
    model: 'CHG-4220',
    category: 'Charger',
    price: 45000,
    weeklyRate: 500,
    dailyRate: 100,
    image: 'charger-standard-42v',
    images: ['charger-standard-42v'],
    voltage: 42,
    warranty: '1 Year Warranty',
    rating: 4.7,
    reviewCount: 64,
    inStock: true,
    description: 'Compact travel charger for 36V battery packs with built-in surge suppressor.',
    features: [
      'Compact Travel Form Factor',
      'Short-Circuit Surge Protection',
      'Fire-Retardant ABS Enclosure',
    ],
  },
];

// ---- Initial Demo State ----
export const INITIAL_DEMO_USER: DemoUserProfile = {
  id: 'demo-buyer-001',
  firstName: 'Solomon',
  lastName: 'Dunu',
  email: 'solomon.dunu@demo.com',
  phone: '+234 809 900 1122',
  address: '24 Sandstrip, Oworoshoki',
  city: 'Lagos',
  state: 'Lagos',
  employmentStatus: 'Commercial Rider / Logistics',
  employer: 'Bolt / Self-Employed',
  monthlyIncome: 350000,
  kycTier: 2,
  kycStatus: 'verified',
  bvnVerified: true,
  ninVerified: true,
  guarantorName: 'Chief Babatunde Johnson',
  guarantorPhone: '+234 802 334 5566',
  guarantorStatus: 'accepted',
};

export const INITIAL_DEMO_WALLET: DemoWallet = {
  mainBalance: 0,
  lockedSaving: 0,
  lockedUntil: '2026-12-15',
  weeklySavingAmount: 2500,
  dailySavingAmount: 1000,
  dailySavingsEnabled: true,
  collectedWeeks: 0,
  totalWeeks: 48,
  missedWeeks: 0,
  virtualCard: {
    cardNumber: '5399 4182 9021 4829',
    cardholderName: 'SOLOMON DUNU',
    expiry: '08/29',
    cvv: '492',
    network: 'mastercard',
    bankName: 'Providus Bank / DandoPay',
    virtualNuban: '9928172635',
    isFrozen: false,
  },
};

// Generate 48 Weekly Repayments for 12-Month Loan (Default Weekly Deductions)
function generateWeeklyRepayments(): DemoRepayment[] {
  const repayments: DemoRepayment[] = [];
  const weeklyAmount = 10500;
  
  for (let i = 1; i <= 48; i++) {
    const isPaid = i <= 4;
    repayments.push({
      id: `rep-wk-${i}`,
      installmentNumber: i,
      periodLabel: `Week ${i} of 48`,
      amount: weeklyAmount,
      dueDate: `2026-09-${(20 + i * 7) % 28 + 1}`,
      status: isPaid ? 'paid' : 'upcoming',
      paidDate: isPaid ? `2026-09-0${i}` : undefined,
      paymentMethod: isPaid ? 'Auto-Debit (Paystack)' : undefined,
    });
  }
  return repayments;
}

export const INITIAL_DEMO_LOAN: DemoLoan = {
  id: 'loan-dando-902',
  bikeName: 'DandoEv G90 Flagship Commuter',
  bikeModel: 'G90',
  bikeImage: 'bike-g90',
  totalAmount: 1700000,
  loanAmount: 1500000,
  downPayment: 200000,
  weeklyRepayment: 10500,
  monthlyRepayment: 45200,
  tenureMonths: 12,
  installmentsPaid: 4,
  totalInstallments: 48,
  nextDueDate: '2026-09-24',
  nextDueAmount: 10500,
  daysRemaining: 3,
  status: 'active',
  deductionFrequency: 'weekly', // WEEKLY BY DEFAULT AS REQUESTED
  repayments: generateWeeklyRepayments(),
};

export const INITIAL_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'notif-1',
    type: 'payment',
    title: 'Weekly Installment Reminder',
    message: 'Your upcoming weekly BNPL installment of ₦10,500 for DandoEv G90 is due on 2026-09-24 (in 3 days). Auto-debit will trigger from your Providus NUBAN.',
    timestamp: '10 mins ago',
    isRead: false,
    amount: 10500,
  },
  {
    id: 'notif-2',
    type: 'message',
    title: 'Battery Courier Assigned',
    message: 'Courier GIG Logistics has picked up your 48V 25Ah backup battery order. Tracking: #DND-9821. Estimated delivery: Tomorrow, 2:00 PM.',
    timestamp: '2 hours ago',
    isRead: false,
  },
  {
    id: 'notif-3',
    type: 'update',
    title: 'KYC Tier 2 Verification Verified',
    message: 'Your BVN and NIN have been verified with NIBSS. You qualify for 0% down payment on all E-Bikes up to ₦2,000,000.',
    timestamp: '1 day ago',
    isRead: false,
  },
  {
    id: 'notif-4',
    type: 'payment',
    title: 'Wallet Funded Successfully',
    message: '₦20,000 was credited to your Providus Virtual ATM Card via Paystack card payment.',
    timestamp: '2 days ago',
    isRead: true,
    amount: 20000,
  },
  {
    id: 'notif-5',
    type: 'update',
    title: 'Save-As-You-Ride Weekly Reward',
    message: '₦2,500 has been added to your Compulsory Locked Vault. Current vault balance: ₦24,000.',
    timestamp: '3 days ago',
    isRead: true,
    amount: 2500,
  },
];

// Simple In-Memory Observable Store for Demo Session
class DemoStore {
  private user: DemoUserProfile = { ...INITIAL_DEMO_USER };
  private wallet: DemoWallet = { ...INITIAL_DEMO_WALLET };
  private loan: DemoLoan = { ...INITIAL_DEMO_LOAN };
  private products: DemoProduct[] = [...ALL_PRODUCTS];
  private notifications: DemoNotification[] = [...INITIAL_NOTIFICATIONS];
  private selectedProduct: DemoProduct = ALL_PRODUCTS[0];
  private listeners: (() => void)[] = [];

  // Real user linked autopayment methods
  private hasAttachedCard: boolean = true;
  private attachedCard: LinkedCardMethod = {
    type: 'card',
    bankName: 'Guaranty Trust Bank',
    cardholderName: 'SOLOMON DUNU',
    cardNumberMasked: '5399 •••• •••• 4829',
    expiry: '08/28',
    network: 'Mastercard',
    autopayStatus: 'active',
    lastDebited: '₦10,500 on Sep 15, 2026',
  };
  private attachedBank: LinkedBankMethod = {
    type: 'bank',
    bankName: 'Access Bank Plc',
    accountNumberMasked: '0124 •••• 2104',
    accountNumberFull: '0124892104',
    accountName: 'SOLOMON DUNU',
    mandateReference: 'NIBSS-AUTODBT-99214',
    mandateType: 'NIBSS Direct Debit e-Mandate',
    autopayStatus: 'active',
    lastDebited: '₦10,500 on Sep 15, 2026',
  };

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getHasAttachedCard(): boolean {
    return this.hasAttachedCard;
  }

  setHasAttachedCard(val: boolean) {
    this.hasAttachedCard = val;
    this.notify();
  }

  togglePaymentMethod() {
    this.hasAttachedCard = !this.hasAttachedCard;
    this.notify();
  }

  getAttachedCard(): LinkedCardMethod {
    return this.attachedCard;
  }

  getAttachedBank(): LinkedBankMethod {
    return this.attachedBank;
  }

  getPaymentMethod(): LinkedPaymentMethod {
    return this.hasAttachedCard ? this.attachedCard : this.attachedBank;
  }

  getFinancialReport() {
    return {
      statementDate: 'September 21, 2026',
      periodCovered: 'Jan 1, 2026 – Sep 21, 2026',
      accountHolder: `${this.user.firstName} ${this.user.lastName}`,
      bvnMasked: '2234 •••• 891',
      contractId: 'DND-BNPL-9921',
      totalFinanced: this.loan.totalAmount,
      totalRepaid: 84000,
      outstandingBalance: this.loan.totalAmount - 84000,
      savingsVaultBalance: this.wallet.lockedSaving,
      activePaymentMethod: this.hasAttachedCard
        ? `${this.attachedCard.bankName} (${this.attachedCard.cardNumberMasked})`
        : `${this.attachedBank.bankName} (Mandate #${this.attachedBank.mandateReference})`,
      transactions: [
        { date: 'Sep 15, 2026', ref: 'TX-98214', desc: 'Weekly BNPL Auto-Debit', amount: -10500, type: 'debit', status: 'Success' },
        { date: 'Sep 15, 2026', ref: 'TX-98215', desc: 'Save-As-You-Ride Vault Sweep', amount: -7000, type: 'vault', status: 'Locked' },
        { date: 'Sep 08, 2026', ref: 'TX-97412', desc: 'Weekly BNPL Auto-Debit', amount: -10500, type: 'debit', status: 'Success' },
        { date: 'Sep 08, 2026', ref: 'TX-97413', desc: 'Save-As-You-Ride Vault Sweep', amount: -7000, type: 'vault', status: 'Locked' },
        { date: 'Sep 01, 2026', ref: 'TX-96110', desc: 'Weekly BNPL Auto-Debit', amount: -10500, type: 'debit', status: 'Success' },
        { date: 'Aug 25, 2026', ref: 'TX-95004', desc: 'Wallet Deposit via Paystack', amount: 50000, type: 'credit', status: 'Success' },
      ],
    };
  }

  getUser() {
    return this.user;
  }

  getWallet() {
    return this.wallet;
  }

  getLoan() {
    return this.loan;
  }

  getProducts() {
    return this.products.filter((p) => p.type === 'bike');
  }

  getBikes() {
    return this.products.filter((p) => p.type === 'bike');
  }

  getBatteries() {
    return [];
  }

  getChargers() {
    return [];
  }

  getProductById(id: string): DemoProduct | undefined {
    return this.products.find((p) => p.id === id);
  }

  getSelectedProduct(): DemoProduct {
    return this.selectedProduct;
  }

  setSelectedProduct(prod: DemoProduct) {
    this.selectedProduct = prod;
    this.notify();
  }

  getNotifications() {
    return this.notifications;
  }

  getUnreadNotificationCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  markAllNotificationsAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    this.notify();
  }

  addNotification(notif: Omit<DemoNotification, 'id' | 'timestamp' | 'isRead'>) {
    const newNotif: DemoNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      isRead: false,
    };
    this.notifications = [newNotif, ...this.notifications];
    this.notify();
  }

  setUser(partial: Partial<DemoUserProfile>) {
    this.user = { ...this.user, ...partial };
    this.notify();
  }

  // Set Repayment Deduction Frequency (Weekly [Default], Daily, Monthly)
  setDeductionFrequency(freq: DeductionFrequency) {
    let nextDueAmount = 10500;
    let daysRemaining = 3;
    let totalInstallments = 48;
    let installmentsPaid = 4;

    if (freq === 'daily') {
      nextDueAmount = 1500;
      daysRemaining = 1;
      totalInstallments = 336;
      installmentsPaid = 28;
    } else if (freq === 'monthly') {
      nextDueAmount = 45200;
      daysRemaining = 6;
      totalInstallments = 12;
      installmentsPaid = 1;
    }

    this.loan = {
      ...this.loan,
      deductionFrequency: freq,
      nextDueAmount,
      daysRemaining,
      totalInstallments,
      installmentsPaid,
    };

    this.addNotification({
      type: 'update',
      title: `Repayment Schedule Set to ${freq.toUpperCase()}`,
      message: `Admin / User setting updated. Your installments are now debited on a ${freq} basis (₦${nextDueAmount.toLocaleString()} per deduction).`,
    });

    this.notify();
  }

  // Pay Next Installment
  payNextInstallment(): { success: boolean; message: string } {
    const upcomingIdx = this.loan.repayments.findIndex((r) => r.status === 'upcoming');
    if (upcomingIdx === -1) {
      return { success: false, message: 'All installments have already been fully paid!' };
    }

    const nextRepayment = this.loan.repayments[upcomingIdx];
    const amount = nextRepayment.amount;

    // Check if wallet has sufficient balance, otherwise simulate funding + debit
    if (this.wallet.mainBalance < amount) {
      this.wallet.mainBalance += amount; // Auto-fund for demo
    }

    this.wallet.mainBalance -= amount;
    // Compulsory micro-savings reward: ₦1,000 added to vault
    this.wallet.lockedSaving += 1000;
    this.wallet.collectedWeeks = Math.min(48, this.wallet.collectedWeeks + 1);

    // Update repayment record
    const updatedRepayments = [...this.loan.repayments];
    updatedRepayments[upcomingIdx] = {
      ...nextRepayment,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Instant ATM Card Debit',
    };

    const nextUpcoming = updatedRepayments.find((r) => r.status === 'upcoming');

    this.loan = {
      ...this.loan,
      installmentsPaid: this.loan.installmentsPaid + 1,
      nextDueDate: nextUpcoming ? nextUpcoming.dueDate : 'Loan Completed!',
      nextDueAmount: nextUpcoming ? nextUpcoming.amount : 0,
      daysRemaining: nextUpcoming ? 7 : 0,
      status: nextUpcoming ? 'active' : 'completed',
      repayments: updatedRepayments,
    };

    this.addNotification({
      type: 'payment',
      title: `Installment #${nextRepayment.installmentNumber} Paid`,
      message: `₦${amount.toLocaleString()} was successfully debited from your Providus ATM Card. ₦1,000 added to your compulsory vault.`,
      amount,
    });

    this.notify();
    return { success: true, message: `Successfully paid Installment #${nextRepayment.installmentNumber} (₦${amount.toLocaleString()})!` };
  }

  // Fund Wallet with simulated receipt & notification
  fundWallet(amount: number = 20000, method: string = 'Bank Transfer') {
    this.wallet.mainBalance += amount;
    this.addNotification({
      type: 'payment',
      title: 'Wallet Funded Successfully',
      message: `₦${amount.toLocaleString()} has been added to your Providus ATM Card via ${method}. New Balance: ₦${this.wallet.mainBalance.toLocaleString()}.`,
      amount,
    });
    this.notify();
  }

  // Complete Tier 3 KYC
  submitTier3Kyc(data: { guarantorName: string; guarantorPhone: string; relationship: string }) {
    this.user = {
      ...this.user,
      kycTier: 3,
      kycStatus: 'verified',
      guarantorName: data.guarantorName,
      guarantorPhone: data.guarantorPhone,
      guarantorStatus: 'accepted',
    };

    this.addNotification({
      type: 'update',
      title: 'Tier 3 KYC & Guarantor Approved! 🚀',
      message: `Guarantor ${data.guarantorName} accepted. Your BNPL Credit Limit is upgraded to ₦2,500,000 with 0% down payment!`,
    });

    this.notify();
  }

  // Reset to initial demo values
  resetDemo() {
    this.user = { ...INITIAL_DEMO_USER };
    this.wallet = { ...INITIAL_DEMO_WALLET };
    this.loan = { ...INITIAL_DEMO_LOAN };
    this.products = [...ALL_PRODUCTS];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.notify();
  }
}

export const demoStore = new DemoStore();

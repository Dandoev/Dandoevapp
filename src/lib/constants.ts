// ============================================================
// E-Bike BNPL Platform - App Constants
// ============================================================
import { CreditCard, Building, Wallet, IdCard, BookOpen, Car } from 'lucide-react';

export const APP_NAME = 'DandoEv';
export const APP_TAGLINE = 'The future is here';
export const APP_DESCRIPTION = 'Nigeria\'s premier electric bike marketplace with flexible Buy Now, Pay Later options.';

export const CURRENCY = 'NGN';
export const CURRENCY_SYMBOL = '₦';

// BNPL Configuration
export const BNPL_CONFIG = {
    minDownPaymentPercent: 0,
    maxDownPaymentPercent: 0,
    defaultDownPaymentPercent: 0,
    interestRate: 4, // Monthly percentage
    processingFee: 20000, // Fixed NGN
    healthInsuranceFee: 60000, // Fixed NGN
    dailySavings: 1000, // NGN per day
    tenureOptions: [6, 12, 18], // months
    defaultTenure: 12,
    repaymentFrequencyDays: 2, // Every 2 days
    lateFeePercent: 2,
    gracePeriodDays: 3,
    maxLoanAmount: 5000000, // NGN
    minLoanAmount: 100000,  // NGN
    minMonthlyIncome: 50000,
};

// Payment Methods
export const PAYMENT_METHODS = [
    { id: 'bank_transfer', name: 'Mono DirectPay (Pay with Bank)', icon: Building, description: 'Instant account-to-account bank transfer via Mono' },
    { id: 'card', name: 'Debit/Credit Card', icon: CreditCard, description: 'Mastercard, Visa & Verve via secure Mono DirectPay' },
    { id: 'wallet', name: 'DandoEv Wallet', icon: Wallet, description: 'Pay from your available wallet balance' },
] as const;

// KYC Document Types
export const KYC_DOCUMENT_TYPES = [
    { id: 'national_id', name: 'National Identity Number - NIN', icon: IdCard },
    { id: 'passport', name: 'International Passport', icon: BookOpen },
    { id: 'drivers_license', name: 'Driver\'s License', icon: Car },
] as const;

// Nigerian States
export const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
    'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
    'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
    'Yobe', 'Zamfara',
];

// Employment Status Options
export const EMPLOYMENT_OPTIONS = [
    'Employed (Full-time)',
    'Employed (Part-time)',
    'Self-employed',
    'Business Owner',
    'Freelancer',
    'Civil Servant',
    'Unemployed',
    'Student',
    'Retired',
];

// Nigerian Banks
export const NIGERIAN_BANKS = [
    'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
    'First Bank of Nigeria', 'First City Monument Bank', 'Globus Bank',
    'Guaranty Trust Bank', 'Heritage Bank', 'Jaiz Bank', 'Keystone Bank',
    'Kuda Bank', 'Opay', 'Palmpay', 'Polaris Bank', 'Providus Bank',
    'Stanbic IBTC Bank', 'Standard Chartered', 'Sterling Bank', 'SunTrust Bank',
    'Titan Trust Bank', 'Union Bank of Nigeria', 'United Bank for Africa',
    'Unity Bank', 'Wema Bank', 'Zenith Bank',
];

// Bike Categories
export const BIKE_CATEGORIES = [
    'Commuter',
    'Sports',
    'Cargo',
    'Off-Road',
    'Folding',
    'Delivery',
];

// Admin Roles
export const ADMIN_ROLES = [
    { id: 'super_admin', name: 'Super Admin', description: 'Full system access' },
    { id: 'finance_admin', name: 'Finance Admin', description: 'Payment & loan management' },
    { id: 'compliance_officer', name: 'Compliance Officer', description: 'KYC & compliance review' },
    { id: 'operations_admin', name: 'Operations Admin', description: 'Bike & order management' },
] as const;

// Relationship Types (for guarantor)
export const RELATIONSHIP_TYPES = [
    'Parent', 'Sibling', 'Spouse', 'Friend', 'Colleague',
    'Employer', 'Business Partner', 'Other',
];

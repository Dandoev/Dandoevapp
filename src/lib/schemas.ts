// ============================================================
// Zod Schemas — All API Input Validation Schemas (Zod v4)
// ============================================================
import { z } from 'zod';

// ---- Auth ----

export const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100).trim(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email address').max(255).trim().toLowerCase(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const signinSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ---- Orders ----

export const createOrderSchema = z.object({
  bikeId: z.string().uuid('Invalid bike ID').optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  paymentMethod: z.enum(['card', 'bank_transfer', 'wallet', 'bnpl']),
  deliveryType: z.enum(['pickup', 'delivery_lagos', 'delivery_outside']).default('pickup'),
  deliveryAddress: z.string().max(500).trim().optional(),
  deliveryCity: z.string().max(100).trim().optional(),
  deliveryState: z.string().max(50).trim().optional(),
  deliveryPhone: z.string().min(10).max(15).trim().optional(),
  loanId: z.string().uuid().optional(),
  notes: z.string().max(1000).trim().optional(),
  accessories: z.array(z.object({
    id: z.string().uuid('Invalid accessory ID'),
    quantity: z.number().int().min(1).max(10).default(1),
  })).optional(),
});

// ---- Loans / BNPL Application ----

export const createLoanSchema = z.object({
  bikeId: z.string().min(1, 'Bike ID is required'),
  bikeName: z.string().min(1).max(200).trim().optional(),
  bikePrice: z.number().positive().optional(),
  downPayment: z.number().min(0).default(0),
  loanAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100).default(4),
  insuranceFee: z.number().min(0).default(60000),
  serviceFee: z.number().min(0).default(20000),
  deliveryType: z.enum(['pickup', 'delivery_lagos', 'delivery_outside']).default('pickup'),
  deliveryFee: z.number().min(0).default(0),
  deductionFrequency: z.enum(['daily', 'bidaily', 'weekly', 'monthly']).default('bidaily'),
  tenure: z.number().int().min(1).max(36),
  monthlyRepayment: z.number().positive(),
  totalRepayable: z.number().positive(),
  // Applicant identity fields
  firstName: z.string().max(100).trim().optional(),
  lastName: z.string().max(100).trim().optional(),
  email: z.string().email().max(255).trim().optional().or(z.literal('')),
  phone: z.string().max(25).trim().optional(),
  // Mono Open Banking & Direct Debit Mandate fields
  monoAccountId: z.string().max(120).optional(),
  monoMandateId: z.string().max(120).optional(),
  monoMandateRef: z.string().max(120).optional(),
  monoMandateStatus: z.string().max(50).optional(),
  mandateStartDate: z.string().optional(),
  mandateEndDate: z.string().optional(),
  // KYC / personal data
  dateOfBirth: z.string().optional(),
  address: z.string().max(500).trim().optional(),
  state: z.string().max(50).trim().optional(),
  city: z.string().max(100).trim().optional(),
  deliveryAddress: z.string().max(500).trim().optional(),
  deliveryCity: z.string().max(100).trim().optional(),
  deliveryState: z.string().max(50).trim().optional(),
  employmentStatus: z.string().max(50).optional(),
  monthlyIncome: z.number().positive().optional(),
  employerName: z.string().max(200).trim().optional(),
  employerAddress: z.string().max(500).trim().optional(),
  bvn: z.string().length(11, 'BVN must be 11 digits').regex(/^\d+$/).optional(),
  ninNumber: z.string().length(11, 'NIN must be 11 digits').regex(/^\d+$/).optional(),
  bankName: z.string().max(100).trim().optional(),
  bankAccountNumber: z.string().max(10).regex(/^\d+$/).optional(),
  bankAccountName: z.string().max(200).trim().optional(),
  accessories: z.array(z.any()).optional(),
  // Guarantors (submitted separately)
  guarantors: z.array(z.object({
    fullName: z.string().min(2).max(200).trim(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(7).max(20).trim(),
    relationship: z.string().min(2).max(50).trim(),
  })).optional(),
  // Documents
  documents: z.array(z.object({
    type: z.enum(['national_id', 'passport', 'drivers_license', 'bvn_slip', 'utility_bill', 'bank_statement', 'selfie', 'signature', 'work_id']),
    fileUrl: z.string(),
    fileName: z.string().max(255),
  })).optional(),
});

// ---- Payments ----

export const initializePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  orderId: z.string().optional(),
  loanId: z.string().optional(),
  repaymentId: z.string().optional(),
  callbackUrl: z.string().optional(),
  provider: z.enum(['mono', 'paystack']).optional().default('mono'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---- Admin ----

export const loanActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().max(2000).trim().optional(),
  rejectionReason: z.string().max(1000).trim().optional(),
  bikeSerialNumber: z.string().max(100).trim().optional(),
  chassisNumber: z.string().max(100).trim().optional(),
  batteryNumber1: z.string().max(100).trim().optional(),
  batteryNumber2: z.string().max(100).trim().optional(),
  chargerNumber: z.string().max(100).trim().optional(),
});

// ---- User Profile Update ----

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(100).trim().optional(),
  lastName: z.string().min(2).max(100).trim().optional(),
  phone: z.string().min(10).max(15).trim().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().max(500).trim().optional(),
  city: z.string().max(100).trim().optional(),
  state: z.string().max(50).trim().optional(),
});

// ---- Inventory / Bikes ----

export const createBikeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200).trim(),
  brand: z.string().min(2).max(100).trim(),
  model: z.string().max(100).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().max(100).trim().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  availability: z.enum(['in_stock', 'out_of_stock', 'pre_order']).default('in_stock'),
  bnplEligible: z.boolean().default(true),
  bnplMinDownPayment: z.number().min(0).max(100).default(0),
  features: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
});

export const updateBikeSchema = createBikeSchema.partial();

// Export types inferred from schemas
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type LoanActionInput = z.infer<typeof loanActionSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

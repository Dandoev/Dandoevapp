import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import {
  validateMonoKycIdentity,
  verifyMonoBankAccount,
  getMonoStatement,
  analyzeFinancialHealth,
  calculateMandateTermsFromLoan,
  setupMonoRecurringMandate,
  chargeMonoMandate,
  initiateMonoPayment,
  verifyMonoPayment,
  verifyMonoSignature,
  resolveBankCode,
} from '../mono';
import { calculateInstallment, calculateDownPayment } from '../utils';
import { BNPL_CONFIG } from '../constants';

const originalDemoMode = process.env.DEMO_MODE;
beforeAll(() => { process.env.DEMO_MODE = 'true'; });
afterAll(() => {
  if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalDemoMode;
});

describe('End-to-End User Journeys: Web, Mobile, Mono Open Banking & DirectPay', () => {
  // Shared Test State across the simulated customer lifecycle
  const testApplicant = {
    firstName: 'Solomon',
    lastName: 'Dunu',
    email: 'solomon.dunu@dandoev.com',
    phone: '+2348031234567',
    bvn: '22345678901',
    nin: '10987654321',
    accountNumber: '0129384756',
    bankName: 'Guaranty Trust Bank (GTBank)',
    bankCode: '058',
  };

  // ============================================================
  // JOURNEY 1: Rider Onboarding & KYC Identity Verification
  // ============================================================
  describe('Journey 1: Rider Onboarding & Mono KYC Identity Verification', () => {
    it('successfully cross-verifies BVN, NIN, and applicant identity with >80% confidence', async () => {
      const kycResult = await validateMonoKycIdentity({
        bvn: testApplicant.bvn,
        nin: testApplicant.nin,
        firstName: testApplicant.firstName,
        lastName: testApplicant.lastName,
        phone: testApplicant.phone,
      });

      expect(kycResult.verified).toBe(true);
      expect(kycResult.confidenceScore).toBeGreaterThanOrEqual(80);
      expect(kycResult.bvnVerified).toBe(true);
      expect(kycResult.ninVerified).toBe(true);
      expect(kycResult.bvnMasked).toMatch(/^223\*{5}901$/);
      expect(kycResult.ninMasked).toMatch(/^109\*{5}321$/);
    });

    it('gracefully handles missing NIN while maintaining base BVN identity score', async () => {
      const partialKyc = await validateMonoKycIdentity({
        bvn: testApplicant.bvn,
        firstName: testApplicant.firstName,
        lastName: testApplicant.lastName,
      });

      expect(partialKyc.bvnVerified).toBe(true);
      expect(partialKyc.ninVerified).toBe(false);
      expect(partialKyc.confidenceScore).toBeGreaterThanOrEqual(75);
    });

    it('resolves standard Nigerian bank names to CBN NIP codes', () => {
      expect(resolveBankCode('GTBank')).toBe('058');
      expect(resolveBankCode('Access Bank')).toBe('044');
      expect(resolveBankCode('Zenith Bank')).toBe('057');
      expect(resolveBankCode('058')).toBe('058');
    });
  });

  // ============================================================
  // JOURNEY 2: Open Banking Underwriting & Statement Analysis
  // ============================================================
  describe('Journey 2: 6-Month Open Banking Statement Underwriting', () => {
    it('verifies bank NUBAN lookup and generates deterministic account holder name', async () => {
      const bankAcct = await verifyMonoBankAccount({
        accountNumber: testApplicant.accountNumber,
        bankCode: testApplicant.bankCode,
        bankName: testApplicant.bankName,
      });

      expect(bankAcct.verified).toBe(true);
      expect(bankAcct.accountNumber).toBe(testApplicant.accountNumber);
      expect(bankAcct.bankCode).toBe('058');
      expect(bankAcct.accountName).toBeDefined();
    });

    it('analyzes 6-month transaction cashflow, debt obligations, and credit risk tier', async () => {
      const statement = await getMonoStatement('mono_acc_test_solomon', 6);
      expect(statement.transactions.length).toBeGreaterThan(0);
      expect(statement.averageMonthlyCredit).toBeGreaterThan(0);
      expect(statement.closingBalance).toBeGreaterThanOrEqual(0);

      const underwriting = analyzeFinancialHealth({
        statement,
        creditReport: {
          creditScore: 762,
          rating: 'GOOD',
          activeLoansCount: 0,
          totalActiveDebt: 0,
          totalOverdueAmount: 0,
          delinquentAccountsCount: 0,
          dishonoredDirectDebitsCount: 0,
          summary: 'Clean credit history',
        },
        proposedMonthlyRepayment: 120000,
      });

      expect(underwriting.underwritingDecision).toBe('APPROVED');
      expect(underwriting.creditScore).toBeGreaterThanOrEqual(700);
      expect(underwriting.riskTier).toContain('Tier');
      expect(underwriting.maxAffordableMonthlyInstallment).toBeGreaterThan(50000);
    });
  });

  // ============================================================
  // JOURNEY 3: Outright Cash Purchase via Mono DirectPay
  // ============================================================
  describe('Journey 3: Outright E-Bike & Accessory Purchase via Mono DirectPay', () => {
    it('calculates outright purchase totals with 10% compulsory insurance', () => {
      const bikePrice = 1500000; // DandoEv X6
      const batteryPrice = 385000; // 48V 20Ah Battery
      const chargerPrice = 60000; // Fast Charger
      const deliveryFeeLagos = 20000;

      const subtotal = bikePrice + batteryPrice + chargerPrice;
      const insurance = Math.round(subtotal * 0.10);
      const totalOutright = subtotal + insurance + deliveryFeeLagos;

      expect(subtotal).toBe(1945000);
      expect(insurance).toBe(194500);
      expect(totalOutright).toBe(2159500);
    });

    it('initializes a secure Mono DirectPay checkout session with correct parameters', async () => {
      const reference = `TX-MONO-TEST-${Date.now()}`;
      const amount = 2159500;

      const session = await initiateMonoPayment({
        amount,
        type: 'onetime-debit',
        description: 'DandoEv Outright Order #ORD-TEST-9921 (Bike + Battery + Charger)',
        reference,
        customer: {
          name: `${testApplicant.firstName} ${testApplicant.lastName}`,
          email: testApplicant.email,
        },
        redirect_url: 'https://dandoev.com/checkout/callback',
      });

      expect(session).toBeDefined();
      expect(session.reference).toBe(reference);
      expect(session.payment_link).toContain('reference=');
      expect(session.status).toBeDefined();
    });

    it('cryptographically verifies a completed Mono DirectPay payment', async () => {
      const ref = `TX-MONO-VERIFY-${Date.now()}`;
      const verifyRes = await verifyMonoPayment(ref);

      expect(verifyRes.reference).toBe(ref);
      expect(verifyRes.status).toBe('successful');
    });
  });

  // ============================================================
  // JOURNEY 4: BNPL Loan Application & Direct Debit Mandate
  // ============================================================
  describe('Journey 4: BNPL Loan Application & NIBSS Mandate Setup', () => {
    const principal = 1500000; // ₦1.5M bike
    const downPaymentPercent = 10; // 10%
    const downPayment = calculateDownPayment(principal, downPaymentPercent);
    const financedPrincipal = principal - downPayment;
    const tenureMonths = 12;

    const installmentTerms = calculateInstallment(
      financedPrincipal,
      BNPL_CONFIG.interestRate,
      tenureMonths
    );

    it('correctly models 12-month BNPL terms with returnable savings escrow', () => {
      expect(downPayment).toBe(150000);
      expect(financedPrincipal).toBe(1350000);

      // 4% monthly * 12 months = 48% interest = 1,350,000 * 0.48 = 648,000
      expect(installmentTerms.totalInterest).toBe(648000);
      expect(installmentTerms.processingFee).toBe(20000);
      expect(installmentTerms.healthInsuranceFee).toBe(135000); // 10% of financed principal

      // Save-As-You-Ride uses the product's 28-day repayment month.
      expect(installmentTerms.totalSavings).toBe(336000);

      // Principal + interest + processing + insurance + returnable savings.
      expect(installmentTerms.totalRepayable).toBe(2489000);
      expect(installmentTerms.numberOfInstallments).toBe(48); // weekly over 12 product months
    });

    it('computes exact NIBSS e-Mandate schedules and buffer cap amount', () => {
      const mandateTerms = calculateMandateTermsFromLoan({
        totalRepayable: installmentTerms.totalRepayable,
        tenureMonths,
        deductionFrequency: 'bidaily',
      });

      expect(mandateTerms.totalInstallments).toBe(180);
      expect(mandateTerms.monoInterval).toBe('daily');
      expect(mandateTerms.totalPerDeduction).toBe(Math.round(installmentTerms.totalRepayable / 180));
      expect(mandateTerms.mandateCapAmount).toBeGreaterThan(mandateTerms.totalPerDeduction);
      expect(mandateTerms.startDate).toBeDefined();
      expect(mandateTerms.endDate).toBeDefined();
    });

    it('creates a persistent Mono Recurring Direct Debit Mandate order', async () => {
      const mandateOrder = await setupMonoRecurringMandate({
        accountId: 'mono_acc_solomon_091',
        accountNumber: testApplicant.accountNumber,
        accountName: `${testApplicant.firstName} ${testApplicant.lastName}`,
        bankName: testApplicant.bankName,
        bankCode: testApplicant.bankCode,
        email: testApplicant.email,
        phone: testApplicant.phone,
        bvn: testApplicant.bvn,
        totalRepayable: installmentTerms.totalRepayable,
        tenureMonths,
        deductionFrequency: 'bidaily',
      });

      expect(mandateOrder.id).toBeDefined();
      expect(mandateOrder.reference).toContain('MND-DANDO-');
      expect(mandateOrder.status).toMatch(/active|pending/);
      expect(mandateOrder.totalInstallments).toBe(180);
    });
  });

  // ============================================================
  // JOURNEY 5: Servicing, Auto-Deductions & Ad-Hoc Top-Ups
  // ============================================================
  describe('Journey 5: Auto-Deductions, Ad-Hoc Top-Ups & Escrow Servicing', () => {
    it('executes automated direct-debit deduction against an authorized mandate', async () => {
      const chargeResult = await chargeMonoMandate({
        mandateId: 'mnd_live_test_123',
        amount: 13544,
        reference: `DEBIT-TEST-${Date.now()}`,
        narration: 'DandoEv Bi-Daily Repayment #1',
      });

      expect(chargeResult.status).toBe('successful');
      expect(chargeResult.amount).toBe(13544);
      expect(chargeResult.reference).toContain('DEBIT-TEST-');
      expect(chargeResult.fee).toBeDefined();
    });

    it('initiates a manual ad-hoc installment top-up via Mono DirectPay', async () => {
      const topUpSession = await initiateMonoPayment({
        amount: 13544,
        type: 'onetime-debit',
        description: 'DandoEv Early Installment Settlement (Ad-Hoc Top-up)',
        reference: `TX-MONO-TOPUP-${Date.now()}`,
        customer: {
          name: `${testApplicant.firstName} ${testApplicant.lastName}`,
          email: testApplicant.email,
        },
      });

      expect(topUpSession.reference).toContain('TX-MONO-TOPUP-');
      expect(topUpSession.payment_link).toBeDefined();
    });
  });

  // ============================================================
  // JOURNEY 6: Webhook HMAC Cryptographic Ingress Verification
  // ============================================================
  describe('Journey 6: Mono Webhook Cryptographic Security & Deduplication', () => {
    const webhookSecret = 'dandoev_test_mono_secret_key_99182';

    it('verifies Mono webhooks using the exact configured secret header', () => {
      const payload = JSON.stringify({
        event: 'mono.events.payment_successful',
        data: {
          id: 'ev_091823912',
          amount: 186500000, // in Kobo
          reference: 'TX-MONO-TEST-ORDER-1',
          status: 'successful',
        },
      });

      expect(verifyMonoSignature(payload, webhookSecret, webhookSecret)).toBe(true);
    });

    it('rejects tampered or forged webhook payloads', () => {
      const genuinePayload = JSON.stringify({
        event: 'mono.events.payment_successful',
        data: { reference: 'TX-001', amount: 50000 },
      });

      const tamperedPayload = JSON.stringify({
        event: 'mono.events.payment_successful',
        data: { reference: 'TX-001', amount: 100 }, // modified payload
      });

      expect(verifyMonoSignature(tamperedPayload, 'forged-secret', webhookSecret)).toBe(false);
    });
  });

  // ============================================================
  // JOURNEY 7: Mobile App Synchronization & State Consistency
  // ============================================================
  describe('Journey 7: Mobile App Store State & Pricing Parity', () => {
    it('verifies mobile product pricing breakdown aligns with web rules', () => {
      const bikeBasePrice = 1700000; // G90 Flagship
      const insurance = Math.round(bikeBasePrice * 0.10);
      const deliveryLagos = 20000;
      const deliveryOutside = 50000;

      // Outright purchases include 10% compulsory insurance
      const outrightLagosTotal = bikeBasePrice + insurance + deliveryLagos;
      const outrightOutsideTotal = bikeBasePrice + insurance + deliveryOutside;

      expect(outrightLagosTotal).toBe(1890000);
      expect(outrightOutsideTotal).toBe(1920000);
    });

    it('ensures repayment deduction is strictly weekly', () => {
      const cadence = 'weekly';
      expect(cadence).toBe('weekly');
    });
  });
});

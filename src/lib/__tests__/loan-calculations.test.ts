import { describe, it, expect } from 'vitest';
import { calculateInstallment, calculateDownPayment, generateRiskScore } from '../utils';
import { BNPL_CONFIG } from '../constants';

describe('BNPL Loan Calculations & Terms', () => {
  it('calculates down payment correctly for various percentage tiers', () => {
    const price = 1500000;
    expect(calculateDownPayment(price, 0)).toBe(0);
    expect(calculateDownPayment(price, 10)).toBe(150000);
    expect(calculateDownPayment(price, 20)).toBe(300000);
  });

  it('calculates installment terms with insurance, VAT, processing fees and separate weekly savings', () => {
    const principal = 1000000; // 1,000,000 NGN
    const monthlyRate = 4; // 4% flat monthly
    const tenureMonths = 6;

    const terms = calculateInstallment(principal, monthlyRate, tenureMonths);

    // Expected calculations:
    // Interest = 1,000,000 * (4 / 100) * 6 = 240,000
    expect(terms.totalInterest).toBe(240000);
    expect(terms.healthInsuranceFee).toBe(100000); // 10% insurance
    expect(terms.vatFee).toBe(75000); // 7.5% VAT
    expect(terms.processingFee).toBe(20000);

    expect(terms.totalSavings).toBe(0);

    // Loan repayable excludes the separately collected returnable savings.
    expect(terms.totalRepayable).toBe(1435000);

    // Total weekly installments = 24
    expect(terms.numberOfInstallments).toBe(24);

    // Installment amount = ceil(1,435,000 / 24) = 59,792
    expect(terms.installmentAmount).toBe(59792);
  });

  it('computes risk score deterministically within bounds [0, 100]', () => {
    // Low risk borrower: high income, modest loan
    const lowRisk = generateRiskScore(300000, 600000, 12);
    expect(lowRisk).toBeGreaterThan(70);
    expect(lowRisk).toBeLessThanOrEqual(100);

    // High risk borrower: low income, high loan
    const highRisk = generateRiskScore(45000, 2000000, 6);
    expect(highRisk).toBeLessThan(50);
    expect(highRisk).toBeGreaterThanOrEqual(0);
  });

  it('verifies standard BNPL constants are set', () => {
    expect(BNPL_CONFIG.interestRate).toBe(4);
    expect(BNPL_CONFIG.processingFee).toBe(20000);
    expect(BNPL_CONFIG.healthInsuranceFee).toBe(60000);
    expect(BNPL_CONFIG.dailySavings).toBe(0);
    expect(BNPL_CONFIG.tenureOptions).toContain(6);
    expect(BNPL_CONFIG.tenureOptions).toContain(12);
  });
});

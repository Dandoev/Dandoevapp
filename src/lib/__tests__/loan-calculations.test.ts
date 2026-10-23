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

  it('calculates installment terms with health insurance, processing fees and daily savings', () => {
    const principal = 1000000; // 1,000,000 NGN
    const monthlyRate = 4; // 4% flat monthly
    const tenureMonths = 6;

    const terms = calculateInstallment(principal, monthlyRate, tenureMonths);

    // Expected calculations:
    // Interest = 1,000,000 * (4 / 100) * 6 = 240,000
    expect(terms.totalInterest).toBe(240000);
    expect(terms.healthInsuranceFee).toBe(60000);
    expect(terms.processingFee).toBe(20000);

    // Compulsory savings: 6 months * 30 days * 1,000 NGN = 180,000
    expect(terms.totalSavings).toBe(180000);

    // Total repayable = 1,000,000 + 240,000 + 60,000 + 20,000 + 180,000 = 1,500,000
    expect(terms.totalRepayable).toBe(1500000);

    // Total days = 180, Bi-daily installments = 90
    expect(terms.numberOfInstallments).toBe(90);

    // Installment amount = ceil(1,500,000 / 90) = 16,667
    expect(terms.installmentAmount).toBe(16667);
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
    expect(BNPL_CONFIG.dailySavings).toBe(1000);
    expect(BNPL_CONFIG.tenureOptions).toContain(6);
    expect(BNPL_CONFIG.tenureOptions).toContain(12);
  });
});

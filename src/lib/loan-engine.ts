import { calculateInstallment } from './utils';
import { calculateMandateTermsFromLoan, type DeductionInterval } from './mono';
import { type TxClient } from './prisma-types';

/**
 * Generate a complete repayment schedule and daily savings plan for a loan
 * based on its exact loan term (`tenureMonths`) and `deductionFrequency`
 * (`daily`, `bidaily`, `weekly`, `monthly`).
 * Typically called when a loan is approved or moved to 'active' status.
 */
export async function generateSchedule(
  tx: TxClient,
  loanId: string,
  userId: string,
  bikePrice: number,
  monthlyRate: number,
  tenureMonths: number,
  startDate: Date = new Date(),
  deductionFrequency: DeductionInterval = 'bidaily'
) {
  const { totalRepayable } = calculateInstallment(bikePrice, monthlyRate, tenureMonths);

  const mandateTerms = calculateMandateTermsFromLoan({
    totalRepayable,
    tenureMonths,
    deductionFrequency,
    startDate,
  });

  // DandoEv standard: 30 days per month
  const totalDays = tenureMonths * 30;
  const stepDays =
    mandateTerms.deductionFrequency === 'daily'
      ? 1
      : mandateTerms.deductionFrequency === 'weekly'
      ? 7
      : mandateTerms.deductionFrequency === 'monthly'
      ? 30
      : 2; // bidaily

  // 1. Generate Daily Savings (₦1,000 every single day of the loan term)
  const savingsRecords = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);

    savingsRecords.push({
      userId,
      loanId,
      date: d,
      amount: 1000,
      status: 'pending' as const,
    });
  }

  // 2. Generate Term-Based Repayments according to deductionFrequency
  const repaymentRecords = [];
  for (let i = 1; i <= mandateTerms.totalInstallments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + i * stepDays);

    repaymentRecords.push({
      loanId,
      userId,
      installmentNumber: i,
      amount: mandateTerms.installmentAmount,
      amountPaid: 0,
      dueDate,
      status: 'upcoming' as const,
    });
  }

  // Batch insertion for performance
  try {
    await tx.dailySaving.createMany({ data: savingsRecords });
    await tx.repayment.createMany({ data: repaymentRecords });
  } catch (error) {
    console.error('Error generating schedule:', error);
    throw error;
  }

  return {
    totalInstallments: mandateTerms.totalInstallments,
    installmentAmount: mandateTerms.installmentAmount,
    deductionFrequency: mandateTerms.deductionFrequency,
    startDate: mandateTerms.startDate,
    endDate: mandateTerms.endDate,
    totalDays,
  };
}

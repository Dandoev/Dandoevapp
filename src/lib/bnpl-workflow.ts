export interface ApprovalSnapshot {
  kycVerified: boolean;
  agreementAcceptedAt: Date | null;
  monoMandateId: string | null;
  monoMandateStatus: string | null;
  guarantors: Array<{ status: string; verifiedAt: Date | null; agreementAcceptedAt: Date | null }>;
}

export function getApprovalBlockers(loan: ApprovalSnapshot): string[] {
  const blockers: string[] = [];
  if (!loan.kycVerified) blockers.push('Applicant Mono KYC is not verified');
  if (!loan.agreementAcceptedAt) blockers.push('Applicant BNPL agreement is not accepted');
  const verifiedGuarantors = loan.guarantors.filter((g) => g.status === 'accepted' && g.verifiedAt && g.agreementAcceptedAt);
  if (verifiedGuarantors.length < 2) blockers.push('Two verified guarantors with signed agreements are required');
  if (!loan.monoMandateId || loan.monoMandateStatus !== 'active') blockers.push('Mono mandate is not active and ready to debit');
  return blockers;
}

export function buildRepaymentSchedule(input: {
  loanId: string; userId: string; totalRepayable: number; tenureMonths: number;
  frequency: 'daily' | 'bidaily' | 'weekly' | 'monthly'; startDate?: Date;
}) {
  const stepDays = input.frequency === 'daily' ? 1 : input.frequency === 'weekly' ? 7 : input.frequency === 'monthly' ? 30 : 2;
  const count = input.frequency === 'daily' ? input.tenureMonths * 30 : input.frequency === 'weekly' ? input.tenureMonths * 4 : input.frequency === 'monthly' ? input.tenureMonths : input.tenureMonths * 15;
  const baseKobo = Math.floor(Math.round(input.totalRepayable * 100) / count);
  const remainderKobo = Math.round(input.totalRepayable * 100) - baseKobo * count;
  const start = input.startDate || new Date();
  return Array.from({ length: count }, (_, index) => {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + (index + 1) * stepDays);
    return {
      loanId: input.loanId, userId: input.userId, installmentNumber: index + 1,
      amount: (baseKobo + (index < remainderKobo ? 1 : 0)) / 100,
      amountPaid: 0, dueDate, status: 'upcoming' as const, lateFee: 0, retryCount: 0,
    };
  });
}

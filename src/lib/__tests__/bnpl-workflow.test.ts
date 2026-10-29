import { describe, expect, it } from 'vitest';
import { buildRepaymentSchedule, getApprovalBlockers } from '../bnpl-workflow';

describe('BNPL approval workflow', () => {
  const eligible = {
    kycVerified: true, agreementAcceptedAt: new Date(), monoMandateId: 'mnd-1', monoMandateStatus: 'active',
    guarantors: [
      { status: 'accepted', verifiedAt: new Date(), agreementAcceptedAt: new Date() },
      { status: 'accepted', verifiedAt: new Date(), agreementAcceptedAt: new Date() },
    ],
  };

  it('blocks approval until KYC, applicant agreement, two guarantors, and mandate are ready', () => {
    expect(getApprovalBlockers({ ...eligible, kycVerified: false, agreementAcceptedAt: null, monoMandateStatus: 'approved', guarantors: eligible.guarantors.slice(0, 1) })).toHaveLength(4);
    expect(getApprovalBlockers(eligible)).toEqual([]);
  });

  it('creates the complete repayment term and preserves the exact contract total', () => {
    const schedule = buildRepaymentSchedule({ loanId: 'loan-1', userId: 'user-1', totalRepayable: 2_489_000, tenureMonths: 12, frequency: 'weekly', startDate: new Date('2026-10-27T00:00:00Z') });
    expect(schedule).toHaveLength(48);
    expect(schedule.reduce((sum, row) => sum + row.amount, 0)).toBe(2_489_000);
    expect(schedule[0].dueDate.toISOString()).toContain('2026-11-03');
  });
});

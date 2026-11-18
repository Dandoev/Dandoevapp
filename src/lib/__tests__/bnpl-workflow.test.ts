import { describe, expect, it } from 'vitest';
import { buildRepaymentSchedule, getApprovalBlockers } from '../bnpl-workflow';

describe('BNPL approval workflow', () => {
  const eligible = {
    kycVerified: true, agreementAcceptedAt: new Date(), monoMandateId: 'mnd-1', monoMandateStatus: 'active', monoAssessment: { underwritingDecision: 'APPROVED', source: 'mono_live' },
    guarantors: [
      { status: 'accepted', verifiedAt: new Date(), agreementAcceptedAt: new Date() },
      { status: 'accepted', verifiedAt: new Date(), agreementAcceptedAt: new Date() },
    ],
  };

  it('blocks credit approval until KYC, applicant agreement, and two guarantors are ready', () => {
    expect(getApprovalBlockers({ ...eligible, kycVerified: false, agreementAcceptedAt: null, monoMandateStatus: 'approved', guarantors: eligible.guarantors.slice(0, 1) })).toHaveLength(3);
    expect(getApprovalBlockers({ ...eligible, monoMandateId: null, monoMandateStatus: null })).toEqual([]);
    expect(getApprovalBlockers(eligible)).toEqual([]);
  });

  it('blocks missing, demo, and non-approved financial assessments', () => {
    expect(getApprovalBlockers({ ...eligible, monoAssessment: null })).toContain('Mono financial assessment is missing');
    expect(getApprovalBlockers({ ...eligible, monoAssessment: { underwritingDecision: 'APPROVED', source: 'mono_demo' } })).toContain('Live Mono financial assessment is required');
    expect(getApprovalBlockers({ ...eligible, monoAssessment: { underwritingDecision: 'DECLINED', source: 'mono_live' } })).toContain('Financial assessment has not approved affordability');
  });

  it('creates the complete repayment term and preserves the exact contract total', () => {
    const schedule = buildRepaymentSchedule({ loanId: 'loan-1', userId: 'user-1', totalRepayable: 2_489_000, tenureMonths: 12, frequency: 'weekly', startDate: new Date('2026-10-27T00:00:00Z') });
    expect(schedule).toHaveLength(48);
    expect(schedule.reduce((sum, row) => sum + row.amount, 0)).toBe(2_489_000);
    expect(schedule[0].dueDate.toISOString()).toContain('2026-11-03');
  });
});

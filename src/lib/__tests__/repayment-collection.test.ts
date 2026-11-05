import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, chargeMonoMandateMock } = vi.hoisted(() => ({
  prismaMock: {
    repayment: { updateMany: vi.fn() },
    paymentTransaction: { create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
  },
  chargeMonoMandateMock: vi.fn(),
}));

vi.mock('../prisma', () => ({ default: prismaMock }));
vi.mock('../mono', () => ({ chargeMonoMandate: chargeMonoMandateMock }));
vi.mock('../wallet', () => ({ debitWalletForRepayment: vi.fn(), lockSavings: vi.fn() }));
vi.mock('../paystack', () => ({ chargePaystackAuthorization: vi.fn() }));
vi.mock('../queue', () => ({ enqueueNotification: vi.fn() }));
vi.mock('../db-service', () => ({ default: {} }));

import { collectRepaymentById } from '../collection-service';

describe('Mono repayment collection claim', () => {
  const repayment = {
    id: 'repayment-1', loanId: 'loan-1', installmentNumber: 1,
    amount: 2000, lateFee: 0, status: 'upcoming', paymentReference: null,
    loanRelation: {
      tenure: 12, monoMandateId: 'mandate-1',
      user: { id: 'user-1', email: 'user@example.com', wallet: { mainBalance: 0 } },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.paymentTransaction.create.mockResolvedValue({});
    prismaMock.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
  });

  it('submits only one debit when two collectors race for the same installment', async () => {
    prismaMock.repayment.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    chargeMonoMandateMock.mockImplementation(async ({ reference }) => ({ status: 'pending', reference }));

    const results = await Promise.all([collectRepaymentById(repayment), collectRepaymentById(repayment)]);

    expect(chargeMonoMandateMock).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.status || result.method).sort()).toEqual(['already_processing', 'mono_mandate_pending']);
  });

  it('does not debit wallet or Mono while settlement is pending', async () => {
    const result = await collectRepaymentById({ ...repayment, paymentReference: 'RPY-in-flight' });
    expect(result).toEqual({ success: false, status: 'pending_settlement' });
    expect(prismaMock.repayment.updateMany).not.toHaveBeenCalled();
    expect(chargeMonoMandateMock).not.toHaveBeenCalled();
  });
});

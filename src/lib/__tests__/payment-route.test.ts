import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
  verifyMonoPayment: vi.fn(),
}));

vi.mock('@/lib/api-handler', () => ({ withAuth: (handler: unknown) => handler }));
vi.mock('@/lib/prisma', () => ({
  default: {
    paymentTransaction: { findFirst: mocks.findFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock('@/lib/mono', () => ({ verifyMonoPayment: mocks.verifyMonoPayment }));
vi.mock('@/lib/logger', () => ({
  default: { child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) },
}));

import { GET } from '@/app/api/payments/verify/route';

const ctx = { requestId: 'test', user: { sub: 'customer', role: 'customer' } };
const request = (reference: string) => ({ url: `http://localhost/api/payments/verify?reference=${reference}` });

describe('payment verification route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({
      id: 'TX-MONO-1', providerRef: 'mono-ref', provider: 'mono', userId: 'customer',
      amount: 1000, status: 'pending', orderId: 'order-1', loanId: null, repaymentId: null,
    });
  });

  it('does not confirm payment when Mono verification fails', async () => {
    mocks.verifyMonoPayment.mockRejectedValue(new Error('Gateway unavailable'));
    const response = await GET(request('mono-ref') as never, ctx as never);
    expect(response.status).toBe(502);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('does not confirm payment when Mono returns an insufficient amount', async () => {
    mocks.verifyMonoPayment.mockResolvedValue({ status: 'successful', amount: 1, reference: 'mono-ref' });
    const response = await GET(request('mono-ref') as never, ctx as never);
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

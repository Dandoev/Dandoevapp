import { describe, expect, it, vi } from 'vitest';
import { assertVerifiedPayment, resolvePaymentIntent } from '../payment-intent';

const db = {
  order: { findUnique: vi.fn() },
  loan: { findUnique: vi.fn() },
  repayment: { findUnique: vi.fn() },
};
const paymentDb = db as unknown as Parameters<typeof resolvePaymentIntent>[0];

describe('payment intent validation', () => {
  it('rejects a payment for another customer’s order', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'other', totalAmount: 1000, status: 'pending' });
    await expect(resolvePaymentIntent(paymentDb, { userId: 'customer', amount: 1000, orderId: 'order-1' }))
      .rejects.toMatchObject({ status: 403 });
  });

  it('rejects an underpayment against the server-side order total', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'customer', totalAmount: 1000, status: 'pending' });
    await expect(resolvePaymentIntent(paymentDb, { userId: 'customer', amount: 1, orderId: 'order-1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('rejects missing or multiple payment targets', async () => {
    await expect(resolvePaymentIntent(paymentDb, { userId: 'customer', amount: 1000 }))
      .rejects.toMatchObject({ status: 400 });
    await expect(resolvePaymentIntent(paymentDb, { userId: 'customer', amount: 1000, orderId: 'one', loanId: 'two' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('rejects an unverified, mismatched, or insufficient gateway result', () => {
    const expected = { reference: 'TX-1', amount: 1000 };
    expect(() => assertVerifiedPayment(expected, { status: 'failed', reference: 'TX-1', amount: 1000, currency: 'NGN' })).toThrow();
    expect(() => assertVerifiedPayment(expected, { status: 'success', reference: 'other', amount: 1000, currency: 'NGN' })).toThrow();
    expect(() => assertVerifiedPayment(expected, { status: 'success', reference: 'TX-1', amount: 1, currency: 'NGN' })).toThrow();
    expect(() => assertVerifiedPayment(expected, { status: 'success', reference: 'TX-1', amount: 1000, currency: 'NGN' })).not.toThrow();
  });
});

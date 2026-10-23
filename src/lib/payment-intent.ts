import type prisma from './prisma';
import type { TxClient } from './prisma-types';

type PaymentDb = typeof prisma | TxClient;

export class PaymentIntentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface PaymentIntent {
  userId: string;
  amount: number;
  orderId?: string | null;
  loanId?: string | null;
  repaymentId?: string | null;
}

function cents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) {
    throw new PaymentIntentError('Invalid payment amount', 400);
  }
  return Math.round(amount * 100);
}

export async function resolvePaymentIntent(db: PaymentDb, intent: PaymentIntent): Promise<void> {
  const { userId, amount, orderId, loanId, repaymentId } = intent;
  const supplied = [orderId, loanId, repaymentId].filter(Boolean);
  if (supplied.length !== 1) {
    throw new PaymentIntentError('Exactly one payment target is required', 400);
  }
  const paymentCents = cents(amount);

  let owner: string;
  let due: number;
  if (orderId) {
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new PaymentIntentError('Order not found', 404);
    owner = order.userId;
    if (owner !== userId) throw new PaymentIntentError('Payment target does not belong to this user', 403);
    due = Number(order.totalAmount);
    if (order.status !== 'pending') throw new PaymentIntentError('Order is not payable', 409);
  } else if (loanId) {
    const loan = await db.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new PaymentIntentError('Loan not found', 404);
    owner = loan.userId;
    if (owner !== userId) throw new PaymentIntentError('Payment target does not belong to this user', 403);
    due = Number(loan.downPayment);
    if (!['pending', 'under_review'].includes(loan.status)) {
      throw new PaymentIntentError('Loan down payment is not payable', 409);
    }
  } else {
    const repayment = await db.repayment.findUnique({ where: { id: repaymentId! } });
    if (!repayment) throw new PaymentIntentError('Repayment not found', 404);
    owner = repayment.userId;
    if (owner !== userId) throw new PaymentIntentError('Payment target does not belong to this user', 403);
    due = Number(repayment.amount) + Number(repayment.lateFee) - Number(repayment.amountPaid);
    if (!['upcoming', 'overdue', 'failed', 'partial'].includes(repayment.status)) {
      throw new PaymentIntentError('Repayment is not payable', 409);
    }
  }

  if (!Number.isFinite(due) || due <= 0 || paymentCents !== Math.round(due * 100)) {
    throw new PaymentIntentError('Payment amount does not match amount due', 400);
  }
}

export function assertVerifiedPayment(
  expected: { reference: string; amount: number },
  actual: { status: string; reference: string; amount: number; currency: string }
): void {
  if (actual.status !== 'success') throw new PaymentIntentError('Payment has not succeeded', 400);
  if (actual.reference !== expected.reference) throw new PaymentIntentError('Payment reference mismatch', 400);
  if (actual.currency !== 'NGN') throw new PaymentIntentError('Payment currency mismatch', 400);
  if (cents(actual.amount) !== cents(expected.amount)) {
    throw new PaymentIntentError('Verified amount does not match the payment', 400);
  }
}

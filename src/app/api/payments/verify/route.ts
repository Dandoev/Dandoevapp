import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { verifyMonoPayment } from '@/lib/mono';
import { assertVerifiedPayment, PaymentIntentError, resolvePaymentIntent } from '@/lib/payment-intent';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * GET /api/payments/verify?reference=xxx
 * Verify a payment transaction against Mono DirectPay or Paystack, and update local records:
 *  - Confirms Outright Orders (Bikes / Batteries / Chargers)
 *  - Confirms BNPL Down Payments
 *  - Settles Manual Ad-Hoc Repayment Installments
 */
export const GET = withAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const log = logger.child({ requestId: ctx.requestId, route: 'payments/verify' });
    const reference = new URL(req.url).searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    try {
      // ---- Find local transaction ----
      const transaction = await prisma.paymentTransaction.findFirst({
        where: {
          OR: [
            { providerRef: reference },
            { id: reference },
          ],
        },
      });

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 });
      }

      // Check ownership (must belong to authenticated user or admin)
      const isAdmin = ['super_admin', 'finance_admin', 'operations_admin'].includes(ctx.user.role);
      if (!isAdmin && transaction.userId !== ctx.user.sub) {
        log.warn(
          { userId: ctx.user.sub, txUserId: transaction.userId, reference },
          'Unauthorized payment verification attempt'
        );
        return NextResponse.json({ error: 'Unauthorized to verify this transaction' }, { status: 403 });
      }

      if (transaction.status === 'success') {
        return NextResponse.json({
          success: true,
          data: { status: 'success', amount: Number(transaction.amount), currency: 'NGN',
            reference, provider: transaction.provider },
        });
      }
      if (!['initiated', 'pending'].includes(transaction.status)) {
        return NextResponse.json({ error: 'Payment is not pending' }, { status: 409 });
      }

      const expectedAmount = Number(transaction.amount);
      const gatewayReference = transaction.providerRef || transaction.id;
      let channel = 'mono_directpay';
      let paidAt = new Date().toISOString();

      // ========================================================
      // 1. Mono DirectPay Verification
      // ========================================================
      if (transaction.provider === 'mono') {
        const monoResult = await verifyMonoPayment(gatewayReference);
        if (monoResult.status === 'pending') {
          return NextResponse.json({ success: true, data: { status: 'pending', reference: gatewayReference, provider: 'mono' } }, { status: 202 });
        }
        assertVerifiedPayment(
          { reference: gatewayReference, amount: expectedAmount },
          { status: monoResult.status === 'successful' ? 'success' : monoResult.status,
            reference: monoResult.reference, amount: monoResult.amount, currency: 'NGN' }
        );
        channel = 'Pay with Bank (Mono DirectPay)';
      } else if (transaction.provider === 'paystack') {
        // ========================================================
        // 2. Paystack Gateway Verification
        // ========================================================
        const paystackResponse = await fetch(
          `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(gatewayReference)}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        const paystackData = await paystackResponse.json();
        if (!paystackResponse.ok || !paystackData.status || !paystackData.data) {
          throw new PaymentIntentError('Gateway verification failed', 502);
        }
        const txData = paystackData.data;
        assertVerifiedPayment(
          { reference: gatewayReference, amount: expectedAmount },
          { status: txData.status, reference: txData.reference,
            amount: txData.amount / 100, currency: txData.currency }
        );
        channel = txData.channel || 'paystack';
        paidAt = txData.paid_at || paidAt;
      } else {
        throw new PaymentIntentError('Unsupported payment provider', 400);
      }

      await prisma.$transaction(async (tx) => {
        await resolvePaymentIntent(tx, {
          userId: transaction.userId, amount: expectedAmount,
          orderId: transaction.orderId, loanId: transaction.loanId,
          repaymentId: transaction.repaymentId,
        });
        const claimed = await tx.paymentTransaction.updateMany({
          where: { id: transaction.id, status: { in: ['initiated', 'pending'] } },
          data: { status: 'success', reconciledAt: new Date() },
        });
        if (claimed.count !== 1) throw new PaymentIntentError('Payment was already processed', 409);
        // ---- A. Confirm Outright Order (Bike / Batteries / Chargers) ----
        if (transaction.orderId) {
          await tx.order.update({
            where: { id: transaction.orderId },
            data: { status: 'confirmed' },
          });
          log.info({ orderId: transaction.orderId }, 'Order confirmed following successful payment');
        }

        // ---- B. Settle Ad-Hoc BNPL Installment Repayment ----
        if (transaction.repaymentId) {
          await tx.repayment.update({
            where: { id: transaction.repaymentId },
            data: {
              status: 'paid',
              amountPaid: { increment: expectedAmount },
              paidDate: new Date(),
              paymentReference: reference,
            },
          });
          log.info(
            { repaymentId: transaction.repaymentId, amount: expectedAmount },
            'Ad-hoc BNPL installment repayment settled via Mono'
          );
        }

        // ---- C. Confirm BNPL Down Payment ----
        if (transaction.loanId) {
          await tx.loan.update({
            where: { id: transaction.loanId },
            data: {
              status: 'approved',
              downPayment: expectedAmount,
            },
          });
          log.info(
            { loanId: transaction.loanId, amount: expectedAmount },
            'BNPL loan down payment confirmed via Mono DirectPay'
          );
        }
      });

      log.info({ reference, status: 'success', provider: transaction.provider }, 'Payment verified');

      return NextResponse.json({
        success: true,
        data: {
          status: 'success',
          amount: expectedAmount,
          currency: 'NGN',
          reference,
          provider: transaction.provider,
          paidAt,
          channel,
        },
      });
    } catch (error) {
      if (error instanceof PaymentIntentError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      log.error({ error, reference }, 'Payment verification error');
      return NextResponse.json({ error: 'Gateway verification unavailable' }, { status: 502 });
    }
  }
);

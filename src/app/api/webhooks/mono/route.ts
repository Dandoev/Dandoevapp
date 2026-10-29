// ============================================================
// DandoEv — Mono Webhook Ingress Handler
// POST /api/webhooks/mono — Handles Mono Open Banking, KYC,
// Mandate Lifecycle & Direct Debit Auto-Deduction Webhooks
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { verifyMonoSignature } from '@/lib/mono';
import { deduplicateWebhookEvent, updateWebhookEventStatus } from '@/lib/webhook';
import prisma from '@/lib/prisma';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const log = logger.child({ route: 'webhooks/mono' });

  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('mono-webhook-secret') || req.headers.get('x-mono-signature');

    // Enforce signature verification (reject missing signature in production)
    if (!signature) {
      if (process.env.NODE_ENV === 'production' || process.env.MONO_WEBHOOK_SECRET) {
        log.warn('Rejected Mono webhook: missing signature header in production');
        return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
      }
    } else if (!verifyMonoSignature(rawBody, signature)) {
      log.warn('Rejected Mono webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: { event_id?: string; event: string; data: Record<string, any> };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!payload.event || !payload.data || typeof payload.data !== 'object') {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }
    const eventId = payload.event_id || `mono:${crypto.createHash('sha256').update(rawBody).digest('hex')}`;
    log.info({ event: payload.event, eventId }, 'Mono webhook received');

    // Deduplicate event
    const isDuplicate = await deduplicateWebhookEvent(
      'mono',
      eventId,
      payload.event,
      payload.data
    );
    if (isDuplicate) {
      return NextResponse.json({ received: true, deduplicated: true });
    }

    const data = payload.data || {};

    // Process event types across Open Banking, Mandates & Direct Debit
    switch (payload.event) {
      // ---- 1. Account Connected / Updated ----
      case 'mono.events.account_connected':
      case 'mono.events.account_updated': {
        const accountId = data.account?._id || data.account?.id || data.id;
        log.info({ accountId }, 'Mono account connected/updated');

        if (accountId) {
          await prisma.user
            .updateMany({
              where: { monoAccountId: accountId },
              data: {
                monoStatus: 'linked',
                kycStatus: 'verified',
              },
            })
            .catch(() => null);
        }
        break;
      }

      // ---- 2. Statement Insights Ready ----
      case 'mono.events.statement_insights_ready':
      case 'mono.events.account_reauthorized': {
        const accountId = data.account?._id || data.account?.id || data.id;
        log.info({ accountId }, 'Mono statement insights ready');

        if (accountId) {
          await prisma.user
            .updateMany({
              where: { monoAccountId: accountId },
              data: { monoStatus: 'statement_fetched' },
            })
            .catch(() => null);
        }
        break;
      }

      // ---- 3. Mandate Order Approved / Ready ----
      case 'mono.events.mandate.approved':
      case 'mono.events.mandate.active':
      case 'events.mandates.ready':
      case 'events.mandates.approved': {
        const mandateId = data.id || data.mandate_id;
        const reference = data.reference;
        const mandateStatus = payload.event === 'events.mandates.ready' || payload.event === 'mono.events.mandate.active' ? 'active' : 'approved';
        log.info({ mandateId, reference, mandateStatus }, 'Mono Direct Debit Mandate state updated');

        if (mandateId) {
          await prisma.user
            .updateMany({
              where: { monoMandateId: mandateId },
              data: { monoMandateStatus: mandateStatus },
            })
            .catch(() => null);

          await prisma.loan
            .updateMany({
              where: { monoMandateId: mandateId },
              data: { monoMandateStatus: mandateStatus },
            })
            .catch(() => null);
        }

        await dbService
          .logAudit({
            action: 'MONO_MANDATE_WEBHOOK_ACTIVE',
            actorName: 'Mono Webhook Engine',
            resource: 'loan_mandate',
            resourceId: mandateId || reference,
            details: `NIBSS e-Mandate ${mandateId || reference} confirmed active and ready for scheduled loan-term debits.`,
          })
          .catch(() => null);
        break;
      }

      // ---- 4. Mandate Auto-Deduction / Direct Debit Successful ----
      case 'mono.events.mandate.debit.successful':
      case 'events.mandates.debit.successful':
      case 'direct_debit.payment_successful': {
        const mandateId = data.mandate_id || data.mandate || data.id;
        const reference = data.reference;
        const amountNgn = typeof data.amount === 'number' ? data.amount / 100 : NaN;
        if (!mandateId || !reference || !Number.isFinite(amountNgn) || amountNgn <= 0) {
          throw new Error('Invalid successful mandate debit payload');
        }

        log.info(
          { mandateId, reference, amountNgn },
          'Mono Mandate auto-deduction webhook succeeded'
        );

        try {
          const transaction = await prisma.paymentTransaction.findFirst({
            where: { provider: 'mono', providerRef: reference, status: { in: ['initiated', 'pending'] } },
          });
          if (!transaction?.repaymentId || Math.round(Number(transaction.amount) * 100) !== Math.round(amountNgn * 100)) {
            throw new Error('Mono debit does not match a pending repayment transaction');
          }
          await prisma.$transaction(async (tx) => {
              const claimed = await tx.paymentTransaction.updateMany({
                where: { id: transaction.id, status: { in: ['initiated', 'pending'] } },
                data: { status: 'success', reconciledAt: new Date(), metadata: data },
              });
              if (claimed.count !== 1) return;
              await tx.repayment.update({
                where: { id: transaction.repaymentId! },
                data: {
                  status: 'paid',
                  paidDate: new Date(),
                  amountPaid: { increment: amountNgn },
                  paymentReference: reference,
                },
              });
              const remaining = await tx.repayment.count({
                where: { loanId: transaction.loanId!, status: { not: 'paid' } },
              });
              if (remaining === 0 && transaction.loanId) await tx.loan.update({ where: { id: transaction.loanId }, data: { status: 'completed', completedAt: new Date(), monoMandateStatus: 'completed' } });
          });
        } catch (error) {
          log.error({ error, reference }, 'Failed to reconcile Mono mandate debit');
          throw error;
        }

        break;
      }

      // ---- 5. Mandate Auto-Deduction Failed / Dishonored ----
      case 'mono.events.mandate.debit.failed':
      case 'events.mandates.debit.failed':
      case 'direct_debit.payment_failed': {
        const mandateId = data.mandate_id || data.mandate || data.id;
        const reference = data.reference;
        if (!reference) throw new Error('Invalid failed mandate debit payload');
        log.warn({ mandateId, reference }, 'Mono Mandate auto-deduction failed');

        await prisma.paymentTransaction.updateMany({
          where: { provider: 'mono', providerRef: reference, status: { in: ['initiated', 'pending'] } },
          data: { status: 'failed', reconciledAt: new Date(), metadata: data },
        });

        await dbService
          .logAudit({
            action: 'MONO_MANDATE_DEBIT_FAILED',
            actorName: 'Mono Webhook Engine',
            resource: 'repayment',
            resourceId: mandateId || reference,
            details: `Scheduled Mono Direct Debit attempt (${reference}) failed/dishonored. Scheduled for retry.`,
          })
          .catch(() => null);
        break;
      }

      // ---- 6. Mono DirectPay One-Time Payment Successful (Outright Bikes, Batteries/Chargers, Down Payments, Top-ups) ----
      case 'mono.events.payment_successful':
      case 'events.payment_successful':
      case 'payment.successful': {
        const reference = data.reference || data.id;
        const amountNgn =
          typeof data.amount === 'number' ? Math.round(data.amount / 100) : undefined;

        log.info({ reference, amountNgn }, 'Mono DirectPay payment succeeded via webhook');

        try {
          const transaction = await prisma.paymentTransaction.findFirst({
            where: {
              OR: [
                { id: reference },
                { providerRef: reference },
              ],
            },
          });

          if (transaction) {
            const finalAmount = amountNgn || Number(transaction.amount);
            if (Math.round(finalAmount * 100) !== Math.round(Number(transaction.amount) * 100)) {
              throw new Error('Mono DirectPay amount does not match the pending transaction');
            }

            await prisma.paymentTransaction.update({
              where: { id: transaction.id },
              data: { status: 'success', reconciledAt: new Date() },
            });

            // A. Confirm Outright Order
            if (transaction.orderId) {
              await prisma.order.update({
                where: { id: transaction.orderId },
                data: { status: 'confirmed' },
              });
              log.info({ orderId: transaction.orderId }, 'Order confirmed via Mono DirectPay webhook');
            }

            // B. Settle Ad-Hoc BNPL Installment
            if (transaction.repaymentId) {
              await prisma.repayment.update({
                where: { id: transaction.repaymentId },
                data: {
                  status: 'paid',
                  paidDate: new Date(),
                  amountPaid: finalAmount,
                  paymentReference: reference,
                },
              });
              log.info({ repaymentId: transaction.repaymentId }, 'Installment settled via Mono DirectPay webhook');
            }

            // C. Confirm BNPL Down Payment
            if (transaction.loanId) {
              await prisma.loan.update({
                where: { id: transaction.loanId },
                data: { status: 'approved', downPayment: finalAmount },
              });
              log.info({ loanId: transaction.loanId }, 'Down payment confirmed via Mono DirectPay webhook');
            }
          }
        } catch (err: any) {
          log.error({ err: err.message, reference }, 'Error reconciling Mono DirectPay webhook');
          throw err;
        }
        break;
      }

      default:
        log.info({ event: payload.event }, 'Unhandled Mono webhook event');
    }

    await updateWebhookEventStatus(eventId, 'processed');
    return NextResponse.json({ received: true, event: payload.event });
  } catch (error: any) {
    log.error({ error: error.message }, 'Mono webhook processing error');
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

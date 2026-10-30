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

    if (!signature) return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });

    let payload: { event_id?: string; event: string; data: Record<string, any> };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const event = payload.event || '';
    const productSecret = event.startsWith('mono.prove.')
      ? process.env.MONO_PROVE_WEBHOOK_SECRET
      : event.startsWith('mono.events.account_') || event.startsWith('mono.accounts.')
        ? process.env.MONO_CONNECT_WEBHOOK_SECRET
        : event.startsWith('mono.events.watchlist.') || event.startsWith('mono.lookup.')
          ? process.env.MONO_LOOKUP_WEBHOOK_SECRET
          : process.env.MONO_PAYMENTS_WEBHOOK_SECRET;
    const allowedSecrets = event === 'mono.events.account_connected'
      ? [process.env.MONO_CONNECT_WEBHOOK_SECRET, process.env.MONO_PAYMENTS_WEBHOOK_SECRET]
      : [productSecret];
    if (!allowedSecrets.some(Boolean)) return NextResponse.json({ error: 'Mono webhook secret is not configured' }, { status: 503 });
    if (!allowedSecrets.some((secret) => secret && verifyMonoSignature(rawBody, signature, secret))) {
      log.warn('Rejected Mono webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
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
      // ---- 0. Mono Prove facial/liveness verification ----
      case 'mono.prove.data_verification_successful':
      case 'mono.prove.data_verification_rejected':
      case 'mono.prove.data_verification_failed':
      case 'mono.prove.data_verification_expired':
      case 'mono.prove.data_verification_cancelled': {
        const successful = payload.event === 'mono.prove.data_verification_successful';
        const email = data.customer?.email || data.email;
        const reference = data.reference;
        const initiation = reference ? await prisma.auditLog.findFirst({ where: { action: 'MONO_PROVE_STARTED', resourceId: reference } }) : null;
        const user = initiation?.userId ? await prisma.user.findUnique({ where: { id: initiation.userId } }) : null;
        if (user && (!email || user.email.toLowerCase() === String(email).toLowerCase())) {
          await prisma.user.update({ where: { id: user.id }, data: { kycStatus: successful ? 'verified' : 'failed' } });
          await prisma.auditLog.create({ data: { userId: user.id, action: successful ? 'MONO_PROVE_FACE_VERIFIED' : 'MONO_PROVE_FACE_REJECTED', resource: 'kyc', resourceId: reference, details: JSON.stringify({ provider: 'mono_prove', event: payload.event }) } });
        } else {
          throw new Error('Mono Prove reference or customer did not match an initiated session');
        }
        log.info({ reference, email, successful }, 'Mono Prove facial verification processed');
        break;
      }

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
      case 'events.mandates.ready':
      case 'events.mandates.approved': {
        const mandateId = data.id || data.mandate_id;
        const reference = data.reference;
        const mandateStatus = payload.event === 'events.mandates.ready' && data.ready_to_debit === true ? 'active' : 'approved';
        log.info({ mandateId, reference, mandateStatus }, 'Mono Direct Debit Mandate state updated');

        if (mandateId) {
          await prisma.user
            .updateMany({
              where: { monoMandateId: mandateId, ...(mandateStatus === 'approved' ? { monoMandateStatus: { not: 'active' } } : {}) },
              data: { monoMandateStatus: mandateStatus },
            })
            .catch(() => null);

          await prisma.loan
            .updateMany({
              where: { monoMandateId: mandateId, ...(mandateStatus === 'approved' ? { monoMandateStatus: { not: 'active' } } : {}) },
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
      {
        const mandateId = data.mandate_id || data.mandate;
        const reference = data.reference_number || data.reference;
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
          if (!transaction?.repaymentId || !transaction.loanId || (transaction.metadata as any)?.mandateId !== mandateId || Math.round(Number(transaction.amount) * 100) !== Math.round(amountNgn * 100)) {
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
      {
        const mandateId = data.mandate_id || data.mandate;
        const reference = data.reference_number || data.reference;
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
      case 'payment.successful':
      case 'direct_debit.payment_successful': {
        const paymentData = data.object || data;
        const reference = paymentData.reference;
        const amountNgn =
          typeof paymentData.amount === 'number' ? paymentData.amount / 100 : NaN;
        if (paymentData.status && paymentData.status !== 'successful') throw new Error('Mono DirectPay webhook is not successful');

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

          if (!transaction || transaction.provider !== 'mono' || !Number.isFinite(amountNgn) || Math.round(amountNgn * 100) !== Math.round(Number(transaction.amount) * 100)) {
            throw new Error('Mono DirectPay webhook does not match a payment transaction');
          }
          if (transaction.status === 'success') break;
          await prisma.$transaction(async (tx) => {
            const claimed = await tx.paymentTransaction.updateMany({
              where: { id: transaction.id, status: { in: ['initiated', 'pending'] } },
              data: { status: 'success', reconciledAt: new Date() },
            });
            if (claimed.count !== 1) return;

            // A. Confirm Outright Order
            if (transaction.orderId) {
              await tx.order.update({
                where: { id: transaction.orderId },
                data: { status: 'confirmed' },
              });
              log.info({ orderId: transaction.orderId }, 'Order confirmed via Mono DirectPay webhook');
            }

            // B. Settle Ad-Hoc BNPL Installment
            if (transaction.repaymentId) {
              await tx.repayment.update({
                where: { id: transaction.repaymentId },
                data: {
                  status: 'paid',
                  paidDate: new Date(),
                  amountPaid: amountNgn,
                  paymentReference: reference,
                },
              });
              log.info({ repaymentId: transaction.repaymentId }, 'Installment settled via Mono DirectPay webhook');
            }

            // C. Confirm BNPL Down Payment
            if (transaction.loanId) {
              await tx.loan.update({
                where: { id: transaction.loanId },
                data: { status: 'approved', downPayment: amountNgn },
              });
              log.info({ loanId: transaction.loanId }, 'Down payment confirmed via Mono DirectPay webhook');
            }
          });
        } catch (err: any) {
          log.error({ err: err.message, reference }, 'Error reconciling Mono DirectPay webhook');
          throw err;
        }
        break;
      }

      case 'direct_debit.payment_failed':
      case 'direct_debit.payment_cancelled':
      case 'direct_debit.payment_abandoned': {
        const reference = data.object?.reference || data.reference;
        if (!reference) throw new Error('Mono DirectPay failure event has no reference');
        await prisma.paymentTransaction.updateMany({
          where: { provider: 'mono', providerRef: reference, status: { in: ['initiated', 'pending'] } },
          data: { status: 'failed', reconciledAt: new Date() },
        });
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

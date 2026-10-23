import { NextRequest, NextResponse } from 'next/server';
import { verifyPaystackSignature, deduplicateWebhookEvent, updateWebhookEventStatus, PAYSTACK_EVENTS } from '@/lib/webhook';
import { enqueuePaymentJob } from '@/lib/queue';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/webhooks/paystack
 * Handles incoming Paystack webhook events.
 *
 * Flow:
 * 1. Verify HMAC-SHA512 signature
 * 2. Deduplicate by event ID
 * 3. Enqueue to BullMQ for async processing
 * 4. Return 200 immediately (Paystack requires < 5s response)
 */
export async function POST(req: NextRequest) {
  const log = logger.child({ route: 'webhooks/paystack' });

  try {
    // ---- Read raw body for signature verification ----
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      log.warn('Missing x-paystack-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // ---- Verify Signature ----
    if (!verifyPaystackSignature(rawBody, signature)) {
      log.warn('Invalid Paystack webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // ---- Parse Event ----
    let event: { event: string; data: Record<string, unknown> };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const crypto = await import('crypto');
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 16);
    const refOrId = (event.data?.reference as string) || (event.data?.id as string) || payloadHash;
    const eventId = `${event.event}:${refOrId}`;

    log.info({ eventType: event.event, eventId }, 'Webhook received');

    // ---- Deduplicate ----
    const isDuplicate = await deduplicateWebhookEvent(
      'paystack',
      eventId,
      event.event,
      event.data
    );

    if (isDuplicate) {
      return NextResponse.json({ received: true });
    }

    // ---- Route by Event Type ----
    switch (event.event) {
      case PAYSTACK_EVENTS.CHARGE_SUCCESS: {
        const data = event.data as any;
        // Capture reusable authorization_code for future direct debits
        const auth = data?.authorization;
        const customerCode = data?.customer?.customer_code;
        if (auth?.reusable && auth?.authorization_code && data?.customer?.email) {
          try {
            await (prisma.user as any).updateMany({
              where: { email: data.customer.email },
              data: {
                paystackAuthCode: auth.authorization_code,
                ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
              },
            });
            log.info({ email: data.customer.email }, 'Saved Paystack authorization_code for direct debit');
          } catch (err: any) {
            log.error({ error: err.message }, 'Failed to save Paystack auth code');
          }
        }
        // Enqueue for async processing (repayment/order confirmation)
        await enqueuePaymentJob({ eventId, eventType: event.event, payload: event.data });
        break;
      }
      case PAYSTACK_EVENTS.TRANSFER_SUCCESS:
      case PAYSTACK_EVENTS.TRANSFER_FAILED:
      case PAYSTACK_EVENTS.REFUND_PROCESSED: {
        await enqueuePaymentJob({ eventId, eventType: event.event, payload: event.data });
        break;
      }

      default:
        log.info({ eventType: event.event }, 'Unhandled webhook event type — logged');
    }

    // ---- Return 200 immediately ----
    return NextResponse.json({ received: true });
  } catch (error: any) {
    log.error({ error: error.message }, 'Webhook processing error');
    
    // If it's a Prisma connection error or similar retryable infra error, return 503
    const isRetryable = error.message?.includes('Prisma') || 
                       error.message?.includes('connection') || 
                       error.message?.includes('timeout');

    if (isRetryable) {
      return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
    }

    // Still return 200 for logical errors to prevent Paystack from retrying indefinitely
    return NextResponse.json({ received: true });
  }
}

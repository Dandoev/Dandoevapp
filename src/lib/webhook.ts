// ============================================================
// Webhook Handling — Signature Verification & Event Dedup
// ============================================================
import crypto from 'crypto';
import prisma from './prisma';
import logger from './logger';

/**
 * Verify Paystack webhook signature using HMAC-SHA512.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPaystackSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    logger.error('PAYSTACK_SECRET_KEY not set — cannot verify webhook signature');
    return false;
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'utf8'),
      Buffer.from(signatureHeader, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Check if a webhook event has already been processed (deduplication).
 * If not seen before, insert with status 'received'.
 * Returns true if the event is a duplicate.
 */
export async function deduplicateWebhookEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload: unknown
): Promise<boolean> {
  try {
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      logger.info({ eventId, provider }, 'Duplicate webhook event — skipping');
      return true;
    }

    await prisma.webhookEvent.create({
      data: {
        provider,
        eventId,
        eventType,
        payload: payload as object,
        status: 'received',
      },
    });

    return false;
  } catch (error) {
    // If there's a unique constraint violation, it's a race condition — treat as dedup
    if ((error as { code?: string }).code === 'P2002') {
      return true;
    }
    logger.error({ error, eventId }, 'Webhook deduplication error');
    throw error;
  }
}

/**
 * Mark a webhook event as processed or failed.
 */
export async function updateWebhookEventStatus(
  eventId: string,
  status: 'processing' | 'processed' | 'failed',
  errorMessage?: string
): Promise<void> {
  await prisma.webhookEvent.update({
    where: { eventId },
    data: {
      status,
      errorMessage,
      processedAt: status === 'processed' ? new Date() : undefined,
      retryCount: status === 'failed' ? { increment: 1 } : undefined,
    },
  });
}

// ---- Paystack Event Types ----

export const PAYSTACK_EVENTS = {
  CHARGE_SUCCESS: 'charge.success',
  TRANSFER_SUCCESS: 'transfer.success',
  TRANSFER_FAILED: 'transfer.failed',
  REFUND_PROCESSED: 'refund.processed',
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_DISABLE: 'subscription.disable',
  INVOICE_CREATE: 'invoice.create',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
} as const;

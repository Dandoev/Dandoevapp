import { Job } from 'bullmq';
import prisma from '../prisma';
import logger from '../logger';

export async function processPaymentJob(job: Job) {
  const { eventId, eventType, payload } = job.data as {
    eventId: string;
    eventType: string;
    payload: any;
  };

  logger.info({ jobId: job.id, eventId, eventType }, 'Processing payment job');

  try {
    // 1. Handle event types
    switch (eventType) {
      case 'charge.success':
        await handleChargeSuccess(payload);
        break;
      
      case 'transfer.success':
        // Handle disbursements if applicable
        break;

      default:
        logger.warn({ eventType }, 'Unhandled payment event type');
    }

    // 2. Update WebhookEvent status to processed
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { status: 'processed', processedAt: new Date() },
    });

  } catch (error: any) {
    logger.error({ jobId: job.id, error: error.message }, 'Payment job processing failed');
    // Update WebhookEvent status to failed
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { status: 'failed', errorMessage: error.message },
    });
    throw error; // Re-throw to trigger BullMQ retry logic
  }
}

async function handleChargeSuccess(payload: any) {
  const reference = payload.reference;
  const status = payload.status; // 'success'
  const metadata = payload.metadata; // Custom metadata passes orderId/loanId

  if (status !== 'success') return;

  // Use a transaction to ensure atomicity
  await prisma.$transaction(async (tx: any) => {
    // 1. Update PaymentTransaction
    const transaction = await tx.paymentTransaction.update({
      where: { providerRef: reference },
      data: { status: 'SUCCESS', updatedAt: new Date() },
    });

    if (!transaction) {
      logger.error({ reference }, 'PaymentTransaction not found for reference');
      throw new Error(`Transaction ${reference} not found`);
    }

    // 2. Handle business logic based on transaction links
    if (transaction.repaymentId) {
      // It's a loan repayment
      await tx.repayment.update({
        where: { id: transaction.repaymentId },
        data: { status: 'PAID', updatedAt: new Date() },
      });

      logger.info({ repaymentId: transaction.repaymentId }, 'Repayment marked as PAID');
    }

    if (transaction.orderId) {
      // It's an order deposit / full purchase
      await tx.order.update({
        where: { id: transaction.orderId },
        data: { status: 'CONFIRMED', updatedAt: new Date() },
      });

      logger.info({ orderId: transaction.orderId }, 'Order marked as CONFIRMED');
    }
  });
}

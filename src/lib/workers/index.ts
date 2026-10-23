import { createWorker, QUEUE_NAMES } from '../queue';
import { processPaymentJob } from './payment-worker';
import { processNotificationJob } from './notification-worker';
import { processReconciliationJob } from './reconciliation-worker';
import { processSavingsJob } from './savings-worker';
import logger from '../logger';

export function startWorkers() {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Skipping worker initialization in test environment');
    return;
  }

  logger.info('Initializing BullMQ Background Workers...');

  // 1. Payment Processing Worker
  createWorker(
    QUEUE_NAMES.PAYMENT_PROCESSING,
    processPaymentJob,
    5 // Concurrency
  );

  // 2. Notification Worker
  createWorker(
    QUEUE_NAMES.NOTIFICATION,
    processNotificationJob,
    10 // Concurrency
  );

  // 3. Financial Reconciliation Worker
  createWorker(
    QUEUE_NAMES.RECONCILIATION,
    processReconciliationJob,
    2 // Concurrency
  );

  // 4. Daily Savings Collection Worker
  createWorker(
    QUEUE_NAMES.REPAYMENT_REMINDER,
    processSavingsJob,
    5 // Concurrency
  );

  logger.info('All Workers (Payment, Notification, Reconciliation, Savings) started and listening.');
}


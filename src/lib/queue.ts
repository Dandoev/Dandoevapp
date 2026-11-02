// ============================================================
// Queue System — BullMQ Queues & Workers
// ============================================================
import { Queue, Worker, Job, type ConnectionOptions } from 'bullmq';
import logger from './logger';

// ---- Shared Connection ----

function getConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = new URL(url);
  const isTls = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379'),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    connectTimeout: 10000,
    enableReadyCheck: true,
    ...(isTls ? { tls: {} } : {}),
  };
}

// ---- Default Job Options ----

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, // 5s → 25s → 125s
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

// ---- Queue Names ----

export const QUEUE_NAMES = {
  PAYMENT_PROCESSING: 'payment-processing',
  NOTIFICATION: 'notification',
  KYC_VERIFICATION: 'kyc-verification',
  RECONCILIATION: 'reconciliation',
  REPAYMENT_REMINDER: 'repayment-reminder',
} as const;

// ---- Queue Instances ----

const queues: Map<string, Queue> = new Map();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, {
      connection: getConnection(),
      defaultJobOptions,
    }));
  }
  return queues.get(name)!;
}

// ---- Job Producers ----

export async function enqueuePaymentJob(data: {
  eventId: string;
  eventType: string;
  payload: unknown;
}): Promise<string> {
  if (!process.env.REDIS_URL) {
    logger.warn({ eventId: data.eventId }, 'REDIS_URL not set; skipping BullMQ payment job enqueue');
    return `mock-${data.eventId}`;
  }
  const queue = getQueue(QUEUE_NAMES.PAYMENT_PROCESSING);
  const job = await queue.add('process-payment', data, {
    jobId: data.eventId, // Prevents duplicate jobs for same event
  });
  logger.info({ jobId: job.id, eventId: data.eventId }, 'Payment job enqueued');
  return job.id!;
}

import { broadcastNotification } from './realtime';

export async function enqueueNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  channels?: ('email' | 'sms' | 'push' | 'whatsapp')[];
  payload?: Record<string, any>; // Pass extra data
}): Promise<string> {
  // 1. Fire and forget real-time broadcast for active sessions
  broadcastNotification({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    data: data.payload,
  }).catch(err => logger.error({ error: err.message }, 'Real-time broadcast failed in enqueueNotification'));

  // 2. Add to background worker queue for delivery (Email, Push, SMS)
  if (!process.env.REDIS_URL) {
    logger.warn({ userId: data.userId, type: data.type }, 'REDIS_URL not set; skipping BullMQ notification job');
    return `mock-notif-${Date.now()}`;
  }
  const queue = getQueue(QUEUE_NAMES.NOTIFICATION);
  const job = await queue.add('send-notification', data);
  return job.id!;
}

export async function enqueueReconciliation(data: {
  type: 'payment' | 'overdue' | 'savings' | 'stale';
  dateRange?: { from: string; to: string };
}): Promise<string> {
  if (!process.env.REDIS_URL) {
    logger.warn({ type: data.type }, 'REDIS_URL not set; skipping BullMQ reconciliation enqueue');
    return `mock-rec-${Date.now()}`;
  }
  const queue = getQueue(QUEUE_NAMES.RECONCILIATION);
  const job = await queue.add('reconcile', data);
  return job.id!;
}

// ---- Worker Factory ----

export function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<void>,
  concurrency: number = 5
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: getConnection(),
    concurrency,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: queueName }, 'Job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, queue: queueName, error: error.message }, 'Job failed');
    if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
      logger.error(
        { jobId: job.id, queue: queueName },
        'Job moved to dead-letter queue after exhausting retries'
      );
    }
  });

  worker.on('error', (error) => {
    logger.error({ queue: queueName, error: error.message }, 'Worker error');
  });

  return worker;
}

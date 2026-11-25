// ============================================================
// Idempotency Middleware
// - Prevents duplicate mutations by storing responses keyed by
//   client-provided Idempotency-Key header.
// - Keys are scoped per-user and per-endpoint.
// - TTL: 24 hours.
// ============================================================
import prisma from './prisma';
import logger from './logger';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface IdempotencyResult {
  isDuplicate: boolean;
  cachedResponseCode?: number;
  cachedResponseBody?: unknown;
}

/**
 * Check if an idempotency key has already been used for this user + endpoint.
 * Returns the cached response if found and not expired.
 */
export async function checkIdempotencyKey(
  key: string,
  userId: string,
  endpoint: string
): Promise<IdempotencyResult> {
  try {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (existing && existing.userId === userId && existing.endpoint === endpoint) {
      if (new Date() < existing.expiresAt) {
        // Validation and server failures must never become sticky. A user may
        // correct the form and retry with the same client-side key; only a
        // completed mutation should be replayed for duplicate protection.
        if (existing.responseCode >= 400) {
          await prisma.idempotencyKey.delete({ where: { id: existing.id } });
          return { isDuplicate: false };
        }
        return {
          isDuplicate: true,
          cachedResponseCode: existing.responseCode,
          cachedResponseBody: existing.responseBody,
        };
      }
      // Expired — delete it
      await prisma.idempotencyKey.delete({ where: { id: existing.id } });
    }

    return { isDuplicate: false };
  } catch (error) {
    logger.error({ error, key }, 'Idempotency check failed');
    return { isDuplicate: false };
  }
}

/**
 * Store the response for an idempotency key.
 */
export async function storeIdempotencyResponse(
  key: string,
  userId: string,
  endpoint: string,
  responseCode: number,
  responseBody: unknown
): Promise<void> {
  try {
    await prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        userId,
        endpoint,
        responseCode,
        responseBody: responseBody as object,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
      update: {
        responseCode,
        responseBody: responseBody as object,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    });
  } catch (error) {
    logger.error({ error, key }, 'Failed to store idempotency response');
  }
}

/**
 * Clean up expired idempotency keys (call from a scheduled job).
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const result = await prisma.idempotencyKey.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

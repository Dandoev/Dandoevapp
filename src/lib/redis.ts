// ============================================================
// Redis Client Singleton
// ============================================================
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true,
  });
}

/**
 * Redis is an optional production dependency. When REDIS_URL is not set we
 * deliberately do not create a localhost client: that would make every
 * request attempt a connection to an unavailable Redis instance.
 */
export const redis =
  process.env.REDIS_URL
    ? (globalForRedis.redis ?? createRedisClient(process.env.REDIS_URL))
    : undefined;

if (process.env.NODE_ENV !== 'production' && redis) globalForRedis.redis = redis;

export default redis;

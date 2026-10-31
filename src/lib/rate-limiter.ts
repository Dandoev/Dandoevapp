// ============================================================
// Rate Limiter — Redis Sliding Window
// ============================================================
import redis from './redis';
import { NextResponse } from 'next/server';
import logger from './logger';

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

/** Pre-defined rate limit tiers */
export const RATE_LIMITS = {
  /** Auth signin: 15 req / 15 min */
  AUTH_SIGNIN: { maxRequests: 15, windowSeconds: 900 } as RateLimitConfig,
  /** Auth signup by IP: 60 req / 15 min (generous to support shared mobile/NAT gateways) */
  AUTH_SIGNUP: { maxRequests: 60, windowSeconds: 900 } as RateLimitConfig,
  /** Auth signup by individual email: 10 req / 15 min */
  AUTH_SIGNUP_EMAIL: { maxRequests: 10, windowSeconds: 900 } as RateLimitConfig,
  /** Token refresh: 20 req / 15 min */
  AUTH_REFRESH: { maxRequests: 20, windowSeconds: 900 } as RateLimitConfig,
  /** Webhook ingress: 100 req / 1 min */
  WEBHOOK: { maxRequests: 100, windowSeconds: 60 } as RateLimitConfig,
  /** General API (authenticated): 60 req / 1 min */
  API_AUTHENTICATED: { maxRequests: 60, windowSeconds: 60 } as RateLimitConfig,
  /** General API (unauthenticated): 30 req / 1 min */
  API_PUBLIC: { maxRequests: 30, windowSeconds: 60 } as RateLimitConfig,
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

/**
 * Check rate limit for a given identifier using Redis sorted sets (sliding window).
 * @param identifier - Unique key (e.g. IP address, userId, email+IP combo)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed + remaining count
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  try {
    const pipeline = redis.pipeline();
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Count current entries
    pipeline.zcard(key);
    // Add current request
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    // Set TTL
    pipeline.expire(key, config.windowSeconds);

    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    const allowed = currentCount < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);
    const resetAt = Math.ceil((now + config.windowSeconds * 1000) / 1000);

    if (!allowed) {
      logger.warn({ identifier, currentCount, limit: config.maxRequests }, 'Rate limit exceeded');
    }

    return { allowed, remaining, resetAt };
  } catch (error) {
    // If Redis is down, fail open (allow the request)
    logger.error({ error, identifier }, 'Rate limiter Redis error — failing open');
    return { allowed: true, remaining: config.maxRequests, resetAt: 0 };
  }
}

/**
 * Create a 429 Too Many Requests response with standard headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toString(),
        'Retry-After': Math.max(1, result.resetAt - Math.floor(Date.now() / 1000)).toString(),
      },
    }
  );
}

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature, hasRequiredScopes } from '../api-security';
import { isDemoAllowed } from '../env';

describe('Payment & API Security', () => {
  const secretKey = 'sk_test_mock_secret_key_12345';
  const payload = JSON.stringify({
    event: 'charge.success',
    data: {
      reference: 'ref_123456789',
      amount: 150000000,
      currency: 'NGN',
    },
  });

  it('validates a correct HMAC-SHA512 webhook signature', () => {
    const validSignature = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    expect(verifyWebhookSignature(payload, validSignature, secretKey)).toBe(true);
  });

  it('rejects tampered webhook payloads', () => {
    const validSignature = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    const tamperedPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'ref_123456789',
        amount: 100, // attacker attempts to lower amount
        currency: 'NGN',
      },
    });

    expect(verifyWebhookSignature(tamperedPayload, validSignature, secretKey)).toBe(false);
  });

  it('rejects signature when using incorrect secret', () => {
    const validSignature = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    expect(verifyWebhookSignature(payload, validSignature, 'wrong_secret_key')).toBe(false);
  });

  it('evaluates fine-grained OAuth token scopes correctly', () => {
    // Admin with wildcard or admin:all satisfies any requirement
    expect(hasRequiredScopes(['*'], ['loans:approve'])).toBe(true);
    expect(hasRequiredScopes(['admin:all'], ['payments:verify', 'compliance:review'])).toBe(true);

    // Matching exact scopes
    expect(hasRequiredScopes(['loans:read', 'loans:apply'], ['loans:read'])).toBe(true);
    expect(hasRequiredScopes(['loans:read'], ['loans:read', 'loans:apply'])).toBe(false);
  });

  it('enforces demo mode restrictions based on NODE_ENV', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      // In production, isDemoAllowed must return false
      (process.env as any).NODE_ENV = 'production';
      expect(isDemoAllowed()).toBe(false);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });
});

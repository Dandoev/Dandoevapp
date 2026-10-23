// ============================================================
// DandoEv — API Security & Gateway Utilities
// - Security Headers Middleware Helper
// - OAuth 2.0 / Fine-Grained Token Scope Verification
// - Timing-safe HMAC Webhook Verification
// ============================================================
import crypto from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Standard Security Headers per OWASP & Banking Standards.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.paystack.co https://*.supabase.co;",
};

/**
 * Applies security headers to an outgoing NextResponse.
 */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.headers.set(key, value);
  });
  return res;
}

/**
 * Verify cryptographic webhook signature using timingSafeEqual to avoid timing attacks.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string
): boolean {
  if (!signatureHeader || !secretKey) return false;

  try {
    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    const computedBuffer = Buffer.from(computedHash, 'hex');
    const headerBuffer = Buffer.from(signatureHeader, 'hex');

    if (computedBuffer.length !== headerBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, headerBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Token Scopes for OAuth 2.0 / Fine-grained API authorization
 */
export type ApiScope =
  | 'user:read'
  | 'user:write'
  | 'loans:read'
  | 'loans:apply'
  | 'loans:approve'
  | 'payments:initiate'
  | 'payments:verify'
  | 'compliance:review'
  | 'admin:all';

/**
 * Checks if granted scopes satisfy required scopes.
 */
export function hasRequiredScopes(grantedScopes: string[] = [], requiredScopes: ApiScope[]): boolean {
  if (grantedScopes.includes('admin:all') || grantedScopes.includes('*')) {
    return true;
  }
  return requiredScopes.every((scope) => grantedScopes.includes(scope));
}

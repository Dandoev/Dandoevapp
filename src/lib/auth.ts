// ============================================================
// Authentication Utilities (Supabase Integration)
// - Token verification via Supabase SDK
// - Role-based access control metadata
// ============================================================
import { supabaseAdmin } from './supabase';
import { isDemoAllowed } from './env';

export interface JwtPayload {
  sub: string;      // user ID (Supabase UUID)
  email: string;
  role: string;
}

/**
 * Verify a Supabase access token (JWT).
 * Uses the Supabase SDK to validate the session and return user metadata.
 */
export async function verifySupabaseToken(token: string): Promise<JwtPayload | null> {
  // Demo Presentation Fallback — strictly gated for non-production
  if (isDemoAllowed()) {
    if (token === 'demo-token-customer' || token.startsWith('demo-token-customer')) {
      return {
        sub: 'demo-customer-id',
        email: 'solomon.dunu@demo.com',
        role: 'customer',
      };
    }

    if (token === 'demo-token-admin' || token.startsWith('demo-token-admin')) {
      return {
        sub: 'demo-admin-id',
        email: 'admin@dandoev.com',
        role: 'super_admin',
      };
    }
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) return null;

    return {
      sub: user.id,
      email: user.email || '',
      role: (user.app_metadata?.role as string) || 'customer',
    };
  } catch {
    return null;
  }
}

/**
 * Extract bearer token from Authorization header.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Sign out / Revoke session (Server Side)
 */
export async function signOut(token: string): Promise<void> {
  await supabaseAdmin.auth.admin.signOut(token);
}

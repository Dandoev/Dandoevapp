// ============================================================
// Next.js Edge Proxy (replacing middleware)
// - Security headers on all responses
// - Auth guards & Route protection
// - Request ID injection
// ============================================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isDemoAllowed } from './lib/env';

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  const allowedWebOrigins = (process.env.MOBILE_WEB_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
  const isLocalWebOrigin = origin ? /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) : false;
  const allowedOrigin = origin && (isLocalWebOrigin || allowedWebOrigins.includes(origin)) ? origin : null;

  if (isApi && request.method === 'OPTIONS' && origin) {
    if (!allowedOrigin) return new NextResponse(null, { status: 403 });
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    preflight.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Idempotency-Key');
    preflight.headers.set('Access-Control-Max-Age', '600');
    preflight.headers.set('Vary', 'Origin');
    return preflight;
  }

  // ---- Read session token ----
  const token =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  // ---- No marketing landing page: "/" opens the admin dashboard login ----
  // Signed-in staff go straight to /admin (admin role is verified below).
  if (pathname === '/') {
    return NextResponse.redirect(new URL(token ? '/admin' : '/login', request.url));
  }

  // Customer journeys run in the mobile app. Keep the web surface staff-only;
  // API routes stay available to the mobile client.
  const mobileOnlyPaths = ['/dashboard', '/auth', '/bikes', '/accessories', '/checkout', '/bnpl'];
  if (mobileOnlyPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.redirect(new URL(token ? '/admin' : '/login', request.url));
  }

  // ---- Route Protection Logic ----
  const ADMIN_ROUTES = ['/admin'];

  const isAdmin = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  if (isAdmin && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ---- Admin Role Verification ----
  if (isAdmin && token) {
    // Demo Token Bypass — only allowed in development/demo mode, NEVER in production
    if (isDemoAllowed() && (token === 'demo-token-admin' || token.startsWith('demo-token-admin'))) {
      // Allow demo admin directly for local development demo
    } else {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) throw new Error('Invalid session');

        const role = user.app_metadata?.role as string;
        const adminRoles = [
          'super_admin',
          'finance_admin',
          'compliance_officer',
          'operations_admin',
          'credit_underwriter',
          'fleet_manager',
          'collections_agent',
        ];

        if (!adminRoles.includes(role)) {
          return NextResponse.redirect(new URL('/login', request.url));
        }
      } catch {
        const url = new URL('/login', request.url);
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-request-id': requestId,
      }),
    },
  });

  if (isApi && allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Vary', 'Origin');
  }

  // ---- Security Headers ----
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.withmono.com https://*.mono.co https://js.paystack.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://connect.withmono.com https://*.mono.co https://checkout.paystack.com; connect-src 'self' https://api.mono.co https://api.withmono.com https://*.mono.co https://api.paystack.co https://*.supabase.co https://*.sentry.io;"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(self)'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

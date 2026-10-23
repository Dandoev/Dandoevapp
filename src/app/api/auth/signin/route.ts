import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validate';
import { signinSchema } from '@/lib/schemas';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/api-handler';
import { supabaseAdmin } from '@/lib/supabase';
import { isDemoAllowed } from '@/lib/env';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const log = logger.child({ requestId, route: 'auth/signin' });

  try {
    // ---- Input Validation ----
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateRequest(signinSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data!;

    // ---- Rate Limiting (Bypassed for demo users only in dev/demo environments) ----
    const demoAllowed = isDemoAllowed();
    const isDemoAccount =
      demoAllowed &&
      (email.toLowerCase().endsWith('@demo.com') ||
        email.toLowerCase() === 'admin@dandoev.com' ||
        email.toLowerCase() === 'finance@dandoev.com' ||
        email.toLowerCase() === 'ops@dandoev.com');

    if (!isDemoAccount) {
      const ip = getClientIp(req);
      const rlResult = await checkRateLimit(`signin:${ip}:${email}`, RATE_LIMITS.AUTH_SIGNIN);
      if (!rlResult.allowed) {
        return rateLimitResponse(rlResult);
      }
    }

    // ---- Authenticate via Supabase with Demo Presentation Fallback ----
    let authUser: any = null;
    let authSession: any = null;

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
      if (!authError && authData.user && authData.session) {
        authUser = authData.user;
        authSession = authData.session;
      }
    } catch {
      // Supabase unavailable, proceed to demo checks
    }

    // Demo Presentation Account Fallback (allowed in dev/demo mode only)
    if (!authUser && demoAllowed) {
      const lowerEmail = email.toLowerCase();
      if (
        lowerEmail === 'admin@dandoev.com' ||
        lowerEmail === 'finance@dandoev.com' ||
        lowerEmail === 'ops@dandoev.com'
      ) {
        authUser = {
          id: 'demo-admin-id',
          email: lowerEmail,
          user_metadata: { firstName: 'System', lastName: 'Admin' },
          app_metadata: { role: 'super_admin' },
        };
        authSession = {
          access_token: 'demo-token-admin',
          refresh_token: 'demo-refresh-admin',
          expires_in: 3600 * 24,
        };
      } else if (
        lowerEmail === 'solomon.dunu@demo.com' ||
        lowerEmail === 'babatunde.adeleke@demo.com' ||
        lowerEmail === 'amina.bello@demo.com' ||
        lowerEmail === 'fatima.yusuf@demo.com' ||
        lowerEmail === 'chinedu.eze@demo.com' ||
        lowerEmail.endsWith('@demo.com')
      ) {
        const nameParts = lowerEmail.split('@')[0].split('.');
        const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Demo';
        const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'Buyer';

        authUser = {
          id: 'demo-customer-id',
          email: lowerEmail,
          user_metadata: { firstName, lastName },
          app_metadata: { role: 'customer' },
        };
        authSession = {
          access_token: 'demo-token-customer',
          refresh_token: 'demo-refresh-customer',
          expires_in: 3600 * 24,
        };
      }
    }

    if (!authUser || !authSession) {
      log.warn({ email }, 'Invalid credentials attempt');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login in local DB if connected
    try {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { lastLoginAt: new Date() },
      });
    } catch {
      // Ignored if using demo in-memory ID
    }

    log.info({ userId: authUser.id }, 'User signed in successfully');

    const response = NextResponse.json({
      success: true,
      message: 'Signed in successfully',
      user: {
        id: authUser.id,
        email: authUser.email,
        firstName: authUser.user_metadata?.firstName,
        lastName: authUser.user_metadata?.lastName,
        role: authUser.app_metadata?.role || 'customer',
      },
      accessToken: authSession.access_token,
    });

    const isProd = process.env.NODE_ENV === 'production';

    // Set session cookies
    response.cookies.set({
      name: 'token',
      value: authSession.access_token,
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: authSession.expires_in || 3600 * 24,
    });

    response.cookies.set({
      name: 'sb-access-token',
      value: authSession.access_token,
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: authSession.expires_in || 3600 * 24,
    });

    if (authSession.refresh_token) {
      response.cookies.set({
        name: 'refreshToken',
        value: authSession.refresh_token,
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error: any) {
    log.error({ error: error.message }, 'Signin error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

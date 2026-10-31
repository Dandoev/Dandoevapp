import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, sanitizeObject } from '@/lib/validate';
import { signupSchema } from '@/lib/schemas';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/api-handler';
import { supabaseAdmin } from '@/lib/supabase';
import { isDemoAllowed } from '@/lib/env';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const log = logger.child({ requestId, route: 'auth/signup' });

  try {
    const ip = getClientIp(req);
    // ---- Input Validation ----
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateRequest(signupSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const data = sanitizeObject(validation.data!);
    const cleanEmail = data.email.toLowerCase().trim();

    // ---- Rate Limiting (Relaxed for shared mobile/NAT proxies, bypassed in test/demo) ----
    const demoAllowed = isDemoAllowed();
    const isDemoOrReviewer =
      cleanEmail.endsWith('@demo.com') ||
      cleanEmail.includes('reviewer') ||
      cleanEmail.includes('test') ||
      demoAllowed;

    if (!isDemoOrReviewer) {
      // 1. IP rate limit (generous 60 req / 15 min to prevent blocking shared cellular mobile networks)
      const ipKey = ip === 'unknown' ? `signup-ip:${cleanEmail}` : `signup-ip:${ip}`;
      const ipAttempt = await checkRateLimit(ipKey, RATE_LIMITS.AUTH_SIGNUP);
      if (!ipAttempt.allowed) return rateLimitResponse(ipAttempt);

      // 2. Individual email rate limit (10 req / 15 min)
      const emailAttempt = await checkRateLimit(`signup-email:${cleanEmail}`, RATE_LIMITS.AUTH_SIGNUP_EMAIL);
      if (!emailAttempt.allowed) return rateLimitResponse(emailAttempt);
    }

    // ---- Create User in Supabase Auth ----
    const authData = await prisma.$transaction(async (tx) => {
        // 1. Create in Supabase 
        const { data: sData, error: sError } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: data.password,
            email_confirm: true,
            user_metadata: {
                firstName: data.firstName,
                lastName: data.lastName,
                role: 'customer'
            }
        });

        if (sError) throw sError;

        // 2. Create in our local User table for profile data
        const user = await tx.user.create({
            data: {
                id: sData.user.id, // Use the same UUID from Supabase
                email: cleanEmail,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone || null,
                passwordHash: 'SUPABASE_AUTH', 
                role: 'customer',
                customerStatus: 'registered',
            },
        });

        return { user, authUser: sData.user };
    });

    log.info({ userId: authData.user.id }, 'User created successfully with Supabase Auth');

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: authData.user.firstName,
        lastName: authData.user.lastName,
        role: authData.user.role,
      }
    });

  } catch (error: any) {
    log.error({ error: error.message }, 'Signup error');
    if (
      error.message?.toLowerCase().includes('already') ||
      error.message?.toLowerCase().includes('registered') ||
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

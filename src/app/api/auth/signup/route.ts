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
    const isDemoOrReviewer = isDemoAllowed() && cleanEmail.endsWith('@demo.com');

    if (!isDemoOrReviewer) {
      // 1. IP rate limit (generous 60 req / 15 min to prevent blocking shared cellular mobile networks)
      const ipKey = ip === 'unknown' ? `signup-ip:${cleanEmail}` : `signup-ip:${ip}`;
      const ipAttempt = await checkRateLimit(ipKey, RATE_LIMITS.AUTH_SIGNUP);
      if (!ipAttempt.allowed) return rateLimitResponse(ipAttempt);

      // 2. Individual email rate limit (10 req / 15 min)
      const emailAttempt = await checkRateLimit(`signup-email:${cleanEmail}`, RATE_LIMITS.AUTH_SIGNUP_EMAIL);
      if (!emailAttempt.allowed) return rateLimitResponse(emailAttempt);
    }

    // ---- Check for Existing or Orphaned User in Prisma DB ----
    const existingPrismaUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        loans: { where: { status: { in: ['active', 'approved', 'under_review', 'pending'] } } },
      },
    });

    if (existingPrismaUser) {
      // Check if user still exists in Supabase Auth
      let supaAuthUser = null;
      try {
        const { data: supaUserRes } = await supabaseAdmin.auth.admin.getUserById(existingPrismaUser.id);
        supaAuthUser = supaUserRes?.user;
      } catch {}

      if (supaAuthUser) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please sign in instead.' },
          { status: 409 }
        );
      }

      // User was deleted from Supabase Auth directly (orphaned record in Prisma)
      if (existingPrismaUser.loans.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email address has an active lease. Please contact support.' },
          { status: 409 }
        );
      }

      // Safely purge orphaned record so fresh signup can proceed seamlessly
      log.warn({ userId: existingPrismaUser.id, email: cleanEmail }, 'Purging orphaned DB user with no Supabase Auth counterpart');
      await prisma.auditLog.deleteMany({ where: { userId: existingPrismaUser.id } }).catch(() => {});
      await prisma.wallet.deleteMany({ where: { userId: existingPrismaUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: existingPrismaUser.id } });
    }

    // ---- Create User in Supabase Auth ----
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

    if (sError || !sData.user) throw sError || new Error('Supabase did not create the user');

    let user;
    try {
        user = await prisma.user.create({
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

    } catch (databaseError) {
        await supabaseAdmin.auth.admin.deleteUser(sData.user.id).catch((cleanupError) => {
          log.error({ cleanupError, authUserId: sData.user.id }, 'Could not roll back incomplete signup');
        });
        throw databaseError;
    }
    const authData = { user };

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

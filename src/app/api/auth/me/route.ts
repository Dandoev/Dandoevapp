import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseToken, extractBearerToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { isDemoAllowed } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractBearerToken(authHeader) || req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifySupabaseToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        customerStatus: true,
        kycStatus: true,
        profileImageUrl: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      // Auto-provision from Supabase Auth if the user was authenticated directly through Supabase
      try {
        const { data: sData } = await supabaseAdmin.auth.admin.getUserById(decoded.sub);
        if (sData?.user) {
          const sUser = sData.user;
          const meta = sUser.user_metadata || {};
          user = await prisma.user.create({
            data: {
              id: sUser.id,
              email: sUser.email || decoded.email || `${sUser.id}@user.local`,
              firstName: meta.firstName || 'Customer',
              lastName: meta.lastName || 'User',
              phone: meta.phone || null,
              passwordHash: 'SUPABASE_AUTH',
              role: (meta.role as any) || decoded.role || 'customer',
              customerStatus: 'registered',
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              customerStatus: true,
              kycStatus: true,
              profileImageUrl: true,
              isEmailVerified: true,
              isPhoneVerified: true,
              createdAt: true,
              lastLoginAt: true,
            },
          });
        }
      } catch {
        // Fall through to demo checks
      }
    }

    if (!user) {
      if (isDemoAllowed() && decoded.sub === 'demo-admin-id') {
        return NextResponse.json({
          user: {
            id: decoded.sub,
            email: decoded.email,
            firstName: 'Local',
            lastName: 'Administrator',
            role: decoded.role,
          },
        });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: 'Authentication internal error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseToken, extractBearerToken } from '@/lib/auth';
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

    const user = await prisma.user.findUnique({
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

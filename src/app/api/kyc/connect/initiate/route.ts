import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import { initiateMonoConnect } from '@/lib/mono';

export const POST = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const user = await prisma.user.findUnique({ where: { id: ctx.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const reference = `CONNECT-${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const redirectUrl = typeof body.redirectUrl === 'string' && body.redirectUrl.startsWith('dandoev://')
    ? body.redirectUrl
    : 'dandoev://mono-connect-callback';
  try {
    const session = await initiateMonoConnect({ name: `${user.firstName} ${user.lastName}`, email: user.email, reference, redirectUrl });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'MONO_CONNECT_STARTED', resource: 'kyc', resourceId: reference, details: JSON.stringify({ reference }) } });
    return NextResponse.json({ success: true, data: { ...session, reference } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start bank connection' }, { status: 502 });
  }
});

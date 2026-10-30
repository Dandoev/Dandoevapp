import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import { initiateMonoProve } from '@/lib/mono';

export const POST = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const user = await prisma.user.findUnique({ where: { id: ctx.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const reference = `PROVE-${user.id.slice(0, 8)}-${Date.now().toString(36)}`.slice(0, 24);
  try {
    const session = await initiateMonoProve({ reference, redirectUrl: 'dandoev://kyc-callback', customer: { name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone || undefined, address: user.address || undefined } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'MONO_PROVE_STARTED', resource: 'kyc', resourceId: reference, details: JSON.stringify({ provider: 'mono_prove', sessionId: session.id }) } });
    return NextResponse.json({ success: true, data: session });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start facial verification' }, { status: 502 }); }
});

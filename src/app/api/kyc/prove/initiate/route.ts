import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import { initiateMonoProve, MonoFeatureUnavailableError } from '@/lib/mono';

export const POST = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const user = await prisma.user.findUnique({ where: { id: ctx.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const redirectUrl = body?.redirectUrl || 'dandoev://kyc-callback';
  const reference = (body?.reference || `PROVE-${user.id.slice(0, 8)}-${Date.now().toString(36)}`).slice(0, 24);

  const bvn = body?.bvn || user.bvn || undefined;
  const nin = body?.nin || user.ninNumber || undefined;
  const identity = bvn
    ? { number: String(bvn), type: 'bvn' as const }
    : nin
    ? { number: String(nin), type: 'nin' as const }
    : undefined;

  try {
    const session = await initiateMonoProve({
      reference,
      redirectUrl,
      customer: {
        name: `${user.firstName} ${user.lastName}`.trim() || 'DandoEv Customer',
        email: user.email,
        phone: user.phone || undefined,
        address: user.address || undefined,
        ...(identity ? { identity } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'MONO_PROVE_STARTED',
        resource: 'kyc',
        resourceId: reference,
        details: JSON.stringify({
          provider: 'mono_prove',
          sessionId: session.id,
          reference: session.reference,
          url: session.url,
        }),
      },
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    if (error instanceof MonoFeatureUnavailableError) {
      return NextResponse.json(
        {
          error:
            'Facial verification is unavailable because Mono Prove is not enabled for DandoEv yet. Please contact DandoEv support.',
          code: 'MONO_FEATURE_NOT_ENABLED',
          product: 'prove',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start facial verification' },
      { status: 502 }
    );
  }
});

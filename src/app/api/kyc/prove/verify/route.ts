import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import { fetchMonoProveCustomer } from '@/lib/mono';
import { isDemoAllowed } from '@/lib/env';
import { encryptField } from '@/lib/encryption';

function verifiedIdentities(result: { customer?: any; verification?: any }) {
  const customer = result.customer || {};
  const verification = result.verification || {};
  const bvn = customer.bvn || verification.bvn?.number || verification.bvn?.data?.bvn;
  const nin = customer.nin || verification.nin?.number || verification.nin?.data?.nin;
  return {
    bvn: /^\d{11}$/.test(String(bvn || '')) ? String(bvn) : null,
    nin: /^\d{11}$/.test(String(nin || '')) ? String(nin) : null,
  };
}

async function handleVerification(req: NextRequest, ctx: ApiContext) {
  const user = await prisma.user.findUnique({ where: { id: ctx.user.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // `kycStatus` is shared with Lookup/Connect and cannot prove that facial
  // liveness was completed. Check only an explicit Mono Prove session/result.
  const latestFaceResult = await prisma.auditLog.findFirst({
    where: { userId: user.id, action: 'MONO_PROVE_FACE_VERIFIED' },
    orderBy: { createdAt: 'desc' },
  });
  if (latestFaceResult) {
    return NextResponse.json({
      success: true,
      verified: true,
      status: 'verified',
      message: 'Identity already verified with Mono Prove',
    });
  }

  // Check latest Mono Prove session
  const latestInitiation = await prisma.auditLog.findFirst({
    where: { userId: user.id, action: 'MONO_PROVE_STARTED' },
    orderBy: { createdAt: 'desc' },
  });

  if (latestInitiation?.resourceId) {
    try {
      const proveResult = await fetchMonoProveCustomer(latestInitiation.resourceId);
      if (proveResult?.verified) {
        const identity = verifiedIdentities(proveResult);
        await prisma.user.update({
          where: { id: user.id },
          data: { kycStatus: 'verified', ...(identity.bvn ? { bvn: encryptField(identity.bvn) } : {}), ...(identity.nin ? { ninNumber: encryptField(identity.nin) } : {}) },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'MONO_PROVE_FACE_VERIFIED',
            resource: 'kyc',
            resourceId: latestInitiation.resourceId,
            details: JSON.stringify({
              provider: 'mono_prove',
              verifiedVia: 'direct_status_sync',
              bvnAvailable: Boolean(identity.bvn),
              ninAvailable: Boolean(identity.nin),
            }),
          },
        });

        return NextResponse.json({
          success: true,
          verified: true,
          status: 'verified',
          message: 'Identity verified successfully with Mono Prove',
          data: proveResult,
        });
      }

      if (proveResult?.status === 'failed') {
        await prisma.user.update({
          where: { id: user.id },
          data: { kycStatus: 'failed' },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'MONO_PROVE_FACE_REJECTED',
            resource: 'kyc',
            resourceId: latestInitiation.resourceId,
            details: JSON.stringify({
              provider: 'mono_prove',
              verifiedVia: 'direct_status_sync',
              data: proveResult,
            }),
          },
        });

        return NextResponse.json({
          success: true,
          verified: false,
          status: 'failed',
          message: 'Mono Prove verification failed. Please try again.',
        });
      }
    } catch (err: any) {
      // If fetching from Mono threw an error, fallback to checking audit log
    }
  }

  // 3. Fallback demo check if demo mode allowed
  if (isDemoAllowed() && (!latestInitiation || latestInitiation.resourceId?.startsWith('test-') || latestInitiation.resourceId?.startsWith('PROVE-'))) {
    // If in demo mode and user requested verification
    const body = await req.json().catch(() => ({}));
    if (body?.forceDemo || isDemoAllowed()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { kycStatus: 'verified' },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'MONO_PROVE_FACE_VERIFIED',
          resource: 'kyc',
          resourceId: latestInitiation?.resourceId || 'demo',
          details: JSON.stringify({ provider: 'mono_prove', demo: true }),
        },
      });

      return NextResponse.json({
        success: true,
        verified: true,
        status: 'verified',
        message: 'Identity verified in demo mode',
      });
    }
  }

  return NextResponse.json({
    success: true,
    verified: false,
    status: user.kycStatus || 'pending',
    message: 'Verification is still in progress with Mono. Please wait a moment and refresh.',
  });
}

export const POST = withAuth(handleVerification);
export const GET = withAuth(handleVerification);

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIp, type ApiContext } from '@/lib/api-handler';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limiter';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/kyc/initiate
 * Initiates an Identity Verification session with a fictional 3rd party (e.g., SmileID / Onfido).
 */
export const POST = withAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const log = logger.child({ requestId: ctx.requestId, route: 'kyc/initiate' });

    try {
      const { bvn, nin, documents } = await req.json();

      // ---- Rate Limiting ----
      const ip = getClientIp(req);
      const rlResult = await checkRateLimit(`kyc-initiate:${ip}`, RATE_LIMITS.API_AUTHENTICATED);
      if (!rlResult.allowed) {
        return rateLimitResponse(rlResult);
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.user.sub },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.kycStatus === 'verified') {
        return NextResponse.json({ error: 'User is already verified' }, { status: 400 });
      }

      // 1. Update User with Identification numbers
      await prisma.user.update({
        where: { id: ctx.user.sub },
        data: {
          bvn: bvn || user.bvn,
          kycStatus: 'pending',
          // Optional: NIN can be stored in a separate profile table or extended user table
        }
      });

      // 2. Create KYC Documents
      if (documents && Array.isArray(documents)) {
        await Promise.all(documents.map((doc: any) => 
          prisma.kycDocument.create({
            data: {
              userId: ctx.user.sub,
              type: doc.type || 'national_id',
              fileUrl: doc.fileUrl,
              verificationStatus: 'pending',
              provider: 'SupabaseStorage'
            }
          })
        ));
      }

      log.info({ userId: ctx.user.sub }, 'KYC data and documents stored');

      return NextResponse.json({
        success: true,
        message: 'KYC Verification data submitted successfully',
      });

    } catch (error) {
      log.error({ error }, 'KYC initiate failed');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

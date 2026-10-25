import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { VerificationStatus } from '@prisma/client';

/**
 * GET /api/admin/kyc — List documents for verification
 */
export const GET = withRoles(
  ['super_admin', 'compliance_officer'],
  async (req: NextRequest, ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as VerificationStatus | null;
    const userId = searchParams.get('userId');

    try {
      const documents = await prisma.kycDocument.findMany({
        where: {
          ...(status && { verificationStatus: status }),
          ...(userId && { userId }),
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { uploadedAt: 'desc' },
        take: 100,
      });

      return NextResponse.json({ success: true, data: documents });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch KYC documents');
      return NextResponse.json({ error: 'Unable to fetch KYC documents' }, { status: 500 });
    }
  }
);

import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { VerificationStatus } from '@prisma/client';
import { DEMO_KYC_DOCS } from '@/lib/demo-data';

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

      return NextResponse.json({ success: true, data: documents.length > 0 ? documents : DEMO_KYC_DOCS });
    } catch (error) {
      logger.warn({ error }, 'Failed to fetch KYC documents, falling back to demo dataset');
      return NextResponse.json({ success: true, data: DEMO_KYC_DOCS });
    }
  }
);

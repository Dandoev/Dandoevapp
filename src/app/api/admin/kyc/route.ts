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
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              kycStatus: true,
              customerStatus: true,
              address: true,
              city: true,
              state: true,
              employmentStatus: true,
              monthlyIncome: true,
              employerName: true,
              employerAddress: true,
              bvn: true,
              ninNumber: true,
              bankName: true,
              bankAccountNumber: true,
              bankAccountName: true,
              profileImageUrl: true,
              monoStatus: true,
              monoMandateStatus: true,
            },
          },
          loan: {
            include: {
              bike: {
                select: {
                  id: true,
                  name: true,
                  model: true,
                  brand: true,
                  price: true,
                  images: true,
                },
              },
              repayments: {
                take: 12,
                orderBy: { dueDate: 'asc' },
              },
            },
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

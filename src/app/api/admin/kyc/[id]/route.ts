import { NextRequest, NextResponse } from 'next/server';
import { withRoles, withValidation, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';


const kycUpdateSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  rejectionReason: z.string().optional(),
});

type Context = ApiContext & { validatedBody: z.infer<typeof kycUpdateSchema> };

/**
 * PATCH /api/admin/kyc/[id] — Approve or reject a document
 */
export const PATCH = withRoles(
  ['super_admin', 'compliance_officer'],
  withValidation(kycUpdateSchema, async (req: NextRequest, ctx: Context) => {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop()!;
    const { status, rejectionReason } = ctx.validatedBody;

    try {
      const document = await prisma.kycDocument.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const updatedDoc = await prisma.kycDocument.update({
        where: { id },
        data: {
          verificationStatus: status,
          verifiedBy: ctx.user.sub,
          verifiedAt: status === 'verified' ? new Date() : null,
          // We could add rejection reason to the document or audit log
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: ctx.user.sub,
          action: `KYC_DOC_${status.toUpperCase()}`,
          resource: 'kyc_document',
          resourceId: document.id,
          details: `Document ${document.type} for user ${document.userId} ${status}. ${rejectionReason || ''}`,
        },
      });

      // Check if user should be fully verified
      if (status === 'verified') {
        const allDocs = await prisma.kycDocument.findMany({
          where: { userId: document.userId },
        });

        const verifiedIds = allDocs.filter(d => 
          d.verificationStatus === 'verified' && 
          ['national_id', 'passport', 'drivers_license'].includes(d.type)
        );
        const verifiedSelfie = allDocs.filter(d => 
          d.verificationStatus === 'verified' && 
          d.type === 'selfie'
        );

        if (verifiedIds.length > 0 && verifiedSelfie.length > 0) {
          // All mandatory documents verified
          await prisma.user.update({
            where: { id: document.userId },
            data: { kycStatus: 'verified' },
          });

          await prisma.auditLog.create({
            data: {
              userId: ctx.user.sub,
              action: 'USER_KYC_VERIFIED',
              resource: 'user',
              resourceId: document.userId,
              details: `User ${document.userId} fully KYC verified following document approval.`,
            },
          });
        }
      } else if (status === 'rejected') {
        // Optionally mark user status as failed or just leave as pending
        await prisma.user.update({
          where: { id: document.userId },
          data: { kycStatus: 'failed' },
        });
      }

      return NextResponse.json({ success: true, data: updatedDoc });
    } catch (error) {
      logger.error({ error }, 'Failed to update KYC document');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })
);

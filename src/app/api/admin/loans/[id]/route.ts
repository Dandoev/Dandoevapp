import { NextRequest, NextResponse } from 'next/server';
import { withRoles, withValidation, type ApiContext } from '@/lib/api-handler';
import { loanActionSchema, type LoanActionInput } from '@/lib/schemas';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * GET /api/admin/loans/[id] — Get single loan details
 */
export const GET = withRoles(
  ['super_admin', 'credit_underwriter', 'finance_admin', 'compliance_officer'],
  async (req: NextRequest, ctx: ApiContext) => {
    const id = req.nextUrl.pathname.split('/').pop()!;
    const loan = await dbService.getLoanById(id);

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: loan });
  }
);

/**
 * PATCH /api/admin/loans/[id] — 1-Click Asset Allocation & Credit Approval or Rejection
 */
export const PATCH = withRoles(
  ['super_admin', 'credit_underwriter', 'finance_admin'],
  withValidation(
    loanActionSchema,
    async (req: NextRequest, ctx: ApiContext & { validatedBody: LoanActionInput }) => {
      const id = req.nextUrl.pathname.split('/').pop()!;
      const {
        action,
        adminNotes,
        rejectionReason,
        bikeSerialNumber,
        chassisNumber,
        batteryNumber1,
        batteryNumber2,
        chargerNumber,
      } = ctx.validatedBody;

      try {
        const existingLoan = await dbService.getLoanById(id);
        if (!existingLoan) {
          return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        const staffIdentity = ctx.user.email || ctx.user.sub;

        if (action === 'approve') {
          const updated = await dbService.allocateAndApproveLoan(id, {
            bikeSerialNumber,
            chassisNumber,
            batteryNumber1,
            batteryNumber2,
            chargerNumber,
            adminNotes,
            approvedBy: staffIdentity,
          });

          return NextResponse.json({
            success: true,
            message: 'Loan approved and physical hardware asset allocated successfully',
            data: updated,
          });
        } else {
          const updated = await dbService.rejectLoan(
            id,
            rejectionReason || 'Adverse action based on underwriting threshold',
            staffIdentity
          );

          return NextResponse.json({
            success: true,
            message: 'Loan application rejected',
            data: updated,
          });
        }
      } catch (error) {
        logger.error({ error }, 'Failed to update loan state');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);

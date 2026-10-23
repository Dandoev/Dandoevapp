import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/loans/[id]/repayments
 * Returns repayment schedule installments for a specific loan.
 */
export const GET = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const log = logger.child({ requestId: ctx.requestId, route: 'loans/repayments' });
  const pathParts = req.nextUrl.pathname.split('/');
  const loanId = pathParts[pathParts.indexOf('loans') + 1];

  if (!loanId) {
    return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
  }

  const isAdmin = ['super_admin', 'finance_admin', 'credit_underwriter', 'operations_admin'].includes(
    ctx.user.role
  );

  try {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: { userId: true },
    });

    if (loan && !isAdmin && loan.userId !== ctx.user.sub) {
      return NextResponse.json({ error: 'Unauthorized to view this repayment schedule' }, { status: 403 });
    }

    const repayments = await prisma.repayment.findMany({
      where: { loanId },
      orderBy: { installmentNumber: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: repayments,
    });
  } catch (error: any) {
    log.error({ error: error.message, loanId }, 'Failed to fetch loan repayments');
    return NextResponse.json({ error: 'Failed to fetch repayment schedule' }, { status: 500 });
  }
});

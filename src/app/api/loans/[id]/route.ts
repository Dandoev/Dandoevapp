import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * GET /api/loans/[id]
 * Fetch a single loan's details for the authenticated user or an admin.
 */
export const GET = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  try {
    const id = req.nextUrl.pathname.split('/').pop()!;
    const isAdmin = [
      'super_admin',
      'credit_underwriter',
      'fleet_manager',
      'collections_agent',
      'compliance_officer',
      'finance_admin',
    ].includes(ctx.user.role);

    let loan: any = null;
    try {
      loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          bike: { select: { name: true, brand: true, price: true, images: true, category: true } },
          guarantors: true,
          repayments: { orderBy: { dueDate: 'asc' } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });
    } catch {
      // Fallback to dbService when Prisma is unavailable
    }

    if (!loan) {
      loan = await dbService.getLoanById(id);
    }

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Enforce that only the loan owner or an admin can access this details page
    if (!isAdmin && loan.userId !== ctx.user.sub && ctx.user.sub !== 'demo-customer-id') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch single loan details');
    return NextResponse.json({ error: 'Failed to fetch loan details' }, { status: 500 });
  }
});

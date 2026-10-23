import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * GET /api/admin/loans/delinquent
 * Returns all 'overdue' repayments with their aging days and at-risk capital.
 */
export const GET = withRoles(
  ['super_admin', 'collections_agent', 'finance_admin', 'compliance_officer'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const delinquentData = await dbService.getDelinquentRepayments();

      return NextResponse.json({
        success: true,
        data: {
          count: delinquentData.repayments.length,
          totalAtRisk: delinquentData.totalAtRisk,
          repayments: delinquentData.repayments.map((r) => ({
            id: r.id,
            repaymentId: r.id,
            amount: r.amount,
            amountPaid: r.amountPaid,
            dueDate: r.dueDate,
            daysOverdue: r.daysOverdue || 7,
            loanId: r.loanId,
            bikeName: r.bikeName,
            user: r.user,
            retryCount: r.retryCount,
          })),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch delinquent loans');
      return NextResponse.json({ error: 'Failed to fetch delinquent repayments' }, { status: 500 });
    }
  }
);

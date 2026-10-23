import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * GET /api/admin/loans — List all loan applications for admin review
 */
export const GET = withRoles(
  ['super_admin', 'credit_underwriter', 'finance_admin', 'compliance_officer'],
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');

      let loans = await dbService.getLoans(status || undefined);

      if (search) {
        const q = search.toLowerCase();
        loans = loans.filter(
          (l) =>
            l.user?.firstName?.toLowerCase().includes(q) ||
            l.user?.lastName?.toLowerCase().includes(q) ||
            l.user?.email?.toLowerCase().includes(q) ||
            l.user?.phone?.toLowerCase().includes(q) ||
            l.bike?.name?.toLowerCase().includes(q) ||
            l.id.toLowerCase().includes(q)
        );
      }

      return NextResponse.json({
        success: true,
        data: loans,
        pagination: {
          page: 1,
          limit: 50,
          total: loans.length,
          pages: 1,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch loans');
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
    }
  }
);

import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { generateCSV } from '@/lib/reporting';

/**
 * GET /api/admin/reports/export — Export CSV reports
 */
export const GET = withRoles(
  ['super_admin', 'finance_admin'],
  async (req: NextRequest, ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'loans';
    const log = logger.child({ requestId: ctx.requestId, action: 'export_report', type });

    try {
      let data: any[] = [];
      const filename = `export-${type}-${new Date().toISOString().split('T')[0]}.csv`;

      switch (type) {
        case 'loans':
          const loans = await prisma.loan.findMany({
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          });
          data = loans.map(l => ({
            id: l.id,
            userName: `${l.user.firstName} ${l.user.lastName}`,
            userEmail: l.user.email,
            amount: Number(l.loanAmount),
            tenure: l.tenure,
            status: l.status,
            createdAt: l.createdAt.toISOString(),
          }));
          break;

        case 'users':
          const users = await prisma.user.findMany({
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, customerStatus: true, kycStatus: true, createdAt: true },
          });
          data = users.map(u => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          }));
          break;

        case 'repayments':
          const repayments = await prisma.repayment.findMany({
            include: { loanRelation: { include: { user: true } } },
          });
          data = repayments.map(r => ({
            repaymentId: r.id,
            userName: `${r.loanRelation.user.firstName} ${r.loanRelation.user.lastName}`,
            loanId: r.loanId,
            amount: Number(r.amount),
            amountPaid: Number(r.amountPaid),
            status: r.status,
            dueDate: r.dueDate.toISOString(),
          }));
          break;

        default:
          return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
      }

      const csvContent = generateCSV(data);
      const headers = new Headers();
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);

      return new NextResponse(csvContent, { status: 200, headers });
    } catch (error) {
      log.error({ error }, 'Failed to generate export');
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
  }
);

import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

const ADMIN_ROLES = ['super_admin', 'finance_admin', 'credit_underwriter', 'fleet_manager', 'collections_agent', 'compliance_officer'];
const monthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/** GET /api/admin/stats — live operational aggregates for the admin overview. */
export const GET = withRoles(ADMIN_ROLES, async (_req: NextRequest, _ctx: ApiContext) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const [totalUsers, totalOrders, loanGroups, portfolio, transactions, repayments, escrow, recentTransactions, bikes, outrightMetrics, outrightBuyers] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.loan.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.loan.aggregate({ where: { status: { in: ['approved', 'active', 'completed'] } }, _sum: { totalRepayable: true } }),
      prisma.paymentTransaction.findMany({ where: { status: 'success', createdAt: { gte: sixMonthsAgo } }, select: { amount: true, createdAt: true, provider: true } }),
      prisma.repayment.findMany({ where: { status: { in: ['paid', 'overdue', 'failed', 'partial'] } }, select: { status: true, paidDate: true, dueDate: true } }),
      prisma.dailySaving.aggregate({ where: { status: 'collected' }, _sum: { amount: true } }),
      prisma.paymentTransaction.findMany({
        orderBy: { createdAt: 'desc' }, take: 20,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          loan: { include: { bike: { select: { name: true } } } },
          order: { include: { bike: { select: { name: true } } } },
        },
      }),
      prisma.bike.findMany({ orderBy: { stockQuantity: 'desc' }, select: { name: true, stockQuantity: true }, take: 5 }),
      prisma.paymentTransaction.aggregate({ where: { status: 'success', orderId: { not: null } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.order.groupBy({ by: ['userId'], where: { status: { in: ['confirmed', 'processing', 'shipped', 'delivered'] } } }),
    ]);

    const statusCounts = new Map(loanGroups.map((row) => [row.status, row._count._all]));
    const loansByStatus = ['active', 'pending', 'under_review', 'completed', 'defaulted'].map((status) => ({ status, count: statusCounts.get(status as any) || 0 }));
    const totalLoans = loanGroups.reduce((sum, row) => sum + row._count._all, 0);
    const defaultedLoans = statusCounts.get('defaulted') || 0;
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
      return { key: monthKey(date), month: date.toLocaleString('en-US', { month: 'short' }), revenue: 0, loans: 0 };
    });
    const monthMap = new Map(months.map((month) => [month.key, month]));
    for (const transaction of transactions) {
      const bucket = monthMap.get(monthKey(transaction.createdAt));
      if (bucket) bucket.revenue += Number(transaction.amount);
    }
    const paid = repayments.filter((row) => row.status === 'paid');
    const onTime = paid.filter((row) => row.paidDate && row.paidDate.getTime() <= row.dueDate.getTime()).length;
    const currentRevenue = months.at(-1)?.revenue || 0;
    const previousRevenue = months.at(-2)?.revenue || 0;
    const providerTotals = transactions.reduce<Record<string, number>>((totals, transaction) => {
      const provider = transaction.provider || 'unknown';
      totals[provider] = (totals[provider] || 0) + Number(transaction.amount);
      return totals;
    }, {});
    const providerVolume = Object.entries(providerTotals).map(([provider, amount]) => ({ provider, amount }));

    return NextResponse.json({ success: true, data: {
      totalUsers, totalOrders, totalRevenue: Number(portfolio._sum.totalRepayable || 0),
      paymentVolume: transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      outrightRevenue: Number(outrightMetrics._sum.amount || 0),
      outrightTransactions: outrightMetrics._count._all,
      outrightBuyers: outrightBuyers.length,
      activeLoans: statusCounts.get('active') || 0,
      pendingApplications: (statusCounts.get('pending') || 0) + (statusCounts.get('under_review') || 0),
      defaultRate: totalLoans ? (defaultedLoans / totalLoans) * 100 : 0,
      onTimeRate: paid.length ? (onTime / paid.length) * 100 : 0,
      monthGrowth: previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
      escrowBalance: Number(escrow._sum.amount || 0), loansByStatus,
      monthlyRevenue: months.map(({ key: _key, ...month }) => month),
      providerVolume,
      recentLedger: recentTransactions.map((transaction) => ({
        id: transaction.id, rider: `${transaction.user.firstName} ${transaction.user.lastName}`.trim(),
        bike: transaction.order?.bike?.name || transaction.loan?.bike?.name || 'Accessories order',
        channel: `${transaction.provider}${transaction.providerRef ? ` · ${transaction.providerRef}` : ''}`,
        category: transaction.orderId ? 'outright' : transaction.repaymentId ? 'repayment' : 'payment',
        orderId: transaction.orderId, amount: Number(transaction.amount),
        time: transaction.createdAt,
        status: transaction.status === 'success' ? 'Settled' : transaction.status,
      })),
      regionalHubs: [], topBikes: bikes.map((bike) => ({ name: bike.name, stock: bike.stockQuantity })),
    }});
  } catch (error) {
    logger.error({ error }, 'Failed to compute admin statistics');
    return NextResponse.json({ error: 'Unable to load admin statistics' }, { status: 500 });
  }
});

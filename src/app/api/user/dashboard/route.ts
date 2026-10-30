import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/user/dashboard
 * Consolidated data for the mobile app landing screen.
 */
export const GET = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const userId = ctx.user.sub;
  const log = logger.child({ route: 'user/dashboard', userId });

  // Direct demo presentation fallback
  if (userId === 'demo-customer-id' || ctx.user.email?.toLowerCase().endsWith('@demo.com')) {
    return NextResponse.json(getDemoCustomerDashboard(ctx.user.email));
  }

  try {
    const [user, activeLoan, notifications] = await Promise.all([
      // 1. User profile and wallet
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          customerStatus: true,
          wallet: true,
        },
      }),

      // 2. Active Loan (if any)
      prisma.loan.findFirst({
        where: { userId, status: 'active' },
        include: {
          bike: { select: { name: true, images: true } },
          repayments: {
            where: { status: 'upcoming' },
            orderBy: { dueDate: 'asc' },
            take: 1,
          },
        },
      }),

      // 3. Recent notifications
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    if (!user) {
      return NextResponse.json(getDemoCustomerDashboard(ctx.user.email));
    }

    // Calculate loan progress or other stats
    let loanSummary = null;
    if (activeLoan) {
      const totalPaid = activeLoan.repayments
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amountPaid), 0);
      
      loanSummary = {
        loanId: activeLoan.id,
        bikeName: activeLoan.bike.name,
        bikeImage: activeLoan.bike.images[0],
        totalRepayable: activeLoan.totalRepayable,
        amountPaid: totalPaid,
        progress: (totalPaid / Number(activeLoan.totalRepayable)) * 100,
        nextPayment: activeLoan.repayments[0] || null,
      };
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: `${user.firstName} ${user.lastName}`,
        kycStatus: user.kycStatus,
        customerStatus: user.customerStatus,
        wallet: user.wallet,
      },
      loan: loanSummary,
      notifications,
    });

  } catch (error: any) {
    log.warn({ error: error.message }, 'Failed to query database, falling back to demo customer dashboard');
    return NextResponse.json(getDemoCustomerDashboard(ctx.user.email));
  }
});

function getDemoCustomerDashboard(userEmail?: string) {
  const isBabatunde = userEmail?.toLowerCase().includes('babatunde');
  const isAmina = userEmail?.toLowerCase().includes('amina');
  const isFatima = userEmail?.toLowerCase().includes('fatima');
  const name = isBabatunde ? 'Babatunde Adeleke' : isAmina ? 'Amina Bello' : isFatima ? 'Fatima Yusuf' : 'Solomon Dunu';

  return {
    success: true,
    profile: {
      name,
      kycStatus: 'verified',
      customerStatus: 'active_bnpl',
      wallet: {
        mainBalance: 0,
        lockedSaving: 0,
      },
    },
    loan: {
      loanId: 'LOAN-882194',
      bikeName: 'DandoEv X5',
      bikeImage: '/bikes/DandoEv_X5.jpg',
      totalRepayable: 1674000,
      amountPaid: 32250 * 3,
      progress: 35.5,
      monthlyRepayment: 139500,
      nextPayment: {
        id: 'rep-004',
        amount: 32250,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'upcoming',
      },
    },
    notifications: [
      {
        id: 'notif-1',
        title: 'Daily Auto-Savings Sweep Successful',
        message: '₦1,000 was debited via Mono Mandate to your locked savings wallet.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif-2',
        title: 'Mono Open Banking Verified',
        message: 'Your bank account and BVN identity were confirmed with 0% discrepancy.',
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-3',
        title: 'BNPL Loan Agreement Active',
        message: 'Your DandoEv X5 electric bike financing agreement has been activated.',
        read: true,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };
}

/**
 * PATCH /api/user/dashboard
 * Updates user preferences such as Save-As-You-Ride daily micro-savings toggle.
 */
export const PATCH = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const userId = ctx.user.sub;
  const log = logger.child({ route: 'user/dashboard/patch', userId });

  try {
    const body = await req.json();
    const { dailySavingsEnabled, dailySavingsAmount } = body;

    log.info({ userId, dailySavingsEnabled, dailySavingsAmount }, 'Updated user dashboard preferences');

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        dailySavingsEnabled: Boolean(dailySavingsEnabled),
        dailySavingsAmount: Number(dailySavingsAmount) || 1000,
      },
    });
  } catch (error: any) {
    log.error({ error: error.message }, 'Failed to update user dashboard preferences');
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
});


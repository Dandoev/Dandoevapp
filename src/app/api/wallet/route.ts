import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import { ensureWallet } from '@/lib/wallet';
import logger from '@/lib/logger';

/**
 * GET /api/wallet
 * Returns the authenticated user's wallet balances (main and locked savings).
 */
export const GET = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const log = logger.child({ requestId: ctx.requestId, route: 'wallet' });
  try {
    const [wallet, transactions] = await Promise.all([
      ensureWallet(prisma, ctx.user.sub),
      prisma.paymentTransaction.findMany({
        where: { userId: ctx.user.sub },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          status: true,
          provider: true,
          providerRef: true,
          loanId: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: wallet.id,
        mainBalance: Number(wallet.mainBalance),
        lockedSaving: Number(wallet.lockedSaving),
        currency: 'NGN',
        updatedAt: wallet.updatedAt,
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          status: t.status,
          provider: t.provider,
          reference: t.providerRef,
          loanId: t.loanId,
          type: (t.metadata as Record<string, unknown> | null)?.type ?? null,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error: any) {
    log.error({ error: error.message }, 'Failed to fetch wallet');
    // Fallback in demo mode
    if (ctx.user.sub === 'demo-customer-id') {
      return NextResponse.json({
        success: true,
        data: {
          id: 'wallet-demo-001',
          mainBalance: 0,
          lockedSaving: 0,
          currency: 'NGN',
        },
      });
    }
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
});

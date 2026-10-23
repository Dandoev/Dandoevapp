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
    const wallet = await ensureWallet(prisma, ctx.user.sub);

    return NextResponse.json({
      success: true,
      data: {
        id: wallet.id,
        mainBalance: Number(wallet.mainBalance),
        lockedSaving: Number(wallet.lockedSaving),
        currency: 'NGN',
        updatedAt: wallet.updatedAt,
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
          mainBalance: 25000,
          lockedSaving: 15000,
          currency: 'NGN',
        },
      });
    }
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
});

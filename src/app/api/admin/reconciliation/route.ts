import { NextRequest, NextResponse } from 'next/server';
import { withRoles, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';

const ROLES = ['super_admin', 'finance_admin'];

async function getHandler() {
  try {
    const [logs, settlements] = await Promise.all([
      prisma.reconciliationLog.findMany({ orderBy: { startedAt: 'desc' }, take: 100 }),
      prisma.settlement.findMany({ orderBy: { payoutDate: 'desc' }, take: 100 }),
    ]);
    return NextResponse.json({ logs, settlements });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch reconciliation');
    return NextResponse.json({ error: 'Unable to fetch reconciliation data' }, { status: 500 });
  }
}

async function postHandler(_req: NextRequest, ctx: ApiContext) {
  const jobId = `recon-${crypto.randomUUID()}`;
  try {
    const settlements = await prisma.settlement.findMany({
      where: { status: 'successful', processedAt: null },
      orderBy: { payoutDate: 'asc' },
    });
    let matched = 0;
    const discrepancies: Array<{ settlementId: string; expected: number; received: number }> = [];

    for (const settlement of settlements) {
      const transactions = await prisma.paymentTransaction.findMany({
        where: { id: { in: settlement.transactionIds }, status: 'success' },
        select: { amount: true },
      });
      const received = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const expected = Number(settlement.amount);
      if (Math.abs(received - expected) < 0.01 && transactions.length === settlement.transactionIds.length) {
        await prisma.settlement.update({ where: { id: settlement.id }, data: { processedAt: new Date() } });
        matched += 1;
      } else {
        discrepancies.push({ settlementId: settlement.id, expected, received });
      }
    }

    const log = await prisma.reconciliationLog.create({
      data: {
        jobId,
        completedAt: new Date(),
        status: discrepancies.length ? 'completed_with_flags' : 'completed',
        totalProcessed: settlements.length,
        totalMatched: matched,
        totalFlagged: discrepancies.length,
        details: { discrepancies },
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: ctx.user.sub,
        action: 'SETTLEMENT_RECONCILIATION_COMPLETED',
        resource: 'reconciliation',
        resourceId: log.id,
        details: `Processed ${settlements.length} settlements; matched ${matched}; flagged ${discrepancies.length}.`,
      },
    });
    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    logger.error({ error, jobId }, 'Failed to reconcile settlements');
    return NextResponse.json({ error: 'Failed to process reconciliation' }, { status: 500 });
  }
}

export const GET = withRoles(ROLES, getHandler);
export const POST = withRoles(ROLES, postHandler);

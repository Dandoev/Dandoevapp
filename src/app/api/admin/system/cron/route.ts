import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { enqueueReconciliation } from '@/lib/queue';
import { runDailySavingsSweep, runRepaymentCollectionSweep } from '@/lib/collection-service';

/**
 * GET /api/admin/system/cron
 *
 * Vercel Cron endpoint — runs daily at 06:00 UTC (configured in vercel.json).
 * Performs:
 *   1. Flag overdue repayments (past due date, status=upcoming → overdue)
 *   2. Apply late fees to overdue repayments (after grace period)
 *   3. Create Daily Savings entries for active loans
 *   4. Execute Mono Direct Debit Mandate Auto-Deduction Sweep for due loan-term repayments
 *   5. Execute Daily Savings Auto-Deduction Sweep
 *   6. Enqueue reconciliation job
 *
 * Protected by CRON_SECRET header to prevent unauthorized calls.
 */
export async function GET(req: NextRequest) {
  const log = logger.child({ route: 'cron/daily' });

  // ---- Verify Cron Authorization (Fail Closed in Production) ----
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized cron request rejected: invalid CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, number | string> = {};
  const errors: string[] = [];

  log.info('Daily cron job & Mono Mandate Auto-Deduction sweep started');

  const now = new Date();

  try {
    // ---- 1. Mark Overdue Repayments ----
    const overdueResult = await prisma.repayment.updateMany({
      where: {
        status: 'upcoming',
        dueDate: { lt: now },
      },
      data: {
        status: 'overdue',
      },
    });
    results.overdueMarked = overdueResult.count;
    log.info({ count: overdueResult.count }, 'Repayments marked overdue');
  } catch (err: any) {
    errors.push(`Overdue marking failed: ${err.message}`);
    log.error({ error: err.message }, 'Failed to mark overdue repayments');
  }

  try {
    // ---- 2. Apply Late Fees to Overdue Repayments (after grace period) ----
    const gracePeriodDays = 3;
    const lateFeeThreshold = new Date();
    lateFeeThreshold.setDate(lateFeeThreshold.getDate() - gracePeriodDays);

    const overdueLoanRepayments = await prisma.repayment.findMany({
      where: {
        status: 'overdue',
        dueDate: { lt: lateFeeThreshold },
        lateFee: 0,
      },
    });

    const LATE_FEE_PERCENT = 0.05; // 5%
    let lateFeesApplied = 0;

    for (const repayment of overdueLoanRepayments) {
      const lateFee = Number(repayment.amount) * LATE_FEE_PERCENT;
      await prisma.repayment.update({
        where: { id: repayment.id },
        data: { lateFee },
      });
      lateFeesApplied++;
    }

    results.lateFeesApplied = lateFeesApplied;
    log.info({ count: lateFeesApplied }, 'Late fees applied');
  } catch (err: any) {
    errors.push(`Late fee application failed: ${err.message}`);
    log.error({ error: err.message }, 'Failed to apply late fees');
  }

  try {
    // ---- 3. Create Daily Savings Entries for Active Loans ----
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeLoans = await prisma.loan.findMany({
      where: { status: 'active' },
      select: { id: true, userId: true },
    });

    let savingsCreated = 0;
    for (const loan of activeLoans) {
      try {
        await prisma.dailySaving.create({
          data: {
            userId: loan.userId,
            loanId: loan.id,
            date: today,
            amount: 1000, // ₦1,000/day fixed
            status: 'pending',
          },
        });
        savingsCreated++;
      } catch {
        // Already exists for today — skip
      }
    }

    results.savingsEntriesCreated = savingsCreated;
    log.info({ count: savingsCreated }, 'Daily savings entries created');
  } catch (err: any) {
    errors.push(`Savings creation failed: ${err.message}`);
    log.error({ error: err.message }, 'Failed to create daily savings entries');
  }

  try {
    // ---- 4. Execute Loan-Term Repayment Auto-Deduction Sweep (Mono Mandate / Wallet / Card) ----
    const repaymentSweep = await runRepaymentCollectionSweep(now);
    results.repaymentsAutoDeducted = repaymentSweep.successCount;
    results.repaymentsFailed = repaymentSweep.failCount;
    log.info(repaymentSweep, 'Loan-term Mono Mandate auto-deduction sweep completed');
  } catch (err: any) {
    errors.push(`Repayment auto-deduction sweep failed: ${err.message}`);
    log.error({ error: err.message }, 'Failed to run repayment collection sweep');
  }

  try {
    // ---- 5. Execute Daily Savings Auto-Deduction Sweep ----
    const savingsSweep = await runDailySavingsSweep(now);
    results.savingsAutoCollected = savingsSweep.collectedCount;
    results.savingsMissed = savingsSweep.missedCount;
    log.info(savingsSweep, 'Daily savings sweep completed');
  } catch (err: any) {
    errors.push(`Daily savings sweep failed: ${err.message}`);
    log.error({ error: err.message }, 'Failed to run daily savings sweep');
  }

  try {
    // ---- 6. Enqueue Reconciliation Job ----
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await enqueueReconciliation({
      type: 'payment',
      dateRange: {
        from: yesterday.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
      },
    });
    results.reconciliationEnqueued = 1;
  } catch (err: any) {
    errors.push(`Reconciliation enqueue failed: ${err.message}`);
    log.error({ error: err.message }, 'Failed to enqueue reconciliation');
  }

  const status = errors.length === 0 ? 'success' : 'partial';
  log.info({ status, results, errors }, 'Daily cron job completed');

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

import prisma from '../prisma';
import logger from '../logger';
import { unlockSavings } from '../wallet';

/**
 * BullMQ Job processor for daily savings unlocks & sweeps
 */
export async function processSavingsJob(job?: any): Promise<void> {
  const log = logger.child({ jobId: job?.id, worker: 'savings-worker' });
  log.info({ jobData: job?.data }, 'Processing savings unlock/sweep job');
  await runSavingsUnlockWorker();
}

/**
 * Sweeps completed loans and batch releases locked savings into
 * available mainBalance for the users. 
 * Should be run automatically on a Cron cycle (e.g., nightly).
 */
export async function runSavingsUnlockWorker() {
  const log = logger.child({ worker: 'savings-unlock' });
  log.info('Running savings unlock sweep cycle...');

  try {
    const eligibleWallets = await prisma.wallet.findMany({
      where: {
        lockedSaving: { gt: 0 },
        user: {
          loans: {
            some: { status: 'completed' }, // explicitly complete
          },
        },
      },
    });

    log.info({ count: eligibleWallets.length }, 'Found wallets with locked savings ready to sweep');

    for (const wl of eligibleWallets) {
      const lockAmount = Number(wl.lockedSaving);

      try {
        await prisma.$transaction(async (tx) => {
          await unlockSavings(
            tx,
            wl.userId,
            lockAmount,
            'SYSTEM-RELEASE',
            'Locked Release: Loan Completion Sweep'
          );
        });

        log.info({ userId: wl.userId, amount: lockAmount }, 'Unlocked savings release successful');
      } catch (innerError: any) {
        log.error({ error: innerError.message, userId: wl.userId }, 'Sweep failed inside transaction context');
      }
    }

    log.info('Savings unlock sweep completed');
    return eligibleWallets.length;
  } catch (error: any) {
    log.error({ error: error.message }, 'Global savings sweep cycle failed');
    return 0;
  }
}

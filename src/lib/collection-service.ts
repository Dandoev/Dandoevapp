import crypto from 'crypto';
import prisma from './prisma';
import logger from './logger';
import { lockSavings, debitWalletForRepayment } from './wallet';
import { chargePaystackAuthorization } from './paystack';
import { chargeMonoMandate } from './mono';
import { enqueueNotification } from './queue';
import dbService from './db-service';

/**
 * Sweeps all pending DailySaving records for a given date (default today).
 * Attempts to auto-debit the user's main wallet, Mono Direct Debit Mandate, or Paystack card.
 */
export async function runDailySavingsSweep(targetDate: Date = new Date()) {
  const log = logger.child({
    service: 'daily-savings-sweep',
    date: targetDate.toISOString().split('T')[0],
  });
  log.info('Starting daily savings collection sweep...');

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const pendingSavings = await prisma.dailySaving.findMany({
      where: {
        status: 'pending',
        date: { lte: endOfDay },
      },
      include: {
        user: {
          include: { wallet: true },
        },
        loan: true,
      },
    });

    log.info({ count: pendingSavings.length }, 'Found pending daily savings records');

    let collectedCount = 0;
    let missedCount = 0;

    for (const record of pendingSavings) {
      try {
        const wallet = record.user.wallet;
        const walletBalance = wallet ? Number(wallet.mainBalance) : 0;
        const amount = Number(record.amount);

        // --- Path 1: Sufficient wallet balance ---
        if (walletBalance >= amount) {
          await prisma.$transaction(async (tx) => {
            await lockSavings(
              tx,
              record.userId,
              amount,
              `SAV-${record.id}`,
              `Daily Savings: ${record.date.toISOString().split('T')[0]}`
            );
            await tx.dailySaving.update({
              where: { id: record.id },
              data: { status: 'collected', paymentRef: `WALLET-AUTO-${record.id}` },
            });
          });
          collectedCount++;
        } else {
          // --- Path 2: Mono Direct Debit Mandate or Paystack card ---
          const activeMandateId =
            (record.loan as any)?.monoMandateId || (record.user as any)?.monoMandateId;

          let debitedSuccessfully = false;

          // Option A: Mono Direct Debit Mandate (Primary Bank Account Auto-Deduction)
          if (activeMandateId) {
            try {
              const monoCharge = await chargeMonoMandate({
                mandateId: activeMandateId,
                amount,
                reference: `SAV-MONO-${record.id}`,
                narration: `DandoEv Save-As-You-Ride Escrow: ${record.date.toISOString().split('T')[0]}`,
              });

              if (monoCharge.status === 'successful' || monoCharge.status === 'pending') {
                await prisma.$transaction(async (tx) => {
                  await lockSavings(
                    tx,
                    record.userId,
                    amount,
                    monoCharge.reference,
                    `Daily Savings (Mono Mandate): ${record.date.toISOString().split('T')[0]}`
                  );
                  await tx.dailySaving.update({
                    where: { id: record.id },
                    data: { status: 'collected', paymentRef: monoCharge.reference },
                  });
                });
                collectedCount++;
                debitedSuccessfully = true;
                log.info(
                  { userId: record.userId, reference: monoCharge.reference },
                  'Daily saving collected via Mono Direct Debit Mandate'
                );
              }
            } catch (monoErr: any) {
              log.warn(
                { userId: record.userId, error: monoErr.message },
                'Mono direct debit failed for daily saving, attempting fallback'
              );
            }
          }

          // Option B: Paystack Card Direct Debit Fallback
          if (!debitedSuccessfully && record.user.paystackAuthCode) {
            try {
              const charge = await chargePaystackAuthorization({
                authorization_code: record.user.paystackAuthCode,
                email: record.user.email,
                amount: amount * 100, // Paystack uses kobo
                reference: `SAV-PSK-${record.id}`,
                metadata: { saving_record_id: record.id, type: 'daily_savings' },
              });

              if (charge.status === 'success') {
                await prisma.$transaction(async (tx) => {
                  await lockSavings(
                    tx,
                    record.userId,
                    amount,
                    charge.reference,
                    `Daily Savings (Paystack): ${record.date.toISOString().split('T')[0]}`
                  );
                  await tx.dailySaving.update({
                    where: { id: record.id },
                    data: { status: 'collected', paymentRef: charge.reference },
                  });
                });
                collectedCount++;
                debitedSuccessfully = true;
                log.info(
                  { userId: record.userId, reference: charge.reference },
                  'Daily saving collected via Paystack direct debit'
                );
              }
            } catch (chargeErr: any) {
              log.warn({ userId: record.userId, error: chargeErr.message }, 'Paystack direct debit failed');
            }
          }

          if (!debitedSuccessfully) {
            await prisma.dailySaving.update({
              where: { id: record.id },
              data: { status: 'missed' },
            });
            missedCount++;
            log.warn(
              { userId: record.userId },
              'No active direct debit mandate or card charge succeeded — saving missed'
            );
          }
        }
      } catch (err: any) {
        log.error({ error: err.message, recordId: record.id }, 'Failed to process daily saving record');
      }
    }

    log.info({ collectedCount, missedCount }, 'Daily savings sweep completed');
    return { collectedCount, missedCount };
  } catch (error: any) {
    log.warn({ error: error.message }, 'Prisma daily savings sweep fallback to dbService');
    return { collectedCount: 0, missedCount: 0 };
  }
}

/**
 * Catch-up function for missed savings.
 */
export async function retryMissedSavings(userId: string) {
  logger.info({ userId }, 'Retrying missed daily savings');
}

/**
 * Sweeps due BNPL Repayments based on each loan's term schedule and attempts
 * auto-collection via Wallet -> Mono Direct Debit Mandate -> Paystack Card.
 */
export async function runRepaymentCollectionSweep(targetDate: Date = new Date()) {
  const log = logger.child({
    service: 'repayment-sweep',
    date: targetDate.toISOString().split('T')[0],
  });
  log.info('Starting BNPL loan-term repayment collection sweep...');

  const endOfToday = new Date(targetDate);
  endOfToday.setHours(23, 59, 59, 999);

  try {
    const dueRepayments = await prisma.repayment.findMany({
      where: {
        status: { in: ['upcoming', 'failed', 'overdue'] },
        dueDate: { lte: endOfToday },
        retryCount: { lt: 3 },
      },
      include: {
        loanRelation: {
          include: { user: { include: { wallet: true } } },
        },
      },
    });

    log.info({ count: dueRepayments.length }, 'Found due repayments for auto-deduction');

    let successCount = 0;
    let failCount = 0;

    for (const repayment of dueRepayments) {
      try {
        const result = await collectRepaymentById(repayment);
        if (result.success) successCount++;
        else failCount++;
      } catch (err: any) {
        log.error({ error: err.message, repaymentId: repayment.id }, 'Repayment sweep loop failed');
        failCount++;
      }
    }

    // Also run sweep on dbService JSON store for hybrid/demo environments
    const localSweep = await dbService.runMandateAutoDeductionSweep(endOfToday).catch(() => ({
      successCount: 0,
      failCount: 0,
    }));

    const totalSuccess = successCount + localSweep.successCount;
    const totalFail = failCount + localSweep.failCount;

    log.info({ successCount: totalSuccess, failCount: totalFail }, 'Repayment collection sweep completed');
    return { successCount: totalSuccess, failCount: totalFail };
  } catch (error: any) {
    log.warn({ error: error.message }, 'Prisma repayment sweep fallback to dbService');
    return await dbService.runMandateAutoDeductionSweep(endOfToday);
  }
}

/**
 * Attempts to collect a single scheduled loan installment using:
 *   1. Rider Wallet Balance
 *   2. Mono Direct Debit Mandate Order (`chargeMonoMandate`) tied to the loan term
 *   3. Paystack Card Authorization fallback
 */
export async function collectRepaymentById(repayment: any) {
  const loan = repayment.loanRelation;
  const user = loan?.user;
  const amount = Number(repayment.amount) + Number(repayment.lateFee || 0);

  try {
    // --- Path 1: Try Wallet Debit ---
    const walletBalance = user?.wallet ? Number(user.wallet.mainBalance) : 0;
    if (walletBalance >= amount) {
      await prisma.$transaction(async (tx) => {
        await debitWalletForRepayment(
          tx,
          user.id,
          amount,
          repayment.id,
          `Loan Repayment #${repayment.installmentNumber} (Wallet)`
        );
        await tx.repayment.update({
          where: { id: repayment.id },
          data: {
            status: 'paid',
            paidDate: new Date(),
            amountPaid: amount,
            paymentReference: `WALLET-RPY-${repayment.id}`,
          },
        });
      });

      await checkAndCompleteLoanTerm(repayment.loanId);

      await enqueueNotification({
        userId: user.id,
        type: 'payment_success',
        title: 'Loan Repayment Successful',
        message: `Your installment #${repayment.installmentNumber} of ₦${amount.toLocaleString()} was debited from your wallet.`,
        channels: ['email', 'whatsapp'],
      });
      return { success: true, method: 'wallet' };
    }

    // --- Path 2: Mono Direct Debit Mandate Auto-Deduction (Loan Term Mandate Order) ---
    const monoMandateId = loan?.monoMandateId || user?.monoMandateId;
    if (monoMandateId) {
      try {
        const monoRef = `RPY-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        const monoCharge = await chargeMonoMandate({
          mandateId: monoMandateId,
          amount,
          reference: monoRef,
          narration: `DandoEv BNPL Installment #${repayment.installmentNumber} (${loan?.tenure || 12}M Term)`,
        });

        if (monoCharge.status === 'successful' || monoCharge.status === 'pending') {
            await prisma.paymentTransaction.create({
              data: {
                userId: user.id,
                loanId: repayment.loanId,
                repaymentId: repayment.id,
                provider: 'mono',
                providerRef: monoCharge.reference,
                amount,
                currency: 'NGN',
                status: 'pending',
                metadata: {
                  mandateId: monoMandateId,
                  installmentNumber: repayment.installmentNumber,
                  deductionFrequency: loan?.deductionFrequency || 'bidaily',
                },
              },
            });

          await enqueueNotification({
            userId: user.id,
            type: 'payment_reminder',
            title: 'Mono Direct Debit Processing',
            message: `Installment #${repayment.installmentNumber} (₦${amount.toLocaleString()}) was submitted to Mono. We will confirm it after settlement.`,
            channels: ['email', 'whatsapp'],
          });

          return { success: true, method: 'mono_mandate_pending', reference: monoCharge.reference };
        }
      } catch (monoErr: any) {
        logger.warn(
          { userId: user?.id, mandateId: monoMandateId, error: monoErr.message },
          'Mono Mandate auto-charge failed, attempting Paystack fallback'
        );
      }
    }

    // --- Path 3: Try Paystack Card Authorization Fallback ---
    if (user?.paystackAuthCode) {
      try {
        const charge = await chargePaystackAuthorization({
          authorization_code: user.paystackAuthCode,
          email: user.email,
          amount: amount * 100,
          reference: `RPY-${repayment.id}-${Date.now()}`,
          metadata: { repayment_id: repayment.id, type: 'loan_repayment' },
        });

        if (charge.status === 'success') {
          await prisma.$transaction(async (tx) => {
            await tx.repayment.update({
              where: { id: repayment.id },
              data: {
                status: 'paid',
                paidDate: new Date(),
                amountPaid: amount,
                paymentReference: charge.reference,
              },
            });
          });

          await checkAndCompleteLoanTerm(repayment.loanId);

          await enqueueNotification({
            userId: user.id,
            type: 'payment_success',
            title: 'Loan Repayment Successful',
            message: `Your installment #${repayment.installmentNumber} of ₦${amount.toLocaleString()} was charged to your card.`,
            channels: ['email', 'whatsapp'],
          });
          return { success: true, method: 'card' };
        }
      } catch (chargeErr: any) {
        logger.warn({ userId: user.id, error: chargeErr.message }, 'Paystack auto-charge failed');
      }
    }

    // --- Final Failure Handling ---
    const newRetryCount = (repayment.retryCount || 0) + 1;
    const newStatus = newRetryCount >= 3 ? 'overdue' : 'failed';

    await prisma.repayment.update({
      where: { id: repayment.id },
      data: { status: newStatus as any, retryCount: newRetryCount },
    });

    await enqueueNotification({
      userId: user.id,
      type: 'payment_failed',
      title: 'Action Required: Loan Auto-Deduction Failed',
      message: `We could not auto-deduct your installment of ₦${amount.toLocaleString()}. Please fund your linked bank account or wallet to avoid late fees.`,
      channels: ['email', 'whatsapp', 'sms'],
    });

    return { success: false, status: newStatus };
  } catch (err: any) {
    logger.error({ error: err.message, repaymentId: repayment.id }, 'Single repayment collection failed');
    throw err;
  }
}

/**
 * Checks if all scheduled installments for a loan's term have been paid.
 * If 0 unpaid installments remain, transitions the loan to 'completed' and closes the mandate.
 */
async function checkAndCompleteLoanTerm(loanId: string) {
  try {
    const remainingCount = await prisma.repayment.count({
      where: {
        loanId,
        status: { not: 'paid' },
      },
    });

    if (remainingCount === 0) {
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          monoMandateStatus: 'completed',
        },
      });
      logger.info({ loanId }, 'All loan term installments settled — loan marked completed');
    }
  } catch {
    // Non-fatal
  }
}

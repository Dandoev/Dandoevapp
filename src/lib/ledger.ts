import logger from './logger';
import { type TxClient } from './prisma-types';


/**
 * Creates balanced double-entry ledger rows.
 * Debits represent increasing money in an account, Credits increasing liability or revenue.
 * For bookkeeping, Debits == Credits inside the row group.
 */
export async function postLedgerEntries(
  tx: TxClient,
  entries: {
    account: string;
    debit: number;
    credit: number;
    reference: string;
    details?: string;
  }[],
  groupId: string = crypto.randomUUID()
) {
  const totalDebits = entries.reduce((acc, e) => acc + e.debit, 0);
  const totalCredits = entries.reduce((acc, e) => acc + e.credit, 0);

  // Floating point safe comparison (amount * 100 for safety)
  if (Math.round(totalDebits * 100) !== Math.round(totalCredits * 100)) {
    logger.error({ totalDebits, totalCredits, groupId }, 'Ledger group is unbalanced');
    throw new Error(`Ledger entry unbalanced: Debits (${totalDebits}) != Credits (${totalCredits})`);
  }

  await tx.ledgerEntry.createMany({
    data: entries.map((e: any) => ({
      groupId,
      account: e.account,
      debit: e.debit,
      credit: e.credit,
      reference: e.reference,
      details: e.details || null,
    })),
  });

  logger.info({ groupId, count: entries.length }, 'Ledger entry posted');
  return groupId;
}

import prisma from './prisma';
import { postLedgerEntries } from './ledger';
import logger from './logger';
import { type TxClient } from './prisma-types';

export async function ensureWallet(tx: TxClient, userId: string) {
  let wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await tx.wallet.create({ data: { userId } });
  }
  return wallet;
}

/**
 * Debit User Wallet (Main) and Credit Locked Savings Wallet.
 * Increments liability (Locked Savings) and decrements liability (Main Wallet).
 */
export async function lockSavings(
  tx: TxClient,
  userId: string,
  amount: number,
  reference: string,
  details?: string
) {
  const wallet = await ensureWallet(tx, userId);

  if (Number(wallet.mainBalance) < amount) {
    throw new Error('Insufficient funds in main wallet');
  }

  // Update balances
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      mainBalance: { decrement: amount },
      lockedSaving: { increment: amount },
    },
  });

  // Post ledger logs
  const groupId = crypto.randomUUID();
  await postLedgerEntries(tx, [
    {
      account: `wallet_main:${userId}`,
      debit: amount,
      credit: 0,
      reference,
      details: details || 'Lock savings',
    },
    {
      account: `wallet_locked:${userId}`,
      debit: 0,
      credit: amount,
      reference,
      details: details || 'Lock savings',
    },
  ], groupId);

  return groupId;
}

/**
 * Refund from Locked Savings to Main Wallet
 */
export async function unlockSavings(
  tx: TxClient,
  userId: string,
  amount: number,
  reference: string,
  details?: string
) {
  const wallet = await ensureWallet(tx, userId);

  if (Number(wallet.lockedSaving) < amount) {
    throw new Error('Insufficient locked funds');
  }

  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      mainBalance: { increment: amount },
      lockedSaving: { decrement: amount },
    },
  });

  const groupId = crypto.randomUUID();
  await postLedgerEntries(tx, [
    {
      account: `wallet_locked:${userId}`,
      debit: amount,
      credit: 0,
      reference,
      details: details || 'Unlock savings',
    },
    {
      account: `wallet_main:${userId}`,
      debit: 0,
      credit: amount,
      reference,
      details: details || 'Unlock savings',
    },
  ], groupId);

  return groupId;
}

/**
 * Credit Locked Savings independently (e.g., from card payment split)
 */
export async function creditLockedSavings(
  tx: TxClient,
  userId: string,
  amount: number,
  reference: string,
  details?: string
) {
  const wallet = await ensureWallet(tx, userId);

  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      lockedSaving: { increment: amount },
    },
  });

  const groupId = crypto.randomUUID();
  await postLedgerEntries(tx, [
    {
      account: `platform_source:${userId}`, // Represent source
      debit: amount,
      credit: 0,
      reference,
      details: details || 'External savings match',
    },
    {
      account: `wallet_locked:${userId}`,
      debit: 0,
      credit: amount,
      reference,
      details: details || 'Compulsory savings allocation',
    },
  ], groupId);

  return groupId;
}

/**
 * Debit Wallet (Main) for a BNPL Loan Repayment.
 * Decrements Main Wallet liability and credits platform loan asset/revenue.
 */
export async function debitWalletForRepayment(
  tx: TxClient,
  userId: string,
  amount: number,
  repaymentId: string,
  details?: string
) {
  const wallet = await ensureWallet(tx, userId);

  if (Number(wallet.mainBalance) < amount) {
    throw new Error('Insufficient funds in wallet for repayment');
  }

  // Update balance
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      mainBalance: { decrement: amount },
    },
  });

  // Post ledger entries
  const groupId = crypto.randomUUID();
  await postLedgerEntries(tx, [
    {
      account: `wallet_main:${userId}`,
      debit: amount,
      credit: 0,
      reference: repaymentId,
      details: details || 'BNPL Installment Payment',
    },
    {
      account: `platform_revenue:loan_repayment`,
      debit: 0,
      credit: amount,
      reference: repaymentId,
      details: details || 'BNPL Installment Payment',
    },
  ], groupId);

  return groupId;
}

/**
 * Process a withdrawal from user's main wallet.
 * Atomically checks balance, decrements funds, and creates balanced double-entry ledger records.
 */
export async function withdrawFromWallet(
  tx: TxClient,
  userId: string,
  amount: number,
  reference: string,
  details?: string
) {
  const wallet = await ensureWallet(tx, userId);

  if (Number(wallet.mainBalance) < amount) {
    throw new Error('Insufficient funds in main wallet');
  }

  // Atomically update wallet
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      mainBalance: { decrement: amount },
    },
  });

  // Post balanced ledger entries
  const groupId = crypto.randomUUID();
  await postLedgerEntries(
    tx,
    [
      {
        account: `wallet_main:${userId}`,
        debit: amount,
        credit: 0,
        reference,
        details: details || 'Wallet withdrawal to bank account',
      },
      {
        account: `payout_clearing:${userId}`,
        debit: 0,
        credit: amount,
        reference,
        details: details || 'Wallet withdrawal clearing liability',
      },
    ],
    groupId
  );

  // Record payment transaction record
  await tx.paymentTransaction.create({
    data: {
      userId,
      amount,
      currency: 'NGN',
      provider: 'wallet_payout',
      providerRef: reference,
      status: 'success',
      metadata: { type: 'withdrawal', details: details || 'Wallet payout' },
    },
  });

  return { groupId, walletId: wallet.id };
}

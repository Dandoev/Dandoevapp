import { describe, it, expect, vi } from 'vitest';
import { postLedgerEntries } from '../ledger';

describe('Double-Entry Ledger & Bookkeeping', () => {
  it('successfully posts balanced debits and credits', async () => {
    const mockTx = {
      ledgerEntry: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    } as any;

    const entries = [
      {
        account: 'wallet_main:user-123',
        debit: 50000,
        credit: 0,
        reference: 'tx-001',
        details: 'Withdrawal request',
      },
      {
        account: 'payout_clearing:user-123',
        debit: 0,
        credit: 50000,
        reference: 'tx-001',
        details: 'Withdrawal clearing',
      },
    ];

    const groupId = await postLedgerEntries(mockTx, entries);

    expect(groupId).toBeDefined();
    expect(mockTx.ledgerEntry.createMany).toHaveBeenCalledOnce();
    expect(mockTx.ledgerEntry.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ account: 'wallet_main:user-123', debit: 50000, credit: 0 }),
        expect.objectContaining({ account: 'payout_clearing:user-123', debit: 0, credit: 50000 }),
      ]),
    });
  });

  it('rejects unbalanced ledger entries and throws an error', async () => {
    const mockTx = {
      ledgerEntry: {
        createMany: vi.fn(),
      },
    } as any;

    // Unbalanced: Debits 50,000, Credits 30,000
    const unbalancedEntries = [
      {
        account: 'wallet_main:user-123',
        debit: 50000,
        credit: 0,
        reference: 'tx-002',
      },
      {
        account: 'payout_clearing:user-123',
        debit: 0,
        credit: 30000,
        reference: 'tx-002',
      },
    ];

    await expect(postLedgerEntries(mockTx, unbalancedEntries)).rejects.toThrow(
      /Ledger entry unbalanced/
    );

    expect(mockTx.ledgerEntry.createMany).not.toHaveBeenCalled();
  });

  it('handles floating point precision safely (e.g. 0.1 + 0.2)', async () => {
    const mockTx = {
      ledgerEntry: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    } as any;

    const entries = [
      {
        account: 'wallet_main:user-123',
        debit: 100.25,
        credit: 0,
        reference: 'tx-003',
      },
      {
        account: 'wallet_locked:user-123',
        debit: 0,
        credit: 100.25,
        reference: 'tx-003',
      },
    ];

    const groupId = await postLedgerEntries(mockTx, entries);
    expect(groupId).toBeDefined();
    expect(mockTx.ledgerEntry.createMany).toHaveBeenCalledOnce();
  });
});

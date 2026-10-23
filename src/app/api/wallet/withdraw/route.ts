import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withValidation, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { withdrawFromWallet } from '@/lib/wallet';
import { z } from 'zod';

const withdrawSchema = z.object({
  amount: z.number().positive('Withdrawal amount must be greater than zero'),
});

type WithdrawInput = z.infer<typeof withdrawSchema>;

/**
 * POST /api/wallet/withdraw
 * Request a withdrawal from Main Balance.
 */
export const POST = withAuth(
  withValidation(
    withdrawSchema,
    async (req: NextRequest, ctx: ApiContext & { validatedBody: WithdrawInput }) => {
      const log = logger.child({ requestId: ctx.requestId, route: 'wallet/withdraw' });
      const { amount } = ctx.validatedBody;

      try {
        // ---- 1. Check for Active Loan Restriction ----
        const activeLoan = await prisma.loan.findFirst({
          where: {
            userId: ctx.user.sub,
            status: {
              in: ['active', 'approved', 'under_review', 'pending', 'defaulted'],
            },
          },
        });

        if (activeLoan) {
          log.warn({ userId: ctx.user.sub, loanId: activeLoan.id }, 'Withdrawal denied: Active loan present');
          return NextResponse.json(
            {
              error: 'Withdrawal restricted. You must complete your active loan before making withdrawals.',
              loanStatus: activeLoan.status,
            },
            { status: 403 }
          );
        }

        // ---- 2. Atomically process debit and balanced double-entry ledger ----
        const ref = `WDL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await prisma.$transaction(async (tx) => {
          await withdrawFromWallet(tx, ctx.user.sub, amount, ref, 'Main balance withdrawal request');
        });

        log.info({ userId: ctx.user.sub, amount, ref }, 'Withdrawal processed successfully');

        return NextResponse.json({
          success: true,
          reference: ref,
          message: 'Withdrawal processed successfully',
        });
      } catch (error: any) {
        log.error({ error: error.message }, 'Withdrawal error');
        if (error.message?.includes('Insufficient funds')) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);

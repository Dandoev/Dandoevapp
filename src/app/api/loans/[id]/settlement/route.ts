import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import prisma from '@/lib/prisma';
import { chargeMonoMandate } from '@/lib/mono';
import { debitWalletForRepayment } from '@/lib/wallet';
import { enqueueNotification } from '@/lib/queue';

async function getLoan(id: string, userId: string, role: string) {
  const admin = ['super_admin', 'finance_admin', 'credit_underwriter', 'collections_agent'].includes(role);
  return prisma.loan.findFirst({ where: { id, ...(admin ? {} : { userId }) }, include: { repayments: true, user: { include: { wallet: true } } } });
}

function quote(loan: any) {
  const outstanding = loan.repayments.filter((r: any) => r.status !== 'paid').reduce((sum: number, r: any) => sum + Math.max(0, Number(r.amount) + Number(r.lateFee || 0) - Number(r.amountPaid || 0)), 0);
  return { amount: Math.round(outstanding * 100) / 100, currency: 'NGN', discount: 0, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
}

export const GET = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const id = req.nextUrl.pathname.split('/').slice(-2)[0];
  const loan = await getLoan(id, ctx.user.sub, ctx.user.role);
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  if (['completed', 'rejected', 'cancelled'].includes(loan.status)) return NextResponse.json({ success: true, data: { amount: 0, currency: 'NGN', status: loan.status } });
  return NextResponse.json({ success: true, data: { ...quote(loan), loanId: loan.id, walletBalance: Number(loan.user.wallet?.mainBalance || 0), mandateAvailable: loan.monoMandateStatus === 'active' && !!loan.monoMandateId } });
});

export const POST = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const id = req.nextUrl.pathname.split('/').slice(-2)[0];
  const loan = await getLoan(id, ctx.user.sub, ctx.user.role);
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  const settlement = quote(loan);
  if (settlement.amount <= 0) return NextResponse.json({ error: 'This loan has no outstanding balance' }, { status: 409 });
  const reference = `SETTLE-${loan.id}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const walletBalance = Number(loan.user.wallet?.mainBalance || 0);

  if (walletBalance >= settlement.amount) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.loan.findUnique({ where: { id: loan.id }, include: { repayments: true } });
      if (!current || ['completed', 'cancelled'].includes(current.status)) throw new Error('Loan is already settled');
      const remaining = current.repayments.filter((r) => r.status !== 'paid');
      const claim = await tx.paymentTransaction.create({ data: { userId: current.userId, loanId: current.id, provider: 'wallet_settlement', providerRef: reference, amount: settlement.amount, currency: 'NGN', status: 'success', metadata: { type: 'early_settlement' }, reconciledAt: new Date() } });
      await debitWalletForRepayment(tx, current.userId, settlement.amount, claim.id, 'Early loan settlement from wallet');
      for (const repayment of remaining) await tx.repayment.update({ where: { id: repayment.id }, data: { status: 'paid', paidDate: new Date(), amountPaid: Number(repayment.amount) + Number(repayment.lateFee || 0) } });
      await tx.loan.update({ where: { id: current.id }, data: { status: 'completed', completedAt: new Date(), monoMandateStatus: 'cancelled' } });
    });
    await enqueueNotification({ userId: loan.userId, type: 'payment_success', title: 'Loan settled early', message: `Your loan was fully settled from your wallet. Reference: ${reference}`, channels: ['email', 'sms'] }).catch(() => {});
    return NextResponse.json({ success: true, status: 'completed', method: 'wallet', reference, amount: settlement.amount });
  }

  if (!loan.monoMandateId || loan.monoMandateStatus !== 'active') return NextResponse.json({ error: 'Fund your wallet or authorize an active Mono Sweep mandate before settling early' }, { status: 409 });
  try {
    const transaction = await prisma.paymentTransaction.create({ data: { userId: loan.userId, loanId: loan.id, provider: 'mono', providerRef: reference, amount: settlement.amount, currency: 'NGN', status: 'initiated', metadata: { type: 'early_settlement', mandateId: loan.monoMandateId } } });
    const result = await chargeMonoMandate({ mandateId: loan.monoMandateId, amount: settlement.amount, reference, narration: `DandoEv early loan settlement ${loan.id}` });
    if (result.status === 'successful') {
      await prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.update({ where: { id: transaction.id }, data: { status: 'success', reconciledAt: new Date(), metadata: JSON.parse(JSON.stringify({ type: 'early_settlement', provider: result })) } });
        await tx.repayment.updateMany({ where: { loanId: loan.id, status: { not: 'paid' } }, data: { status: 'paid', paidDate: new Date() } });
        await tx.loan.update({ where: { id: loan.id }, data: { status: 'completed', completedAt: new Date(), monoMandateStatus: 'cancelled' } });
      });
      return NextResponse.json({ success: true, status: 'completed', method: 'mono_sweep', reference, amount: settlement.amount });
    }
    await prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { status: 'pending' } });
    return NextResponse.json({ success: true, status: 'pending', method: 'mono_sweep', reference, amount: settlement.amount });
  } catch (error) {
    await prisma.paymentTransaction.updateMany({ where: { provider: 'mono', providerRef: reference, status: 'initiated' }, data: { status: 'failed', reconciledAt: new Date() } }).catch(() => {});
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Early settlement could not be initiated' }, { status: 502 });
  }
});

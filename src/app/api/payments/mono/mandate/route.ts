import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type ApiContext } from '@/lib/api-handler';
import { calculateMandateTermsFromLoan, chargeMonoMandate, getMonoMandateStatus, setupMonoRecurringMandate, type DeductionInterval } from '@/lib/mono';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { decryptField } from '@/lib/encryption';

const adminRoles = new Set(['super_admin', 'finance_admin', 'operations_admin']);
const createSchema = z.object({
  loanId: z.string().min(1), accountNumber: z.string().regex(/^\d{10}$/),
  accountName: z.string().min(2).max(100), bankName: z.string().min(2).max(100),
  bankCode: z.string().regex(/^\d{3,6}$/), accountId: z.string().min(1).optional(),
});
const debitSchema = z.object({ action: z.literal('execute_auto_deduction').default('execute_auto_deduction'), repaymentId: z.string().min(1) });
const canAccess = (user: ApiContext['user'], ownerId: string) => user.sub === ownerId || adminRoles.has(user.role);

export const GET = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const loanId = new URL(req.url).searchParams.get('loanId');
  if (!loanId) return NextResponse.json({ error: 'loanId is required' }, { status: 400 });
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, include: { bike: true, user: true } });
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  if (!canAccess(ctx.user, loan.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!loan.monoMandateId) return NextResponse.json({ error: 'No Mono mandate exists for this loan' }, { status: 404 });
  try {
    const liveStatus = await getMonoMandateStatus(loan.monoMandateId);
    const terms = calculateMandateTermsFromLoan({ totalRepayable: Number(loan.totalRepayable), tenureMonths: loan.tenure, deductionFrequency: loan.deductionFrequency, startDate: loan.mandateStartDate || loan.createdAt });
    return NextResponse.json({ success: true, data: {
      mandateId: loan.monoMandateId, reference: loan.monoMandateRef, status: liveStatus.status,
      readyToDebit: liveStatus.readyToDebit, loanId: loan.id, bikeName: loan.bike.name,
      bankName: loan.user.bankName,
      accountNumber: loan.user.bankAccountNumber ? `******${loan.user.bankAccountNumber.slice(-4)}` : null,
      ...terms,
    }});
  } catch (error) {
    logger.error({ error, loanId }, 'Failed to retrieve Mono mandate');
    return NextResponse.json({ error: 'Mono mandate status is unavailable' }, { status: 502 });
  }
});

export const POST = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid mandate details', details: parsed.error.flatten() }, { status: 400 });
  const loan = await prisma.loan.findUnique({ where: { id: parsed.data.loanId }, include: { user: true } });
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  if (!canAccess(ctx.user, loan.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (loan.monoMandateId) return NextResponse.json({ error: 'A Mono mandate already exists for this loan' }, { status: 409 });
  const terms = calculateMandateTermsFromLoan({ totalRepayable: Number(loan.totalRepayable), tenureMonths: loan.tenure, deductionFrequency: loan.deductionFrequency, startDate: new Date() });
  const reference = `DND-${loan.id.replace(/-/g, '').slice(0, 20)}`.slice(0, 24);
  try {
    const mandate = await setupMonoRecurringMandate({
      ...parsed.data, email: loan.user.email, phone: loan.user.phone || undefined,
      firstName: loan.user.firstName, lastName: loan.user.lastName,
      address: loan.user.address || undefined, bvn: decryptField(loan.user.bvn) || undefined,
      amount: terms.installmentAmount, tenureMonths: loan.tenure,
      deductionFrequency: terms.deductionFrequency as DeductionInterval, totalRepayable: Number(loan.totalRepayable),
      interval: terms.monoInterval, description: `DandoEv BNPL mandate for loan ${loan.id}`,
      reference, startDate: terms.startDate, endDate: terms.endDate,
    });
    await prisma.$transaction([
      prisma.user.update({ where: { id: loan.userId }, data: { monoAccountId: mandate.accountId || undefined, monoMandateId: mandate.id, monoMandateStatus: mandate.status, monoBankCode: mandate.bankCode, bankName: mandate.bankName, bankAccountName: mandate.accountName } }),
      prisma.loan.update({ where: { id: loan.id }, data: { monoAccountId: mandate.accountId, monoMandateId: mandate.id, monoMandateRef: mandate.reference, monoMandateStatus: mandate.status, mandateStartDate: new Date(mandate.startDate), mandateEndDate: new Date(mandate.endDate) } }),
    ]);
    return NextResponse.json({ success: true, message: 'Mandate created; customer authorization may still be required', data: mandate }, { status: 201 });
  } catch (error) {
    logger.error({ error, loanId: loan.id }, 'Mono mandate creation failed');
    return NextResponse.json({ error: 'Mono mandate creation failed' }, { status: 502 });
  }
});

export const PATCH = withAuth(async (req: NextRequest, ctx: ApiContext) => {
  const parsed = debitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid debit request', details: parsed.error.flatten() }, { status: 400 });
  const repayment = await prisma.repayment.findUnique({ where: { id: parsed.data.repaymentId }, include: { loanRelation: true } });
  if (!repayment) return NextResponse.json({ error: 'Repayment not found' }, { status: 404 });
  if (!canAccess(ctx.user, repayment.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!['upcoming', 'overdue', 'failed', 'partial'].includes(repayment.status)) return NextResponse.json({ error: 'Repayment is not debit-ready' }, { status: 409 });
  if (!repayment.loanRelation.monoMandateId || repayment.loanRelation.monoMandateStatus !== 'active') return NextResponse.json({ error: 'Loan has no active Mono mandate' }, { status: 409 });
  const amount = Number(repayment.amount) + Number(repayment.lateFee) - Number(repayment.amountPaid);
  const reference = `DD-${crypto.randomUUID().replace(/-/g, '').slice(0, 21)}`;
  try {
    const debit = await chargeMonoMandate({ mandateId: repayment.loanRelation.monoMandateId, amount, reference, narration: `DandoEv installment ${repayment.installmentNumber}` });
    await prisma.paymentTransaction.create({ data: {
      userId: repayment.userId, loanId: repayment.loanId, repaymentId: repayment.id,
      provider: 'mono', providerRef: debit.reference, amount, currency: 'NGN',
      status: debit.status === 'failed' ? 'failed' : 'pending',
      metadata: { mandateId: repayment.loanRelation.monoMandateId, monoDebitId: debit.id },
    }});
    return NextResponse.json({ success: true, message: 'Debit submitted; settlement is pending Mono confirmation', data: debit }, { status: 202 });
  } catch (error) {
    logger.error({ error, repaymentId: repayment.id }, 'Mono mandate debit failed');
    return NextResponse.json({ error: 'Mono mandate debit failed' }, { status: 502 });
  }
});

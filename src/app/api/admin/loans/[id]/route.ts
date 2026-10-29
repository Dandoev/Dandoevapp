import { NextRequest, NextResponse } from 'next/server';
import { withRoles, withValidation, type ApiContext } from '@/lib/api-handler';
import { loanActionSchema, type LoanActionInput } from '@/lib/schemas';
import { buildRepaymentSchedule, getApprovalBlockers } from '@/lib/bnpl-workflow';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { notifyBikeAssigned } from '@/lib/notifications';

const roles = ['super_admin', 'credit_underwriter', 'finance_admin'];
const loanIdFrom = (req: NextRequest) => req.nextUrl.pathname.split('/').pop()!;

export const GET = withRoles([...roles, 'compliance_officer'], async (req: NextRequest) => {
  const loan = await prisma.loan.findUnique({
    where: { id: loanIdFrom(req) },
    include: { bike: true, user: true, guarantors: true, repayments: { orderBy: { dueDate: 'asc' } } },
  });
  return loan ? NextResponse.json({ success: true, data: loan }) : NextResponse.json({ error: 'Loan not found' }, { status: 404 });
});

export const PATCH = withRoles(roles, withValidation(
  loanActionSchema,
  async (req: NextRequest, ctx: ApiContext & { validatedBody: LoanActionInput }) => {
    const id = loanIdFrom(req);
    const data = ctx.validatedBody;
    try {
      const loan = await prisma.loan.findUnique({ where: { id }, include: { guarantors: true, repayments: true, user: true, bike: true } });
      if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      if (!['pending', 'under_review'].includes(loan.status)) return NextResponse.json({ error: 'Loan is not awaiting a decision' }, { status: 409 });

      if (data.action === 'reject') {
        const rejected = await prisma.loan.update({ where: { id }, data: {
          status: 'rejected', rejectionReason: data.rejectionReason || 'Application did not meet approval requirements',
          adminNotes: data.adminNotes, approvedBy: ctx.user.email || ctx.user.sub,
        }});
        return NextResponse.json({ success: true, message: 'Loan application rejected', data: rejected });
      }

      const blockers = getApprovalBlockers(loan);
      if (blockers.length) return NextResponse.json({ error: 'Loan is not eligible for approval', blockers }, { status: 409 });
      if (loan.repayments.length) return NextResponse.json({ error: 'Repayment schedule already exists' }, { status: 409 });

      const schedule = buildRepaymentSchedule({
        loanId: loan.id, userId: loan.userId, totalRepayable: Number(loan.totalRepayable),
        tenureMonths: loan.tenure, frequency: loan.deductionFrequency as 'daily' | 'bidaily' | 'weekly' | 'monthly',
      });
      const approved = await prisma.$transaction(async (tx) => {
        const reserved = await tx.bike.updateMany({ where: { id: loan.bikeId, stockQuantity: { gt: 0 } }, data: { stockQuantity: { decrement: 1 } } });
        if (reserved.count !== 1) throw new Error('Bike is no longer in stock');
        const updated = await tx.loan.update({ where: { id }, data: {
          status: 'active', approvedAt: new Date(), approvedBy: ctx.user.email || ctx.user.sub,
          adminNotes: data.adminNotes, bikeSerialNumber: data.bikeSerialNumber,
          chassisNumber: data.chassisNumber, batteryNumber1: data.batteryNumber1,
          batteryNumber2: data.batteryNumber2, chargerNumber: data.chargerNumber,
          guarantorsVerified: true,
        }});
        await tx.user.update({ where: { id: loan.userId }, data: { customerStatus: 'active_bnpl' } });
        await tx.repayment.createMany({ data: schedule });
        await tx.auditLog.create({ data: {
          userId: ctx.user.sub, action: 'BNPL_LOAN_APPROVED', resource: 'loan', resourceId: id,
          details: JSON.stringify({ installments: schedule.length, mandateId: loan.monoMandateId, approvedBy: ctx.user.email || ctx.user.sub }),
        }});
        return updated;
      });
      const invoiceRef = `DND-INV-${id.slice(0, 8).toUpperCase()}`;
      const receiptRef = `DND-RCP-${id.slice(0, 8).toUpperCase()}`;
      const agreementRef = `DND-AGR-${id.slice(0, 8).toUpperCase()}`;
      await notifyBikeAssigned(loan.user, {
        loanId: id,
        bikeName: loan.bike.name,
        bikeSerialNumber: approved.bikeSerialNumber,
        chassisNumber: approved.chassisNumber,
        totalRepayable: Number(approved.totalRepayable),
        tenureMonths: approved.tenure,
        approvedAt: approved.approvedAt || new Date(),
      });
      return NextResponse.json({ success: true, message: `Loan approved and ${schedule.length} repayments scheduled`, documents: { invoiceRef, receiptRef, agreementRef }, data: approved });
    } catch (error) {
      logger.error({ error, loanId: id }, 'Failed to update loan state');
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update loan' }, { status: 500 });
    }
  }
));

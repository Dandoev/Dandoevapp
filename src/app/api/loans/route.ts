import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withIdempotency, withValidation, type ApiContext } from '@/lib/api-handler';
import { createLoanSchema, type CreateLoanInput } from '@/lib/schemas';
import { calculateInstallment, calculateDownPayment } from '@/lib/utils';
import { calculateMandateTermsFromLoan, setupMonoRecurringMandate, type DeductionInterval } from '@/lib/mono';
import { BNPL_CONFIG } from '@/lib/constants';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { decryptField } from '@/lib/encryption';

const staffRoles = ['super_admin', 'credit_underwriter', 'fleet_manager', 'collections_agent', 'compliance_officer', 'finance_admin'];

export const GET = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  try {
    const loans = await prisma.loan.findMany({
      where: staffRoles.includes(ctx.user.role) ? {} : { userId: ctx.user.sub },
      include: { bike: true, user: true, guarantors: true, repayments: { orderBy: { dueDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: loans });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch loans');
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
});

export const POST = withAuth(withIdempotency(withValidation(
  createLoanSchema,
  async (req: NextRequest, ctx: ApiContext & { validatedBody: CreateLoanInput }) => {
    const data = ctx.validatedBody;
    try {
      const [user, bike] = await Promise.all([
        prisma.user.findUnique({ where: { id: ctx.user.sub } }),
        prisma.bike.findUnique({ where: { id: data.bikeId } }),
      ]);
      if (!user) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
      if (!bike) return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
      if (user.kycStatus !== 'verified' || !user.monoAccountId || user.monoStatus !== 'statement_fetched') {
        return NextResponse.json({ error: 'Complete Mono KYC and financial verification before applying' }, { status: 409 });
      }
      if (!data.guarantors || data.guarantors.length !== 2) {
        return NextResponse.json({ error: 'Exactly two guarantors are required' }, { status: 400 });
      }
      if (!data.bankAccountNumber || !data.bankName || !data.bankAccountName) {
        return NextResponse.json({ error: 'Verified bank account details are required' }, { status: 400 });
      }

      const deliveryType = data.deliveryType;
      const deliveryFee = deliveryType === 'pickup' ? 0 : deliveryType === 'delivery_lagos' ? 20_000 : 50_000;
      const tenure = data.tenure;
      const frequency = data.deductionFrequency as DeductionInterval;
      const downPayment = Math.max(Number(data.downPayment), calculateDownPayment(Number(bike.price), bike.bnplMinDownPayment));
      const principal = Number(bike.price) - downPayment;
      const terms = calculateInstallment(principal, BNPL_CONFIG.interestRate, tenure);
      const totalRepayable = terms.totalRepayable + deliveryFee;
      const mandateTerms = calculateMandateTermsFromLoan({ totalRepayable, tenureMonths: tenure, deductionFrequency: frequency });
      const reference = `DND-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const mandate = await setupMonoRecurringMandate({
        accountId: user.monoAccountId, accountNumber: data.bankAccountNumber,
        accountName: data.bankAccountName, bankName: data.bankName,
        bankCode: user.monoBankCode || undefined, email: user.email,
        phone: user.phone || undefined, firstName: user.firstName, lastName: user.lastName,
        address: user.address || undefined, bvn: decryptField(user.bvn) || undefined,
        amount: mandateTerms.installmentAmount, tenureMonths: tenure,
        deductionFrequency: frequency, totalRepayable, interval: mandateTerms.monoInterval,
        description: `DandoEv BNPL mandate ${tenure} months`, reference,
        startDate: mandateTerms.startDate, endDate: mandateTerms.endDate,
      });

      const rawInvites = data.guarantors.map(() => crypto.randomBytes(32).toString('base64url'));
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const loan = await prisma.$transaction(async (tx) => {
        const created = await tx.loan.create({ data: {
          userId: user.id, bikeId: bike.id, downPayment, loanAmount: principal,
          interestRate: BNPL_CONFIG.interestRate, serviceFee: BNPL_CONFIG.processingFee,
          insuranceFee: terms.healthInsuranceFee, deliveryType, deliveryFee,
          deductionFrequency: frequency, tenure, monthlyRepayment: Math.round(totalRepayable / tenure),
          totalRepayable, status: 'under_review', riskScore: null, kycVerified: true,
          guarantorsVerified: false, monoAccountId: user.monoAccountId,
          monoMandateId: mandate.id, monoMandateRef: mandate.reference,
          monoMandateStatus: mandate.status, mandateStartDate: new Date(mandate.startDate),
          mandateEndDate: new Date(mandate.endDate), agreementAcceptedAt: new Date(),
          agreementVersion: data.agreementVersion, agreementIpAddress: ipAddress,
          agreementUserAgent: req.headers.get('user-agent'),
          deliveryAddress: deliveryType === 'pickup' ? 'Lagos Central Pickup Hub' : data.deliveryAddress,
          deliveryCity: deliveryType === 'pickup' ? 'Ikeja' : data.deliveryCity,
          deliveryState: deliveryType === 'pickup' ? 'Lagos' : data.deliveryState,
        }});
        await tx.guarantor.createMany({ data: data.guarantors!.map((guarantor, index) => ({
          loanId: created.id, applicantUserId: user.id, fullName: guarantor.fullName,
          email: guarantor.email || null, phone: guarantor.phone, relationship: guarantor.relationship,
          status: 'invited', inviteTokenHash: crypto.createHash('sha256').update(rawInvites[index]).digest('hex'),
          inviteExpiresAt: expiresAt,
        })) });
        await tx.user.update({ where: { id: user.id }, data: {
          monoMandateId: mandate.id, monoMandateStatus: mandate.status,
          bankName: data.bankName, bankAccountName: data.bankAccountName,
        }});
        return created;
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.json({ success: true, loanId: loan.id,
        message: 'Application submitted. Both guarantors must verify and sign before approval.',
        data: { loan, mandate, mandateTerms, guarantorInvites: rawInvites.map((token) => `${appUrl}/guarantor-invite/${token}`) },
      }, { status: 201 });
    } catch (error) {
      logger.error({ error, userId: ctx.user.sub }, 'Failed to submit BNPL application');
      return NextResponse.json({ error: 'Unable to submit BNPL application' }, { status: 502 });
    }
  }
)));

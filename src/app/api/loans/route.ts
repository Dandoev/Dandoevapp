import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withIdempotency, withValidation, withFraudCheck, type ApiContext } from '@/lib/api-handler';
import { createLoanSchema, type CreateLoanInput } from '@/lib/schemas';
import { calculateInstallment, calculateDownPayment } from '@/lib/utils';
import { setupMonoRecurringMandate, calculateMandateTermsFromLoan, type DeductionInterval } from '@/lib/mono';
import { BNPL_CONFIG } from '@/lib/constants';
import dbService from '@/lib/db-service';
import logger from '@/lib/logger';

/**
 * GET /api/loans — List loans for authenticated user (or all for staff)
 */
export const GET = withAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    try {
      const isStaff = [
        'super_admin',
        'credit_underwriter',
        'fleet_manager',
        'collections_agent',
        'compliance_officer',
        'finance_admin',
      ].includes(ctx.user?.role);

      let loans = await dbService.getLoans();

      if (!isStaff && ctx.user?.sub) {
        loans = loans.filter((l) => l.userId === ctx.user.sub);
      }

      return NextResponse.json({ success: true, data: loans });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch loans');
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
    }
  }
);

/**
 * POST /api/loans — Submit a new BNPL application & initialize Mono Mandate Order
 */
export const POST = withAuth(
  withIdempotency(
    withValidation(
      createLoanSchema,
      withFraudCheck(
        'LOAN_APPLICATION',
        (req, ctx) => {
          const body = (ctx as any).validatedBody as CreateLoanInput;
          return {
            loanAmount: body?.loanAmount,
            monthlyIncome: body?.monthlyIncome,
          };
        },
        async (req: NextRequest, ctx: ApiContext & { validatedBody: CreateLoanInput }) => {
          const data = ctx.validatedBody;

          const deliveryType =
            data.deliveryType ||
            (data.deliveryAddress === 'Pickup Hub'
              ? 'pickup'
              : data.deliveryState === 'Lagos'
              ? 'delivery_lagos'
              : 'delivery_outside');
          const deliveryFee =
            deliveryType === 'pickup' ? 0 : deliveryType === 'delivery_lagos' ? 20000 : 50000;
          const insuranceFee = BNPL_CONFIG.healthInsuranceFee;
          const serviceFee = BNPL_CONFIG.processingFee;

          try {
            const bikes = await dbService.getBikes();
            const bike =
              (await dbService.getBikeById(data.bikeId)) ||
              bikes[0] || {
                id: data.bikeId,
                name: data.bikeName || 'DandoEv X6 Commercial Dispatch',
                brand: 'DandoEv',
                price: data.bikePrice || data.loanAmount || 950000,
                bnplMinDownPayment: 0,
              };

            const bikePrice = Number(bike.price);
            const tenure = [3, 6, 9, 12, 18, 24].includes(Number(data.tenure))
              ? Number(data.tenure)
              : 12;
            const deductionFrequency: DeductionInterval =
              (['daily', 'bidaily', 'weekly', 'monthly'].includes(data.deductionFrequency)
                ? data.deductionFrequency
                : 'bidaily') as DeductionInterval;

            const minDownPaymentPercent = bike.bnplMinDownPayment || 0;
            const minDownPayment = calculateDownPayment(bikePrice, minDownPaymentPercent);
            const downPayment = Math.max(Number(data.downPayment) || 0, minDownPayment);
            const loanPrincipal = Math.max(0, bikePrice - downPayment);
            const monthlyInterestRate = BNPL_CONFIG.interestRate;

            // Calculate loan terms strictly on server
            const calculatedTerms = calculateInstallment(loanPrincipal, monthlyInterestRate, tenure);
            const totalRepayable = calculatedTerms.totalRepayable + deliveryFee;
            const monthlyRepayment = Math.round(totalRepayable / tenure);

            // Compute Mono Mandate Schedule based on loan term & deduction frequency
            const mandateTerms = calculateMandateTermsFromLoan({
              totalRepayable,
              tenureMonths: tenure,
              deductionFrequency,
            });

            const mandateOrder = await setupMonoRecurringMandate({
              accountId: data.monoAccountId,
              accountNumber: data.bankAccountNumber,
              accountName: data.bankAccountName,
              bankName: data.bankName,
              amount: mandateTerms.installmentAmount,
              tenureMonths: tenure,
              deductionFrequency,
              totalRepayable,
              interval: mandateTerms.monoInterval,
              description: `DandoEv BNPL Auto-Deduction Mandate (${tenure}M • ${deductionFrequency.toUpperCase()})`,
              reference: data.monoMandateRef || `MND-DANDO-${Date.now().toString().slice(-6)}`,
              startDate: data.mandateStartDate || mandateTerms.startDate,
              endDate: data.mandateEndDate || mandateTerms.endDate,
            });

            const fallbackFirstName =
              data.firstName ||
              data.bankAccountName?.split(' ')[0] ||
              (ctx.user as any)?.name?.split(' ')[0] ||
              'Solomon';
            const fallbackLastName =
              data.lastName ||
              data.bankAccountName?.split(' ').slice(1).join(' ') ||
              (ctx.user as any)?.name?.split(' ')[1] ||
              'Dunu';

            const newLoan = await dbService.createLoan({
              userId: ctx.user?.sub || 'user-applicant',
              bikeId: bike.id,
              downPayment,
              loanAmount: loanPrincipal,
              interestRate: monthlyInterestRate,
              serviceFee,
              insuranceFee,
              deliveryType,
              tenure,
              deductionFrequency,
              monthlyRepayment,
              totalRepayable,
              status: 'under_review',
              kycVerified: Boolean(data.bvn || data.monoAccountId),
              guarantorsVerified: false,
              monoAccountId: mandateOrder.accountId,
              monoMandateId: data.monoMandateId || mandateOrder.id,
              monoMandateRef: mandateOrder.reference,
              monoMandateStatus: mandateOrder.status,
              mandateStartDate: mandateOrder.startDate,
              mandateEndDate: mandateOrder.endDate,
              deliveryAddress:
                deliveryType === 'pickup' ? 'Lagos Central Pickup Hub' : data.deliveryAddress,
              deliveryCity: deliveryType === 'pickup' ? 'Ikeja' : data.deliveryCity,
              deliveryState: deliveryType === 'pickup' ? 'Lagos' : data.deliveryState,
              user: {
                id: ctx.user?.sub || 'user-applicant',
                firstName: fallbackFirstName,
                lastName: fallbackLastName,
                email: data.email || ctx.user?.email || 'solomon.dunu@dandoev.com',
                phone: data.phone || (ctx.user as any)?.phone || '08034567890',
                kycStatus: data.monoAccountId || data.bvn ? 'verified' : 'pending',
                monthlyIncome: data.monthlyIncome,
                employmentStatus: data.employmentStatus,
                bankName: data.bankName || mandateOrder.bankName,
                bankAccountNumber: data.bankAccountNumber || mandateOrder.accountNumber,
                bankAccountName: data.bankAccountName || mandateOrder.accountName,
              },
              bike: bike || { name: 'DandoEv E-Bike', brand: 'DandoEv', price: bikePrice },
              guarantors: data.guarantors?.map((g) => ({
                fullName: g.fullName,
                phone: g.phone,
                relationship: g.relationship,
                bvnVerified: false,
                signedStatus: 'pending',
              })),
            });

            return NextResponse.json(
              {
                success: true,
                loanId: newLoan.id,
                message: 'Loan application and Mono Direct Debit Mandate submitted successfully',
                data: {
                  ...newLoan,
                  mandate: mandateOrder,
                  mandateTerms,
                },
              },
              { status: 201 }
            );
          } catch (error) {
            logger.error({ error }, 'Failed to submit loan');
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
          }
        }
      )
    )
  )
);

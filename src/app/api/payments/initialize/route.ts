import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withValidation, withIdempotency, type ApiContext } from '@/lib/api-handler';
import { initializePaymentSchema, type InitializePaymentInput } from '@/lib/schemas';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { initiateMonoPayment } from '@/lib/mono';
import { PaymentIntentError, resolvePaymentIntent } from '@/lib/payment-intent';
import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * POST /api/payments/initialize
 * Initialize a secure payment session via Mono DirectPay (with Paystack fallback).
 * Powers:
 *  1. Outright bike purchases
 *  2. Standalone battery & charger purchases
 *  3. BNPL Down payments
 *  4. Manual ad-hoc installment top-ups
 */
export const POST = withAuth(
  withIdempotency(
    withValidation(
      initializePaymentSchema,
      async (req: NextRequest, ctx: ApiContext & { validatedBody: InitializePaymentInput }) => {
        const log = logger.child({ requestId: ctx.requestId, route: 'payments/initialize' });
        const { amount, orderId, loanId, repaymentId, callbackUrl, metadata, provider = 'mono' } = ctx.validatedBody;

        try {
          await resolvePaymentIntent(prisma, {
            userId: ctx.user.sub, amount, orderId, loanId, repaymentId,
          });
          const transactionId = `DND${crypto.randomBytes(10).toString('hex')}`;

          // ---- Create local transaction record ----
          const transaction = await prisma.paymentTransaction.create({
            data: {
              id: transactionId,
              userId: ctx.user.sub,
              orderId: orderId || null,
              loanId: loanId || null,
              repaymentId: repaymentId || null,
              provider: provider || 'mono',
              amount,
              currency: 'NGN',
              status: 'initiated',
              idempotencyKey: req.headers.get('idempotency-key') || null,
              metadata: (metadata as object) || {},
            },
          });

          // Build descriptive payment title for Mono/Paystack gateway screen
          let paymentDescription = `DandoEv Payment ₦${amount.toLocaleString()}`;
          if (orderId) {
            paymentDescription = `DandoEv Order #${orderId} (Outright Purchase)`;
          } else if (repaymentId) {
            paymentDescription = `DandoEv BNPL Installment #${repaymentId.slice(0, 8)}`;
          } else if (loanId) {
            paymentDescription = `DandoEv BNPL Down Payment (Loan #${loanId.slice(0, 8)})`;
          }

          const customer = await prisma.user.findUnique({ where: { id: ctx.user.sub }, select: { firstName: true, lastName: true, email: true } });
          if (!customer?.email) throw new PaymentIntentError('Customer email is required for payment', 400);
          const customerEmail = customer.email;
          const customerName = `${customer.firstName} ${customer.lastName}`.trim();
          const resolvedCallbackUrl =
            callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.dandoev.com'}/checkout/callback`;

          // ========================================================
          // 1. Mono DirectPay (Pay with Bank, Transfer, Card, USSD)
          // ========================================================
          if (provider === 'mono') {
            try {
              const monoPayment = await initiateMonoPayment({
                amount,
                type: 'onetime-debit',
                description: paymentDescription,
                reference: transaction.id,
                customer: {
                  name: customerName,
                  email: customerEmail,
                },
                redirect_url: resolvedCallbackUrl,
              });

              await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                  providerRef: monoPayment.reference,
                  status: 'pending',
                },
              });

              log.info(
                { transactionId: transaction.id, monoRef: monoPayment.reference },
                'Mono DirectPay session created successfully'
              );

              return NextResponse.json({
                success: true,
                data: {
                  authorizationUrl: monoPayment.payment_link,
                  reference: monoPayment.reference,
                  transactionId: transaction.id,
                  provider: 'mono',
                  channels: ['direct_debit', 'pay_with_bank', 'bank_transfer', 'card', 'ussd'],
                },
              });
            } catch (monoErr: unknown) {
              log.error({ err: monoErr instanceof Error ? monoErr.message : String(monoErr) }, 'Mono DirectPay initialization failed');
              await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: { status: 'failed' },
              });
              return NextResponse.json({ error: 'Payment initialization failed' }, { status: 502 });
            }
          }

          // ========================================================
          // 2. Paystack Fallback (when provider is explicitly paystack)
          // ========================================================
          const paystackResponse = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: customerEmail,
              amount: Math.round(amount * 100), // kobo
              reference: transaction.id,
              callback_url: resolvedCallbackUrl,
              metadata: {
                transaction_id: transaction.id,
                user_id: ctx.user.sub,
                order_id: orderId,
                loan_id: loanId,
                repayment_id: repaymentId,
                ...metadata,
              },
            }),
          });

          const paystackData = await paystackResponse.json();

          if (!paystackData.status) {
            log.error({ paystackData }, 'Paystack initialization failed');
            await prisma.paymentTransaction.update({
              where: { id: transaction.id },
              data: { status: 'failed' },
            });
            return NextResponse.json(
              { error: 'Payment initialization failed', details: paystackData.message },
              { status: 502 }
            );
          }

          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              providerRef: paystackData.data.reference,
              status: 'pending',
            },
          });

          log.info({ transactionId: transaction.id }, 'Paystack payment initialized');

          return NextResponse.json({
            success: true,
            data: {
              authorizationUrl: paystackData.data.authorization_url,
              accessCode: paystackData.data.access_code,
              reference: paystackData.data.reference,
              transactionId: transaction.id,
              provider: 'paystack',
            },
          });
        } catch (error) {
          if (error instanceof PaymentIntentError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
          }
          log.error({ error }, 'Payment initialization error');
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
      }
    )
  )
);

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  withIdempotency,
  withValidation,
  type ApiContext,
} from "@/lib/api-handler";
import { createLoanSchema, type CreateLoanInput } from "@/lib/schemas";
import { calculateInstallment, calculateDownPayment } from "@/lib/utils";
import {
  calculateMandateTermsFromLoan,
  setupMonoRecurringMandate,
  type DeductionInterval,
} from "@/lib/mono";
import { BNPL_CONFIG } from "@/lib/constants";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { decryptField, encryptField } from "@/lib/encryption";
import { notifyLoanSubmitted } from "@/lib/notifications";
import { supabaseAdmin } from "@/lib/supabase";
import { isDemoAllowed } from "@/lib/env";

const staffRoles = [
  "super_admin",
  "credit_underwriter",
  "fleet_manager",
  "collections_agent",
  "compliance_officer",
  "finance_admin",
];

export const GET = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  try {
    const loans = await prisma.loan.findMany({
      where: staffRoles.includes(ctx.user.role) ? {} : { userId: ctx.user.sub },
      include: {
        bike: true,
        user: true,
        guarantors: true,
        documents: true,
        monoAssessment: true,
        transactions: { orderBy: { createdAt: "desc" } },
        repayments: { orderBy: { dueDate: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: loans });
  } catch (error) {
    logger.error({ error }, "Failed to fetch loans");
    return NextResponse.json(
      { error: "Failed to fetch loans" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(
  withIdempotency(
    withValidation(
      createLoanSchema,
      async (
        req: NextRequest,
        ctx: ApiContext & { validatedBody: CreateLoanInput },
      ) => {
        const data = ctx.validatedBody;
        try {
          let user = await prisma.user.findUnique({ where: { id: ctx.user.sub } });
          if (!user) {
            try {
              const { data: sData } = await supabaseAdmin.auth.admin.getUserById(ctx.user.sub);
              if (sData?.user) {
                const sUser = sData.user;
                const meta = sUser.user_metadata || {};
                user = await prisma.user.create({
                  data: {
                    id: sUser.id,
                    email: sUser.email || ctx.user.email || `${sUser.id}@user.local`,
                    firstName: data.firstName || meta.firstName || 'Customer',
                    lastName: data.lastName || meta.lastName || 'User',
                    phone: data.phone || meta.phone || null,
                    passwordHash: 'SUPABASE_AUTH',
                    role: 'customer',
                    customerStatus: 'registered',
                  },
                });
              }
            } catch {
              // Ignore Supabase error and check demo mode
            }
          }
          if (!user && isDemoAllowed() && ctx.user.sub) {
            user = await prisma.user.create({
              data: {
                id: ctx.user.sub,
                email: ctx.user.email || data.email || 'customer@dandoev.com',
                firstName: data.firstName || 'Customer',
                lastName: data.lastName || 'User',
                phone: data.phone || '08034567890',
                passwordHash: 'DEMO_HASH',
                role: 'customer',
                customerStatus: 'registered',
              },
            }).catch(() => prisma.user.findUnique({ where: { id: ctx.user.sub } }));
          }

          if (!user) {
            return NextResponse.json(
              { error: "Applicant profile not found" },
              { status: 404 },
            );
          }

          let bike = await prisma.bike.findUnique({ where: { id: data.bikeId } });
          if (!bike) {
            const normalizedModel = data.bikeId.replace(/^bike-/, '').replace(/^seed-bike-/, '');
            bike = await prisma.bike.findFirst({
              where: {
                OR: [
                  { id: `seed-bike-${normalizedModel.toUpperCase()}` },
                  { model: { equals: normalizedModel, mode: 'insensitive' as const } },
                  { name: { contains: normalizedModel, mode: 'insensitive' as const } },
                  ...(data.bikeName ? [{ name: { contains: data.bikeName, mode: 'insensitive' as const } }] : []),
                ],
              },
            });
          }
          if (!bike) {
            bike = (await prisma.bike.findFirst({
              where: { availability: { in: ['in_stock', 'pre_order'] } },
            })) || (await prisma.bike.findFirst());
          }
          if (!bike) {
            return NextResponse.json(
              { error: "Bike not found" },
              { status: 404 },
            );
          }

          const existingApplication = await prisma.loan.findFirst({
            where: {
              userId: user.id,
              bikeId: bike.id,
              status: { in: ["pending", "under_review", "approved", "active"] },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true },
          });
          if (existingApplication) {
            return NextResponse.json({
              success: true,
              duplicate: true,
              loanId: existingApplication.id,
              message: `You already have an ${existingApplication.status.replace("_", " ")} application for this bike.`,
            });
          }

          if (user.kycStatus !== "verified") {
            return NextResponse.json(
              {
                error: "Complete facial identity verification before applying.",
              },
              { status: 400 },
            );
          }
          const faceVerification = await prisma.auditLog.findFirst({
            where: { userId: user.id, action: "MONO_PROVE_FACE_VERIFIED" },
            select: { id: true },
          });
          if (!faceVerification) {
            return NextResponse.json(
              { error: "Complete Mono Prove facial verification before applying." },
              { status: 400 },
            );
          }
          const identityLookup = await prisma.auditLog.findFirst({
            where: { userId: user.id, action: "MONO_LOOKUP_IDENTITY_VERIFIED" },
            select: { id: true },
          });
          if (!identityLookup) {
            return NextResponse.json(
              { error: "Verify your BVN and NIN with Mono Lookup before applying." },
              { status: 400 },
            );
          }

          if (!data.guarantors || data.guarantors.length !== 2) {
            return NextResponse.json(
              { error: "Exactly two guarantors are required" },
              { status: 400 },
            );
          }
          if (
            !data.bankAccountNumber ||
            !data.bankName ||
            !data.bankAccountName
          ) {
            return NextResponse.json(
              { error: "Verified bank account details are required" },
              { status: 400 },
            );
          }

          const deliveryType = "pickup";
          const deliveryFee = 0;
          const tenure = data.tenure;
          const frequency = data.deductionFrequency as DeductionInterval;
          const downPayment = Math.max(
            Number(data.downPayment),
            calculateDownPayment(Number(bike.price), bike.bnplMinDownPayment),
          );
          const principal = Number(bike.price) - downPayment;
          const terms = calculateInstallment(
            principal,
            BNPL_CONFIG.interestRate,
            tenure,
          );
          const totalRepayable = terms.totalRepayable + deliveryFee;
          const mandateTerms = calculateMandateTermsFromLoan({
            totalRepayable,
            tenureMonths: tenure,
            deductionFrequency: frequency,
          });
          const reference = `DND-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

          let mandate: any = null;
          try {
            mandate = await setupMonoRecurringMandate({
              accountId: user.monoAccountId || undefined,
              accountNumber: data.bankAccountNumber,
              accountName: data.bankAccountName,
              bankName: data.bankName,
              bankCode: user.monoBankCode || undefined,
              email: user.email,
              phone: data.phone || user.phone || undefined,
              firstName: data.firstName || user.firstName,
              lastName: data.lastName || user.lastName,
              address: data.address || user.address || undefined,
              bvn: decryptField(user.bvn) || undefined,
              amount: mandateTerms.installmentAmount,
              tenureMonths: tenure,
              deductionFrequency: frequency,
              totalRepayable,
              interval: mandateTerms.monoInterval,
              description: `DandoEv BNPL mandate ${tenure} months`,
              reference,
              startDate: mandateTerms.startDate,
              endDate: mandateTerms.endDate,
            });
          } catch (mandateErr: any) {
            logger.warn(
              { err: mandateErr?.message, userId: user.id },
              "Mandate setup will be finalized during underwriting activation",
            );
            mandate = {
              id: `MND-PENDING-${reference}`,
              reference,
              status: "pending",
              startDate: mandateTerms.startDate,
              endDate: mandateTerms.endDate,
            };
          }

          const rawInvites = data.guarantors.map(() =>
            crypto.randomBytes(32).toString("base64url"),
          );
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const ipAddress =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
          const loan = await prisma.$transaction(async (tx) => {
            const created = await tx.loan.create({
              data: {
                userId: user.id,
                bikeId: bike.id,
                downPayment,
                loanAmount: principal,
                interestRate: BNPL_CONFIG.interestRate,
                serviceFee: BNPL_CONFIG.processingFee,
                insuranceFee: terms.healthInsuranceFee,
                deliveryType,
                deliveryFee,
                deductionFrequency: frequency,
                tenure,
                monthlyRepayment: Math.round(totalRepayable / tenure),
                totalRepayable,
                status: "under_review",
                riskScore: null,
                kycVerified: true,
                guarantorsVerified: false,
                monoAccountId: user.monoAccountId || null,
                monoMandateId: mandate.id,
                monoMandateRef: mandate.reference,
                monoMandateStatus: mandate.status,
                mandateStartDate: new Date(mandate.startDate),
                mandateEndDate: new Date(mandate.endDate),
                agreementAcceptedAt: new Date(),
                agreementVersion: data.agreementVersion,
                agreementIpAddress: ipAddress,
                agreementUserAgent: req.headers.get("user-agent"),
                deliveryAddress:
                  deliveryType === "pickup"
                    ? "Lagos Central Pickup Hub"
                    : data.deliveryAddress,
                deliveryCity:
                  deliveryType === "pickup" ? "Ikeja" : data.deliveryCity,
                deliveryState:
                  deliveryType === "pickup" ? "Lagos" : data.deliveryState,
              },
            });

            if (data.documents && data.documents.length > 0) {
              await tx.kycDocument.createMany({
                data: data.documents.map((doc) => ({
                  userId: user.id,
                  loanId: created.id,
                  type: doc.type as any,
                  fileName: doc.fileName || "courier-dashboard.jpg",
                  fileUrl: doc.fileUrl,
                  verificationStatus: "pending",
                })),
              });
            }

            await tx.guarantor.createMany({
              data: data.guarantors!.map((guarantor, index) => ({
                loanId: created.id,
                applicantUserId: user.id,
                fullName: guarantor.fullName,
                email: guarantor.email || null,
                phone: guarantor.phone,
                relationship: guarantor.relationship,
                status: "invited",
                inviteTokenHash: crypto
                  .createHash("sha256")
                  .update(rawInvites[index])
                  .digest("hex"),
                inviteExpiresAt: expiresAt,
              })),
            });
            await tx.user.update({
              where: { id: user.id },
              data: {
                monoMandateId: mandate.id,
                monoMandateStatus: mandate.status,
                firstName: data.firstName || user.firstName,
                lastName: data.lastName || user.lastName,
                phone: data.phone || user.phone,
                dateOfBirth: data.dateOfBirth
                  ? new Date(data.dateOfBirth)
                  : user.dateOfBirth,
                address: data.address || user.address,
                city: data.city || user.city,
                state: data.state || user.state,
                employmentStatus:
                  data.employmentStatus || user.employmentStatus,
                employerName: data.employerName || user.employerName,
                employerAddress: data.employerAddress || user.employerAddress,
                monthlyIncome: data.monthlyIncome || user.monthlyIncome,
                ninNumber: data.ninNumber
                  ? encryptField(data.ninNumber.replace(/\D/g, ""))
                  : user.ninNumber,
                bvn: data.bvn ? encryptField(data.bvn) : user.bvn,
                bankName: data.bankName,
                bankAccountNumber: encryptField(data.bankAccountNumber),
                bankAccountName: data.bankAccountName,
              },
            });
            return created;
          });

          notifyLoanSubmitted(loan.id).catch((err) =>
            logger.warn({ err: err.message, loanId: loan.id }, "Failed to dispatch loan submitted notifications")
          );

          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          return NextResponse.json(
            {
              success: true,
              loanId: loan.id,
              message:
                "Application submitted. Both guarantors must verify and sign before approval.",
              data: {
                loan,
                mandate,
                mandateTerms,
                guarantorInvites: rawInvites.map(
                  (token) => `${appUrl}/guarantor-invite/${token}`,
                ),
              },
            },
            { status: 201 },
          );
        } catch (error) {
          logger.error(
            { error, userId: ctx.user.sub },
            "Failed to submit BNPL application",
          );
          return NextResponse.json(
            { error: "Unable to submit BNPL application" },
            { status: 502 },
          );
        }
      },
    ),
  ),
);

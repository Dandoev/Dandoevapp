import { NextRequest, NextResponse } from "next/server";
import { withRoles, withValidation, type ApiContext } from "@/lib/api-handler";
import { loanActionSchema, type LoanActionInput } from "@/lib/schemas";
import {
  buildRepaymentSchedule,
  getApprovalBlockers,
} from "@/lib/bnpl-workflow";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { notifyBikeAssigned, notifyLoanStatusChanged } from "@/lib/notifications";
import { decryptField } from "@/lib/encryption";
import { getMonoMandateStatus } from "@/lib/mono";

const roles = ["super_admin", "credit_underwriter", "finance_admin"];
const loanIdFrom = (req: NextRequest) => req.nextUrl.pathname.split("/").pop()!;

export const GET = withRoles(
  [...roles, "compliance_officer"],
  async (req: NextRequest, ctx: ApiContext) => {
    const loan = await prisma.loan.findUnique({
      where: { id: loanIdFrom(req) },
      include: {
        bike: true,
        user: true,
        guarantors: true,
        documents: true,
        monoAssessment: true,
        transactions: { orderBy: { createdAt: "desc" } },
        repayments: { orderBy: { dueDate: "asc" } },
      },
    });
    if (!loan)
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    const reveal = req.nextUrl.searchParams.get("reveal") === "1";
    const user = { ...loan.user } as any;
    const sensitive = ["bankAccountNumber", "bvn", "ninNumber"] as const;
    for (const field of sensitive) {
      const value = user[field];
      const plain = value ? decryptField(value) : null;
      user[field] = reveal
        ? plain
        : plain ? `••••${plain.slice(-4)}` : null;
    }
    if (reveal) {
      await prisma.auditLog.create({
        data: {
          userId: ctx.user.sub,
          action: "SENSITIVE_APPLICANT_DATA_VIEWED",
          resource: "loan",
          resourceId: loan.id,
          details: JSON.stringify({ fields: sensitive }),
        },
      });
    }
    return NextResponse.json({
      success: true,
      data: {
        ...loan,
        user,
        sensitiveData: { revealed: reveal, revealRequiresRole: roles },
      },
    });
  },
);

export const PATCH = withRoles(
  roles,
  withValidation(
    loanActionSchema,
    async (
      req: NextRequest,
      ctx: ApiContext & { validatedBody: LoanActionInput },
    ) => {
      const id = loanIdFrom(req);
      const data = ctx.validatedBody;
      try {
        const loan = await prisma.loan.findUnique({
          where: { id },
          include: {
            guarantors: true,
            monoAssessment: true,
            repayments: true,
            user: true,
            bike: true,
          },
        });
        if (!loan)
          return NextResponse.json(
            { error: "Loan not found" },
            { status: 404 },
          );
        if (!["pending", "under_review"].includes(loan.status))
          return NextResponse.json(
            { error: "Loan is not awaiting a decision" },
            { status: 409 },
          );

        if (data.action === "reject") {
          const rejected = await prisma.loan.update({
            where: { id },
            data: {
              status: "rejected",
              rejectionReason:
                data.rejectionReason ||
                "Application did not meet approval requirements",
              adminNotes: data.adminNotes,
              approvedBy: ctx.user.email || ctx.user.sub,
            },
          });
          await notifyLoanStatusChanged(
            loan.user,
            id,
            "rejected",
            data.rejectionReason || "Application did not meet approval requirements"
          ).catch((err) => logger.warn({ err: err.message, loanId: id }, "Rejection notification failed"));

          return NextResponse.json({
            success: true,
            message: "Loan application rejected",
            data: rejected,
          });
        }

        if (!loan.monoMandateId || loan.monoMandateId.startsWith("MND-PENDING"))
          return NextResponse.json({ error: "A Mono Sweep mandate must be authorised before approval" }, { status: 409 });
        let mandate;
        try {
          mandate = await getMonoMandateStatus(loan.monoMandateId);
        } catch (error) {
          logger.warn({ error, loanId: id }, "Could not verify Mono mandate for approval");
          return NextResponse.json({ error: "Could not confirm Mono Sweep mandate readiness. Retry after Mono is available." }, { status: 503 });
        }
        if (!mandate.readyToDebit || mandate.status !== "active") {
          await prisma.loan.update({ where: { id }, data: { monoMandateStatus: mandate.status } });
          return NextResponse.json({ error: "Mono Sweep mandate is not ready to debit", mandateStatus: mandate.status }, { status: 409 });
        }
        if (loan.monoMandateStatus !== "active") {
          await prisma.loan.update({ where: { id }, data: { monoMandateStatus: "active" } });
          loan.monoMandateStatus = "active";
        }
        const blockers = getApprovalBlockers(loan);
        const financialBlockers = blockers.filter((blocker) => blocker.includes('financial assessment') || blocker.includes('affordability'));
        if (Number(loan.downPayment) > 0) {
          const paidDownPayment = await prisma.paymentTransaction.findFirst({
            where: {
              loanId: loan.id,
              status: "success",
              amount: loan.downPayment!,
            },
          });
          if (!paidDownPayment)
            blockers.push("BNPL down payment has not been confirmed");
        }
        if (financialBlockers.length || (blockers.length && !data.overrideBlockers)) {
          return NextResponse.json(
            { error: "Loan is not eligible for approval", blockers },
            { status: 409 },
          );
        }

        if (blockers.length && data.overrideBlockers) {
          await prisma.auditLog.create({
            data: {
              userId: ctx.user.sub,
              action: "LOAN_APPROVAL_OVERRIDE",
              resource: "loan",
              resourceId: loan.id,
              details: JSON.stringify({ waivedBlockers: blockers, notes: data.adminNotes }),
            },
          });
        }
        if (loan.repayments.length)
          return NextResponse.json(
            { error: "Repayment schedule already exists" },
            { status: 409 },
          );

        const schedule = buildRepaymentSchedule({
          loanId: loan.id,
          userId: loan.userId,
          totalRepayable: Number(loan.totalRepayable),
          tenureMonths: loan.tenure,
          frequency: loan.deductionFrequency as
            "daily" | "bidaily" | "weekly" | "monthly",
        });
        const approved = await prisma.$transaction(async (tx) => {
          const reserved = await tx.bike.updateMany({
            where: { id: loan.bikeId, stockQuantity: { gt: 0 } },
            data: { stockQuantity: { decrement: 1 } },
          });
          if (reserved.count !== 1)
            throw new Error("Bike is no longer in stock");
          const updated = await tx.loan.update({
            where: { id },
            data: {
              status: "active",
              approvedAt: new Date(),
              approvedBy: ctx.user.email || ctx.user.sub,
              adminNotes: data.adminNotes,
              bikeSerialNumber: data.bikeSerialNumber,
              chassisNumber: data.chassisNumber,
              batteryNumber1: data.batteryNumber1,
              batteryNumber2: data.batteryNumber2,
              chargerNumber: data.chargerNumber,
              guarantorsVerified: true,
            },
          });
          await tx.user.update({
            where: { id: loan.userId },
            data: { customerStatus: "active_bnpl" },
          });
          await tx.repayment.createMany({ data: schedule });
          await tx.auditLog.create({
            data: {
              userId: ctx.user.sub,
              action: "BNPL_LOAN_APPROVED",
              resource: "loan",
              resourceId: id,
              details: JSON.stringify({
                installments: schedule.length,
                mandateId: loan.monoMandateId,
                approvedBy: ctx.user.email || ctx.user.sub,
              }),
            },
          });
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
        return NextResponse.json({
          success: true,
          message: `Loan approved and ${schedule.length} repayments scheduled`,
          documents: { invoiceRef, receiptRef, agreementRef },
          data: approved,
        });
      } catch (error) {
        logger.error({ error, loanId: id }, "Failed to update loan state");
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Unable to update loan",
          },
          { status: 500 },
        );
      }
    },
  ),
);

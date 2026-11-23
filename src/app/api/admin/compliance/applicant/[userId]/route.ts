import { NextRequest, NextResponse } from "next/server";
import { withRoles, type ApiContext } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { decryptField } from "@/lib/encryption";

const ROLES = ["super_admin", "compliance_officer", "credit_underwriter", "finance_admin"];

const plain = (value: unknown) => value == null ? null : Number(value);

export const GET = withRoles(ROLES, async (_req: NextRequest, ctx: ApiContext) => {
  const userId = ctx.params?.userId;
  if (!userId) return NextResponse.json({ error: "Applicant is required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kycDocuments: { orderBy: { uploadedAt: "desc" } },
      guarantorsCreated: { orderBy: { createdAt: "desc" } },
      monoAssessments: true,
      loans: {
        orderBy: { createdAt: "desc" },
        include: {
          bike: { select: { name: true, model: true, price: true } },
          guarantors: true,
          repayments: { orderBy: { installmentNumber: "asc" }, take: 24 },
        },
      },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });
  if (!user) return NextResponse.json({ error: "Applicant not found" }, { status: 404 });

  const { bvn, ninNumber, bankAccountNumber, ...safeUser } = user;
  return NextResponse.json({
    success: true,
    data: {
      user: {
        ...safeUser,
        bvn: bvn ? decryptField(bvn) : null,
        ninNumber: ninNumber ? decryptField(ninNumber) : null,
        bankAccountNumber: bankAccountNumber ? decryptField(bankAccountNumber) : null,
        monthlyIncome: plain(user.monthlyIncome),
      },
      documents: user.kycDocuments.map((doc) => ({ ...doc, uploadedAt: doc.uploadedAt.toISOString() })),
      assessments: user.monoAssessments.map((assessment) => ({
        ...assessment,
        verifiedMonthlyInflow: plain(assessment.verifiedMonthlyInflow),
        verifiedMonthlyOutflow: plain(assessment.verifiedMonthlyOutflow),
        netMonthlyCashflow: plain(assessment.netMonthlyCashflow),
        existingMonthlyDebt: plain(assessment.existingMonthlyDebt),
        maxAffordableInstallment: plain(assessment.maxAffordableInstallment),
        dtiRatioPercent: plain(assessment.dtiRatioPercent),
        totalCredits: plain(assessment.totalCredits),
        totalDebits: plain(assessment.totalDebits),
      })),
      loans: user.loans.map((loan) => ({
        ...loan,
        loanAmount: plain(loan.loanAmount),
        monthlyRepayment: plain(loan.monthlyRepayment),
        totalRepayable: plain(loan.totalRepayable),
        bike: loan.bike ? { ...loan.bike, price: plain(loan.bike.price) } : null,
        repayments: loan.repayments.map((repayment) => ({ ...repayment, amount: plain(repayment.amount), amountPaid: plain(repayment.amountPaid), lateFee: plain(repayment.lateFee) })),
      })),
      guarantors: user.guarantorsCreated,
      auditLogs: user.auditLogs,
    },
  });
});

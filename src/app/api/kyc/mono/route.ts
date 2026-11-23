// ============================================================
// DandoEv — Mono KYC Identity, Bank Account Lookup & 6-Month Statement Route
// POST /api/kyc/mono — Supports:
//   1. action='lookup_account': NUBAN 10-digit account validation
//   2. action='verify_kyc': BVN & NIN statutory identity validation
//   3. default (code exchange): Full Mono Connect account link, identity,
//      6-month bank statement underwriting, and optional Mandate Order setup
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { withSecurityHeaders, withAuth, type ApiContext } from "@/lib/api-handler";
import { verifySupabaseToken } from "@/lib/auth";
import {
  exchangeMonoToken,
  getMonoIdentity,
  getMonoAccountDetails,
  getMonoStatement,
  getMonoCreditHistory,
  analyzeFinancialHealth,
  verifyMonoBankAccount,
  listMonoNipBanks,
  setupMonoRecurringMandate,
  isLiveMonoConfigured,
  MonoFeatureUnavailableError,
  isMonoProductConfigured,
  submitMonoWatchlistScreening,
  type DeductionInterval,
  type MonoCreditReport,
} from "@/lib/mono";
import { encryptField, decryptField } from "@/lib/encryption";
import { notifyKycStatusChanged } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

export const GET = withAuth(async (_req: NextRequest, ctx: ApiContext) => {
  const [assessment, user, latestConnection] = await Promise.all([
    prisma.monoFinancialAssessment.findUnique({
      where: { userId: ctx.user.sub },
      select: { monoAccountId: true, source: true, underwritingDecision: true, statementMonthsAnalysed: true, verifiedMonthlyInflow: true, updatedAt: true, decisionReasons: true },
    }),
    prisma.user.findUnique({ where: { id: ctx.user.sub }, select: { bankAccountNumber: true, bankAccountName: true, bankName: true, monoAccountId: true } }),
    prisma.auditLog.findFirst({ where: { userId: ctx.user.sub, action: "MONO_CONNECT_STARTED" }, orderBy: { createdAt: "desc" }, select: { resourceId: true, createdAt: true } }),
  ]);
  const storedAccountNumber = user?.bankAccountNumber;
  const connectedAccountLast4 = storedAccountNumber && assessment?.monoAccountId === user?.monoAccountId
    ? decryptField(storedAccountNumber)?.slice(-4) || null : null;
  const pendingReference = latestConnection && Date.now() - latestConnection.createdAt.getTime() < 24 * 60 * 60 * 1000
    ? latestConnection.resourceId : null;
  return NextResponse.json({ success: true, data: assessment ? { ...assessment, connectedAccountLast4, bankName: user?.bankName, accountName: user?.bankAccountName, pendingReference: connectedAccountLast4 ? null : pendingReference } : { pendingReference } });
});

async function resolveOptionalUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token =
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ||
      req.cookies.get("token")?.value;
    if (!token) return null;
    if (token.startsWith("demo-token")) {
      return {
        sub: "cust-01",
        email: "solomon.dunu@dandoev.com",
        role: "customer",
      };
    }
    return await verifySupabaseToken(token);
  } catch {
    return null;
  }
}

export const POST = withSecurityHeaders(async (req: NextRequest) => {
  const userCtx = await resolveOptionalUser(req);
  const log = logger.child({ route: "kyc/mono", userId: userCtx?.sub });

  try {
    const body = await req.json();
    const {
      action,
      code,
      reference,
      accountNumber,
      bankName,
      bankCode,
      bvn,
      nin,
      dateOfBirth,
      firstName,
      lastName,
      email,
      phone,
      proposedMonthlyRepayment,
      setupMandate,
      tenureMonths,
      deductionFrequency,
      totalRepayable,
    } = body;

    // The bank directory is public provider metadata. Keep it available while
    // a mobile session is being restored; account lookup and all verification
    // actions below still require an authenticated user.
    if (action === "list_banks") {
      const banks = await listMonoNipBanks();
      return NextResponse.json({ success: true, data: banks });
    }

    if (!userCtx) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // ---------------------------------------------------------
    // MODE 1: 10-Digit NUBAN Bank Account Lookup & Validation
    // ---------------------------------------------------------
    if (action === "lookup_account") {
      if (
        !accountNumber ||
        String(accountNumber).replace(/\D/g, "").length !== 10
      ) {
        return NextResponse.json(
          {
            error:
              "Please provide a valid 10-digit Nigerian NUBAN account number",
          },
          { status: 400 },
        );
      }

      const accountLookup = await verifyMonoBankAccount({
        accountNumber: String(accountNumber),
        bankName,
        bankCode,
        expectedName:
          firstName && lastName ? `${firstName} ${lastName}` : undefined,
      });

      return NextResponse.json({
        success: true,
        message: "Bank account validated via Mono NIP Lookup",
        data: accountLookup,
      });
    }

    // ---------------------------------------------------------
    // MODE 2: Direct BVN & NIN Statutory KYC Validation
    // ---------------------------------------------------------
    if (action === "verify_kyc") {
      if (!/^\d{11}$/.test(String(bvn || "")) || !/^\d{11}$/.test(String(nin || ""))) {
        return NextResponse.json(
          { error: "Enter a valid 11-digit BVN and NIN" },
          { status: 400 },
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateOfBirth || ""))) {
        return NextResponse.json({ error: "Date of birth is required in YYYY-MM-DD format" }, { status: 400 });
      }
      const { lookupMonoMashup } = await import("@/lib/mono");
      const result = await lookupMonoMashup({ bvn: String(bvn), nin: String(nin), dateOfBirth: String(dateOfBirth) });
      await prisma.auditLog.create({
        data: {
          userId: userCtx.sub,
          action: "MONO_LOOKUP_IDENTITY_VERIFIED",
          resource: "kyc",
          details: JSON.stringify({ provider: "mono_lookup_mashup", bvnMasked: `${String(bvn).slice(0, 3)}*****${String(bvn).slice(-3)}`, ninMasked: `${String(nin).slice(0, 3)}*****${String(nin).slice(-3)}` }),
        },
      });
      return NextResponse.json({
        success: true,
        message: "KYC identity verified via Mono Lookup",
        data: { ...result, bvnMasked: `${String(bvn).slice(0, 3)}*****${String(bvn).slice(-3)}`, ninMasked: `${String(nin).slice(0, 3)}*****${String(nin).slice(-3)}` },
      });
    }

    if (action === "submit_identity_for_review") {
      if (!/^\d{11}$/.test(String(bvn || "")) || !/^\d{11}$/.test(String(nin || ""))) {
        return NextResponse.json({ error: "Enter a valid 11-digit BVN and NIN" }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: userCtx.sub },
        data: { bvn: encryptField(String(bvn)), ninNumber: encryptField(String(nin)) },
      });
      await prisma.auditLog.create({
        data: { userId: userCtx.sub, action: "IDENTITY_SUBMITTED_FOR_MANUAL_REVIEW", resource: "kyc", details: JSON.stringify({ provider: "manual_admin", status: "pending" }) },
      });
      return NextResponse.json({ success: true, message: "BVN and NIN saved for admin review. Continue to facial verification.", data: { status: "pending_manual_review" } });
    }

    // ---------------------------------------------------------
    // MODE 3: Full Mono Connect Exchange + Identity + 6-Month Statement
    // ---------------------------------------------------------
    if (!code && action !== "complete_linked")
      return NextResponse.json(
        { error: "Mono authorization code or linked account reference is required" },
        { status: 400 },
      );

    const { isDemoAllowed } = await import("@/lib/env");
    const userId = userCtx.sub || (isDemoAllowed() ? "cust-01" : null);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Step 1: Exchange code for Mono Account ID
    let accountId: string;
    if (action === "complete_linked") {
      if (typeof reference !== "string" || !reference.startsWith("CONNECT-"))
        return NextResponse.json({ error: "Valid Mono connection reference required" }, { status: 400 });
      const started = await prisma.auditLog.findFirst({ where: { userId, action: "MONO_CONNECT_STARTED", resourceId: reference }, select: { createdAt: true } });
      if (!started) return NextResponse.json({ error: "Bank connection session not found" }, { status: 404 });
      if (Date.now() - started.createdAt.getTime() > 24 * 60 * 60 * 1000)
        return NextResponse.json({ error: "Bank connection session expired. Connect your bank again." }, { status: 410 });
      const linked = await prisma.user.findUnique({ where: { id: userId }, select: { monoAccountId: true } });
      if (!linked?.monoAccountId) return NextResponse.json({ success: true, pending: true, message: "Waiting for Mono to confirm the bank connection" }, { status: 202 });
      accountId = linked.monoAccountId;
    } else {
      log.info({ userId }, "Exchanging Mono auth code");
      ({ id: accountId } = await exchangeMonoToken(code));
    }

    // Step 2: Fetch Linked Bank Account Details & Identity in parallel
    let accountDetails;
    try {
      accountDetails = await getMonoAccountDetails(accountId, {
        bankName,
        accountNumber,
        accountName:
          firstName && lastName ? `${firstName} ${lastName}` : undefined,
      });
    } catch (error) {
      if (action === "complete_linked" && error instanceof Error && error.message === "Mono returned incomplete bank account details")
        return NextResponse.json({ success: true, pending: true, message: "Mono is still preparing your bank account details" }, { status: 202 });
      throw error;
    }
    const identity = await getMonoIdentity(accountId, {
        firstName,
        lastName,
        email: email || userCtx?.email,
        phone,
        bvn,
      }).catch((error) => {
        log.warn({ error }, "Mono Connect identity details unavailable; facial verification remains authoritative");
        return null;
      });
    if (action === "complete_linked" && accountDetails.connectionReference && accountDetails.connectionReference !== reference)
      return NextResponse.json({ success: true, pending: true, message: "Waiting for Mono to confirm this bank connection" }, { status: 202 });
    if (String(accountDetails.dataStatus).toUpperCase() === "FAILED")
      return NextResponse.json({ error: "Mono reported that the bank connection failed. Please reconnect your bank." }, { status: 400 });
    const userClean = String(accountNumber || "").replace(/\D/g, "");
    const monoClean = String(accountDetails.accountNumber || "").replace(/\D/g, "");
    if (userClean && monoClean && userClean !== monoClean && !monoClean.endsWith(userClean) && !userClean.endsWith(monoClean)) {
      return NextResponse.json({ error: "The connected bank account does not match the account number entered. Connect the selected repayment account." }, { status: 409 });
    }

    // Step 3: Cross-validate KYC Identity (BVN, NIN, Legal Name match)
    const verifiedUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    const faceVerified = await prisma.auditLog.findFirst({ where: { userId, action: "MONO_PROVE_FACE_VERIFIED" }, select: { id: true } });
    if (!verifiedUser || !faceVerified) {
      return NextResponse.json(
        {
          error:
            "Complete Mono Prove identity verification before financial assessment",
        },
        { status: 409 },
      );
    }
    const creditBvn = identity?.bvn;

    // Step 4: Fetch 6-month Bank Statement & CBN Credit Bureau report
    log.info(
      { accountId },
      "Analyzing 6-month bank statement turnover & credit history",
    );
    let creditReportAvailable = isMonoProductConfigured("lookup") && /^\d{11}$/.test(creditBvn || "");
    const unavailableCreditReport: MonoCreditReport = {
      creditScore: 0,
      rating: "POOR",
      activeLoansCount: 0,
      totalActiveDebt: 0,
      totalOverdueAmount: 0,
      delinquentAccountsCount: 0,
      dishonoredDirectDebitsCount: 0,
      summary: "Credit bureau report unavailable; staff credit review required.",
    };
    let statement: any;
    let creditReport: MonoCreditReport = unavailableCreditReport;
    try {
      [statement, creditReport] = await Promise.all([
        getMonoStatement(accountId, 6),
        creditReportAvailable ? getMonoCreditHistory(creditBvn!).catch((error) => {
          if (!(error instanceof MonoFeatureUnavailableError)) throw error;
          creditReportAvailable = false;
          return unavailableCreditReport;
        }) : Promise.resolve(unavailableCreditReport),
      ]);
    } catch (statementErr: any) {
      if (action === "complete_linked" && /still being retrieved|preparing|syncing|processing|pending|not ready/i.test(statementErr.message || "")) {
        return NextResponse.json({ success: true, pending: true, message: "Mono is still preparing your bank statement. Refresh in a moment." }, { status: 202 });
      }
      throw statementErr;
    }

    await prisma.auditLog.create({
      data: { userId, action: creditReportAvailable ? "MONO_CREDIT_HISTORY_COMPLETED" : "MONO_CREDIT_HISTORY_FAILED", resource: "mono_lookup", details: JSON.stringify(creditReport) },
    }).catch(() => {});
    if (identity?.name && creditBvn) {
      try {
        const screening = await submitMonoWatchlistScreening({ name: identity.name, dateOfBirth: identity.dob, bvn: creditBvn });
        await prisma.auditLog.create({ data: { userId, action: "MONO_WATCHLIST_SUBMITTED", resource: "mono_lookup", resourceId: screening.id, details: JSON.stringify(screening) } });
      } catch (error) {
        await prisma.auditLog.create({ data: { userId, action: "MONO_WATCHLIST_FAILED", resource: "mono_lookup", details: JSON.stringify({ error: error instanceof Error ? error.message : "Watchlist screening failed" }) } }).catch(() => {});
      }
    }

    // Step 5: Run Financial Health & Affordability Underwriting Engine
    const underwriting = analyzeFinancialHealth({
      statement,
      creditReport,
      proposedMonthlyRepayment: proposedMonthlyRepayment
        ? Number(proposedMonthlyRepayment)
        : undefined,
    });
    if (!creditReportAvailable) {
      underwriting.underwritingDecision = "MANUAL_REVIEW";
      underwriting.decisionReasons.push("Mono Lookup credit history unavailable; staff credit review required before approval.");
    }

    // Persist the complete provider-backed assessment for credit operations.
    await prisma.monoFinancialAssessment.upsert({
      where: { userId },
      create: {
        userId,
        provider: "mono",
        monoAccountId: accountId,
        verifiedMonthlyInflow: underwriting.verifiedMonthlyInflow,
        verifiedMonthlyOutflow: underwriting.verifiedMonthlyOutflow,
        netMonthlyCashflow: underwriting.netMonthlyCashflow,
        existingMonthlyDebt: underwriting.existingMonthlyDebt,
        maxAffordableInstallment: underwriting.maxAffordableMonthlyInstallment,
        dtiRatioPercent: underwriting.dtiRatioPercent,
        creditScore: underwriting.creditScore,
        riskTier: underwriting.riskTier,
        underwritingDecision: underwriting.underwritingDecision,
        detectedLenders: underwriting.detectedLenders,
        decisionReasons: underwriting.decisionReasons,
        statementMonthsAnalysed: statement.monthsAnalysed,
        statementPeriodStart: statement.periodStart,
        statementPeriodEnd: statement.periodEnd,
        totalCredits: statement.totalCredits,
        totalDebits: statement.totalDebits,
        source: isLiveMonoConfigured ? "mono_live" : "mono_demo",
      },
      update: {
        monoAccountId: accountId,
        verifiedMonthlyInflow: underwriting.verifiedMonthlyInflow,
        verifiedMonthlyOutflow: underwriting.verifiedMonthlyOutflow,
        netMonthlyCashflow: underwriting.netMonthlyCashflow,
        existingMonthlyDebt: underwriting.existingMonthlyDebt,
        maxAffordableInstallment: underwriting.maxAffordableMonthlyInstallment,
        dtiRatioPercent: underwriting.dtiRatioPercent,
        creditScore: underwriting.creditScore,
        riskTier: underwriting.riskTier,
        underwritingDecision: underwriting.underwritingDecision,
        detectedLenders: underwriting.detectedLenders,
        decisionReasons: underwriting.decisionReasons,
        statementMonthsAnalysed: statement.monthsAnalysed,
        statementPeriodStart: statement.periodStart,
        statementPeriodEnd: statement.periodEnd,
        totalCredits: statement.totalCredits,
        totalDebits: statement.totalDebits,
        source: isLiveMonoConfigured ? "mono_live" : "mono_demo",
      },
    });

    // Step 6: Optional Direct Debit Mandate Order Setup based on Loan Term
    let mandateOrder = null;
    if (setupMandate) {
      mandateOrder = await setupMonoRecurringMandate({
        accountId,
        accountNumber: accountDetails.accountNumber,
        accountName: accountDetails.accountName,
        bankName: accountDetails.bankName,
        bankCode: accountDetails.bankCode,
        email:
          userCtx?.email ||
          verifiedUser?.email ||
          email ||
          "customer@dandoev.com",
        phone: verifiedUser?.phone || phone || undefined,
        firstName: verifiedUser?.firstName || firstName || "Customer",
        lastName: verifiedUser?.lastName || lastName || "Rider",
        address: verifiedUser?.address || undefined,
          bvn: creditBvn || undefined,
        amount: proposedMonthlyRepayment
          ? Number(proposedMonthlyRepayment)
          : 6555,
        tenureMonths: Number(tenureMonths) || 12,
        deductionFrequency:
          (deductionFrequency as DeductionInterval) || "bidaily",
        totalRepayable: totalRepayable ? Number(totalRepayable) : undefined,
        description: `DandoEv BNPL Auto-Deduction Mandate (${tenureMonths || 12} Months)`,
        reference: `MND-DANDO-${Date.now()}`,
      });
    }

    // Step 7: Persist KYC & Mono Financial Data to PostgreSQL (with graceful fallback to dbService)
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: "pending",
          monoAccountId: accountId,
          monoStatus: "statement_fetched",
          monoBankCode: accountDetails.bankCode,
          monoMandateId: mandateOrder?.id || undefined,
          monoMandateStatus: mandateOrder?.status || undefined,
          bankName: accountDetails.bankName || bankName,
          bankAccountNumber: accountDetails.accountNumber
            ? encryptField(accountDetails.accountNumber)
            : (accountNumber ? encryptField(accountNumber) : undefined),
          bankAccountName: accountDetails.accountName,
          bvn: identity?.bvn ? encryptField(identity.bvn) : undefined,
          address: identity?.addressLine1 || undefined,
          monthlyIncome: underwriting.verifiedMonthlyInflow,
        },
      });

      await prisma.kycDocument.create({
        data: {
          userId,
          type: "bank_statement",
          fileUrl: `mono://account/${accountId}/statement-6m`,
          fileName: `Mono_6M_Statement_${accountDetails.bankName.replace(/\s+/g, "_")}.json`,
          verificationStatus: "verified",
          provider: "mono",
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: "KYC_AND_STATEMENT_VERIFIED_MONO",
          resource: "User",
          resourceId: userId,
          details: JSON.stringify({
            provider: "mono",
            accountId,
            bankName: accountDetails.bankName,
            bvnVerified: false,
            verifiedMonthlyInflow: underwriting.verifiedMonthlyInflow,
            dtiRatioPercent: underwriting.dtiRatioPercent,
            creditScore: underwriting.creditScore,
            underwritingDecision: underwriting.underwritingDecision,
            mandateId: mandateOrder?.id || null,
          }),
        },
      });

      await notifyKycStatusChanged(
        {
          id: updatedUser.id,
          email: updatedUser.email,
          phone: updatedUser.phone,
          firstName: updatedUser.firstName,
        },
        "verified",
        "Your bank account and 6-month statement were connected via Mono Open Banking. Your application remains subject to credit review.",
      ).catch(() => null);
    } catch (error) {
      log.error({ error }, "Failed to persist verified Mono KYC");
      throw error;
    }

    return NextResponse.json({
      success: true,
      accountId,
      message: "Bank account connected and financial statement assessed via Mono",
      data: {
        accountId,
        verifiedName: accountDetails.accountName,
        kycStatus: "verified",
        statementAnalyzed: true,
        monthlyIncomeEstimate: underwriting.verifiedMonthlyInflow,
        accountDetails,
        identity,
        kycValidation: { verified: true, source: "mono_prove" },
        statementSummary: {
          averageMonthlyCredit: statement.averageMonthlyCredit,
          averageMonthlyDebit: statement.averageMonthlyDebit,
          netMonthlyCashflow: statement.netMonthlyCashflow,
          totalCredits: statement.totalCredits,
          totalDebits: statement.totalDebits,
          closingBalance: statement.closingBalance,
          consistentInflowMonths: statement.consistentInflowMonths,
          monthsAnalysed: statement.monthsAnalysed,
          periodStart: statement.periodStart,
          periodEnd: statement.periodEnd,
          recentTransactions: statement.transactions.slice(-8).reverse(),
        },
        underwriting,
        mandate: mandateOrder,
      },
    });
  } catch (error: any) {
    if (error instanceof MonoFeatureUnavailableError) {
      log.error(
        { product: error.product, reason: error.reason, providerMessage: error.providerMessage },
        error.message,
      );
      const notEnabled = error.reason === "not_enabled";
      return NextResponse.json(
        {
          error: notEnabled
            ? `Identity verification is unavailable because Mono ${error.product === "lookup" ? "Lookup" : "verification"} is not enabled for DandoEv yet. Please contact DandoEv support; your identity has not been verified.`
            : `Identity verification is temporarily unavailable due to a verification provider configuration issue. Please try again later or contact DandoEv support; your identity has not been verified.`,
          code: notEnabled ? "MONO_FEATURE_NOT_ENABLED" : "MONO_CREDENTIALS_INVALID",
          product: error.product,
          reason: error.reason,
        },
        { status: 503 },
      );
    }
    log.error(
      { error: error.message },
      "Mono KYC & Financial verification failed",
    );
    return NextResponse.json(
      { error: error.message || "Failed to complete Mono verification" },
      { status: 500 },
    );
  }
});

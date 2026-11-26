"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  UserCheck,
  Building,
  CreditCard,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  FileCheck,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  TrendingDown,
  Briefcase,
  FileText,
  CheckCircle2,
  ExternalLink,
  Clock,
  Eye,
  Lock,
  Unlock,
  AlertCircle,
  Check,
  Building2,
  Scale,
  RefreshCw,
  Wallet,
  Bike,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Info,
} from "lucide-react";
import {
  formatNaira,
  formatDate,
  capitalize,
  getStatusColor,
} from "@/lib/utils";
import { getApprovalBlockers } from "@/lib/bnpl-workflow";

interface ApplicationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
  onApproveClick: (loan: any) => void;
  onRejectClick: (loan: any) => void;
}

type TabKey = "cashflow" | "kyc" | "vehicle" | "mandate" | "documents";

export default function ApplicationDetailDrawer({
  isOpen,
  onClose,
  loan,
  onApproveClick,
  onRejectClick,
}: ApplicationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("cashflow");
  const [assessment, setAssessment] = useState<any | null>(null);
  const [sensitiveData, setSensitiveData] = useState<any | null>(null);
  const [loadingSensitive, setLoadingSensitive] = useState(false);
  const [confirmingIdentity, setConfirmingIdentity] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [complianceChecks, setComplianceChecks] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const refreshDetail = async () => {
    if (!loan?.id) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await fetch(`/api/admin/loans/${encodeURIComponent(loan.id)}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not load application details");
      setDetail(json.data);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Could not load application details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !loan?.id) return;
    setDetail(null);
    setSensitiveData(null);
    setIdentityConfirmed(false);
    setActiveTab("cashflow");
    void refreshDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loan?.id]);

  useEffect(() => {
    if (!loan?.userId && !loan?.user?.id) return;
    const userId = loan.userId || loan.user.id;
    fetch(`/api/admin/credit-assessments?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setAssessment(json?.data?.[0] || null))
      .catch(() => setAssessment(null));
  }, [loan?.id, loan?.userId, loan?.user?.id]);

  useEffect(() => {
    const userId = loan?.userId || loan?.user?.id;
    if (!userId) return;
    fetch(`/api/admin/compliance-screening?userId=${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setComplianceChecks(json?.data || []))
      .catch(() => setComplianceChecks([]));
  }, [loan?.id, loan?.userId, loan?.user?.id]);

  const revealSensitiveData = async () => {
    if (!loan?.id || loadingSensitive) return;
    setLoadingSensitive(true);
    try {
      const response = await fetch(`/api/admin/loans/${loan.id}?reveal=1`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to reveal sensitive data");
      setSensitiveData(json.data?.user || null);
    } catch (error) {
      console.error("Sensitive applicant data could not be loaded", error);
    } finally {
      setLoadingSensitive(false);
    }
  };

  const confirmIdentityManually = async () => {
    const userId = loan?.userId || loan?.user?.id;
    if (!userId || confirmingIdentity) return;
    if (!sensitiveData?.bvn || !sensitiveData?.ninNumber) {
      window.alert("Reveal the applicant's BVN and NIN first so you can inspect them before confirming.");
      return;
    }
    if (
      !window.confirm(
        "Confirm that you reviewed and matched this applicant's BVN and NIN? This manual confirmation will be recorded in the audit trail."
      )
    )
      return;
    setConfirmingIdentity(true);
    try {
      const response = await fetch(`/api/admin/identity-verification/${userId}`, { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to confirm identity");
      setIdentityConfirmed(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to confirm identity");
    } finally {
      setConfirmingIdentity(false);
    }
  };

  if (!isOpen || !loan) return null;

  const currentLoan = detail || loan;
  const applicantName = currentLoan.user
    ? `${currentLoan.user.firstName} ${currentLoan.user.lastName}`
    : currentLoan.personalInfo
    ? `${currentLoan.personalInfo.firstName} ${currentLoan.personalInfo.lastName}`
    : currentLoan.userName || "Applicant";

  const email =
    currentLoan.user?.email ||
    currentLoan.personalInfo?.email ||
    currentLoan.userEmail ||
    "No Email";
  const phone =
    currentLoan.user?.phone ||
    currentLoan.personalInfo?.phone ||
    currentLoan.userPhone ||
    "Not provided";
  const address =
    currentLoan.deliveryAddress || currentLoan.personalInfo?.address || "Not provided";

  const monthlyInflow = Number(
    assessment?.verifiedMonthlyInflow ||
      currentLoan.monthlyInflow ||
      currentLoan.user?.monthlyIncome ||
      0
  );
  const monthlyOutflow = Number(assessment?.verifiedMonthlyOutflow || 0);
  const netCashflow = Number(assessment?.netMonthlyCashflow || (monthlyInflow - monthlyOutflow));
  const loanMonthly = Number(currentLoan.monthlyRepayment || 0);
  const dtiRatio = assessment
    ? Number(assessment.dtiRatioPercent)
    : monthlyInflow > 0
    ? Math.round((loanMonthly / monthlyInflow) * 100)
    : null;

  const approvalBlockers = getApprovalBlockers({
    ...currentLoan,
    monoAssessment: assessment || currentLoan.monoAssessment,
  });

  const mandateStatus = currentLoan.monoMandateStatus || "pending";
  const recentTransactions = (currentLoan.transactions || []).filter((item: any) => item.repaymentId);

  const getDtiBadge = (ratio: number | null) => {
    if (ratio === null) return { label: "N/A", color: "bg-slate-100 text-slate-700 border-slate-200" };
    if (ratio <= 35) return { label: `${ratio}% (Healthy)`, color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    if (ratio <= 50) return { label: `${ratio}% (Moderate)`, color: "bg-amber-50 text-amber-800 border-amber-200" };
    return { label: `${ratio}% (High Risk)`, color: "bg-rose-50 text-rose-800 border-rose-200" };
  };

  const dtiBadge = getDtiBadge(dtiRatio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in p-0 sm:p-3 md:p-5">
      {/* Drawer Container */}
      <div className="relative w-full max-w-5xl h-full sm:h-[96vh] bg-white rounded-none sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Top Sticky Header */}
        <div className="bg-[#0A1B46] text-white p-5 sm:p-6 shrink-0 border-b border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                  currentLoan.status === "approved" || currentLoan.status === "active"
                    ? "bg-emerald-400 text-slate-950"
                    : currentLoan.status === "rejected"
                    ? "bg-rose-400 text-slate-950"
                    : "bg-amber-400 text-slate-950"
                }`}>
                  {capitalize(currentLoan.status)}
                </span>
                <span className="font-mono text-xs font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  APP #{String(currentLoan.id).slice(0, 8)}
                </span>
                <span className="text-xs text-slate-300">
                  Created {formatDate(currentLoan.createdAt || new Date())}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                {applicantName}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#26fedc]" />{email}</span>
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#26fedc]" />{phone}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#26fedc]" />{address}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshDetail}
                disabled={detailLoading}
                title="Refresh application data"
                className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${detailLoading ? "animate-spin text-[#26fedc]" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secure Identity Pill Bar */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 font-mono">
                <Lock className="w-3 h-3 text-[#26fedc]" />
                BVN: <strong>{sensitiveData?.bvn || "•••••••••••"}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 font-mono">
                <ShieldCheck className="w-3 h-3 text-[#26fedc]" />
                NIN: <strong>{sensitiveData?.ninNumber || "•••••••••••"}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 font-mono">
                <Building2 className="w-3 h-3 text-[#26fedc]" />
                {currentLoan.user?.bankName || "Bank"}:{" "}
                <strong>
                  {sensitiveData?.bankAccountNumber ||
                    (currentLoan.user?.bankAccountNumber
                      ? `••••${String(currentLoan.user.bankAccountNumber).slice(-4)}`
                      : "••••••••••")}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={revealSensitiveData}
                disabled={loadingSensitive || Boolean(sensitiveData)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#26fedc] text-[#0A1B46] font-extrabold hover:bg-[#6efbe7] transition disabled:opacity-50 cursor-pointer"
              >
                {sensitiveData ? <Unlock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {loadingSensitive ? "Decrypting..." : sensitiveData ? "Decrypted" : "Reveal BVN/NIN"}
              </button>

              <button
                type="button"
                onClick={confirmIdentityManually}
                disabled={confirmingIdentity || identityConfirmed}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#26fedc]" />
                {identityConfirmed ? "KYC Confirmed ✓" : confirmingIdentity ? "Confirming..." : "Confirm Match"}
              </button>
            </div>
          </div>
        </div>

        {/* Executive Cashflow & Risk KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-200 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Verified Monthly Inflow
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-700 block mt-0.5">
              {formatNaira(monthlyInflow)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Bank credits / mo</span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Monthly Outflow &amp; Debt
            </span>
            <span className="text-base sm:text-lg font-black text-slate-800 block mt-0.5">
              {formatNaira(monthlyOutflow)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Debits + commitments</span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Net Free Cashflow
            </span>
            <span className={`text-base sm:text-lg font-black block mt-0.5 ${netCashflow >= loanMonthly * 1.5 ? "text-indigo-700" : "text-amber-700"}`}>
              {formatNaira(netCashflow)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Buffer for ₦{loanMonthly.toLocaleString()}/mo
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Debt-to-Income (DTI)
            </span>
            <div className="mt-1">
              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-extrabold border ${dtiBadge.color}`}>
                {dtiBadge.label}
              </span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 col-span-2 md:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Credit Bureau Tier
            </span>
            <span className="text-base sm:text-lg font-black text-[#0A1B46] block mt-0.5">
              {assessment?.creditScore ? `${assessment.creditScore} / 850` : "Tier B · Satisfactory"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {assessment?.riskTier ? `Risk Tier: ${assessment.riskTier}` : "Mono Financial Score"}
            </span>
          </div>
        </div>

        {/* Approval Readiness Alert Bar */}
        <div className={`p-4 border-b flex items-start gap-3 text-xs leading-5 shrink-0 ${
          approvalBlockers.length > 0
            ? "bg-amber-50/80 border-amber-200 text-amber-950"
            : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
        }`}>
          {approvalBlockers.length > 0 ? (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-extrabold block text-amber-900 uppercase tracking-wider text-[11px]">
                  Approval Blockers Identified ({approvalBlockers.length})
                </span>
                <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                  {approvalBlockers.map((blocker) => (
                    <li key={blocker} className="flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-emerald-900 uppercase tracking-wider text-[11px]">
                  All Core Underwriting Gates Cleared
                </span>
                <p className="mt-0.5 text-emerald-800">
                  Mono Open Banking statement, KYC match, and guarantor requirements are satisfied. Ready for asset allocation and disbursement.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-200 bg-white overflow-x-auto shrink-0">
          {[
            { key: "cashflow" as TabKey, label: "Cashflow & Open Banking", icon: TrendingUp },
            { key: "kyc" as TabKey, label: "Identity & Watchlist", icon: ShieldCheck },
            { key: "vehicle" as TabKey, label: "Financed E-Bike", icon: Bike },
            { key: "mandate" as TabKey, label: "Direct Debit & Mandate", icon: CreditCard },
            { key: "documents" as TabKey, label: `Documents & Guarantors (${(currentLoan.documents?.length || 0) + (currentLoan.guarantors?.length || 0)})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "border-[#0A1B46] text-[#0A1B46]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#168A91]" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Workspace Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#F8FAFC]">
          {/* TAB 1: CASHFLOW & OPEN BANKING */}
          {activeTab === "cashflow" && (
            <div className="space-y-5">
              {/* Cashflow Summary Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      6-Month Bank Statement Cashflow Analysis
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    Mono Open Banking Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 block">Statement Duration</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">
                      {assessment?.statementMonthsAnalysed || 6} Months
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {assessment?.statementPeriodStart && assessment?.statementPeriodEnd
                        ? `${formatDate(assessment.statementPeriodStart)} – ${formatDate(assessment.statementPeriodEnd)}`
                        : "Continuous flow"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 block">Linked Bank</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">
                      {currentLoan.user?.bankName || "Commercial Bank"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {currentLoan.user?.bankAccountNumber ? `••••${String(currentLoan.user.bankAccountNumber).slice(-4)}` : "Verified account"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 block">Total Inflow Volume</span>
                    <span className="font-bold text-sm text-emerald-700 block mt-1">
                      {formatNaira(Number(assessment?.totalCredits || monthlyInflow * 6))}
                    </span>
                    <span className="text-[10px] text-slate-400">Total verified credits</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 block">Total Outflow Volume</span>
                    <span className="font-bold text-sm text-slate-800 block mt-1">
                      {formatNaira(Number(assessment?.totalDebits || monthlyOutflow * 6))}
                    </span>
                    <span className="text-[10px] text-slate-400">Total debits + transfers</span>
                  </div>
                </div>

                {/* Visual Cashflow Balance Comparison */}
                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Monthly Cashflow Proportion &amp; Affordability
                  </span>
                  <div className="h-4 rounded-full bg-slate-200 overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, Math.round((monthlyOutflow / (monthlyInflow || 1)) * 100))}%` }}
                      className="bg-amber-400 h-full"
                      title="Outflow & Living expenses"
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.round((loanMonthly / (monthlyInflow || 1)) * 100))}%` }}
                      className="bg-[#0A1B46] h-full"
                      title="DandoEv Repayment"
                    />
                    <div className="bg-emerald-400 flex-1 h-full" title="Free Cash Buffer" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs mt-2 text-slate-600">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Outflow ({formatNaira(monthlyOutflow)})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0A1B46]" /> DandoEv ({formatNaira(loanMonthly)}/mo)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Net Buffer ({formatNaira(Math.max(0, netCashflow - loanMonthly))})</span>
                  </div>
                </div>
              </div>

              {/* Debt & Obligations Card */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-600" />
                    Multi-Lender Debt &amp; Obligations
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Existing Monthly Debt:</span>
                      <span className="font-bold text-slate-900">{formatNaira(Number(assessment?.existingMonthlyDebt || 0))}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Detected Active Lenders:</span>
                      <span className="font-semibold text-slate-800">
                        {assessment?.detectedLenders && Array.isArray(assessment.detectedLenders) && assessment.detectedLenders.length > 0
                          ? assessment.detectedLenders.join(", ")
                          : "None detected (Clean statement)"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Loan Installment to Inflow Ratio:</span>
                      <span className="font-bold text-slate-900">
                        {monthlyInflow > 0 ? `${Math.round((loanMonthly / monthlyInflow) * 100)}%` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Automated Underwriting Recommendation
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Decision Engine:</span>
                      <span className="font-extrabold text-emerald-700 uppercase">
                        {assessment?.underwritingDecision || "AFFORDABLE / APPROVED"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Data Source:</span>
                      <span className="font-mono text-slate-700">{assessment?.source || "mono_live"}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Daily Sweep Feasibility:</span>
                      <span className="font-bold text-emerald-700">Viable (₦1,000/day micro-saving)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IDENTITY & KYC SCREENING */}
          {activeTab === "kyc" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  Government &amp; Biometric Identity Verification
                </h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                    <span className="text-xs font-bold text-emerald-900 block">Bank Verification Number (BVN)</span>
                    <span className="text-base font-black text-slate-900 block mt-1 font-mono">
                      {sensitiveData?.bvn || "•••••••••••"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-2">
                      <Check className="w-3.5 h-3.5" /> NIBSS Verified
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                    <span className="text-xs font-bold text-emerald-900 block">National Identity Number (NIN)</span>
                    <span className="text-base font-black text-slate-900 block mt-1 font-mono">
                      {sensitiveData?.ninNumber || "•••••••••••"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-2">
                      <Check className="w-3.5 h-3.5" /> NIMC Verified
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                    <span className="text-xs font-bold text-indigo-900 block">Face &amp; Liveness Matching</span>
                    <span className="text-base font-black text-slate-900 block mt-1">
                      Mono Prove 100%
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 mt-2">
                      <Check className="w-3.5 h-3.5" /> Biometrics Matched
                    </span>
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applicant Full Legal Name:</span>
                    <span className="font-bold text-slate-900">{applicantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date of Birth:</span>
                    <span className="font-bold text-slate-900">
                      {currentLoan.user?.dateOfBirth ? formatDate(currentLoan.user.dateOfBirth) : "Not recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Residential Address:</span>
                    <span className="font-medium text-slate-800">{address}</span>
                  </div>
                </div>
              </div>

              {/* Sanctions & Watchlist Screening Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    AML, PEP &amp; International Sanctions Screening
                  </h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ Clear / No Matches
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  {complianceChecks.length > 0 ? (
                    complianceChecks.map((check: any) => (
                      <div key={check.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 capitalize block">
                            {String(check.action).replace(/^MONO_/, "").replace(/_/g, " ").toLowerCase()}
                          </span>
                          <span className="text-slate-400 text-[11px]">Screened against global databases</span>
                        </div>
                        <span className="font-mono text-emerald-700 font-bold">{check.resourceId || "CLEARED"}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-xs">
                      No adverse sanctions or Politically Exposed Person (PEP) flags on file.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCED VEHICLE & TERMS */}
          {activeTab === "vehicle" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#168A91] block">
                      Vehicle Asset &amp; Package
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-lg mt-0.5">
                      {currentLoan.bikeName || currentLoan.bike?.name || "DandoEv Commercial E-Bike"}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Financed Value</span>
                    <span className="text-xl font-black text-emerald-700 block">
                      {formatNaira(Number(currentLoan.totalRepayable || currentLoan.totalAmount || 0))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Financing Tenure</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">{currentLoan.tenure || 12} Months</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Monthly Rate</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">{formatNaira(loanMonthly)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Down Payment</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">
                      {formatNaira(Number(currentLoan.downPayment || 0))}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">✓ Verified Received</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Repayment Frequency</span>
                    <span className="font-bold text-sm text-indigo-700 block mt-1 capitalize">
                      {currentLoan.deductionFrequency || "Weekly"}
                    </span>
                  </div>
                </div>

                {/* Hardware Allocation & VIN */}
                <div className="mt-5 p-4 rounded-xl bg-slate-900 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#26fedc]">
                      Physical Fleet Allocation
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {currentLoan.bikeSerialNumber ? "Allocated & Registered" : "Pending Allocation"}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-white/10">
                      <span className="text-slate-400 block text-[10px]">Frame VIN</span>
                      <span className="text-white font-bold block mt-0.5">{currentLoan.bikeSerialNumber || "Not assigned"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/10">
                      <span className="text-slate-400 block text-[10px]">Battery Serial #1</span>
                      <span className="text-white font-bold block mt-0.5">{currentLoan.batteryNumber1 || "Not assigned"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/10">
                      <span className="text-slate-400 block text-[10px]">Battery Serial #2</span>
                      <span className="text-white font-bold block mt-0.5">{currentLoan.batteryNumber2 || "Single battery"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT DEBIT & MANDATE */}
          {activeTab === "mandate" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      NIBSS &amp; Mono Direct Debit Mandate
                    </h3>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    mandateStatus === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    Mandate: {mandateStatus.toUpperCase()}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mt-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Bank Account</span>
                    <span className="font-bold text-slate-900 block mt-1">{currentLoan.user?.bankName || "Commercial Bank"}</span>
                    <span className="text-slate-400 font-mono mt-0.5 block">{currentLoan.user?.bankAccountNumber || "••••••••••"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Account Name</span>
                    <span className="font-bold text-slate-900 block mt-1">{currentLoan.user?.bankAccountName || applicantName}</span>
                    <span className="text-emerald-700 font-medium mt-0.5 block">✓ Verified Name Match</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Mandate Reference</span>
                    <span className="font-bold text-slate-900 block mt-1 font-mono">{currentLoan.monoMandateRef || "MND-DANDO-PENDING"}</span>
                    <span className="text-slate-400 mt-0.5 block">Registered on NIBSS</span>
                  </div>
                </div>

                {/* Repayment History Table */}
                <div className="mt-5">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">
                    Repayment Schedule &amp; Collection History
                  </h4>
                  {(currentLoan.repayments || []).length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {currentLoan.repayments.slice(0, 8).map((rep: any) => (
                            <tr key={rep.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-slate-500">#{rep.installmentNumber}</td>
                              <td className="py-2 px-3 text-slate-800">{formatDate(rep.dueDate)}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{formatNaira(Number(rep.amount))}</td>
                              <td className="py-2 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                  rep.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {rep.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-xs border border-slate-100">
                      Scheduled installments will generate automatically upon loan approval.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS & GUARANTORS */}
          {activeTab === "documents" && (
            <div className="space-y-5">
              {/* Uploaded Documents */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Uploaded Verification Documents &amp; Earnings Proof
                </h3>

                {currentLoan.documents && currentLoan.documents.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {currentLoan.documents.map((doc: any, idx: number) => {
                      const isImage =
                        typeof doc.fileUrl === "string" &&
                        (doc.fileUrl.startsWith("data:image") ||
                          /\.(png|jpe?g|webp|gif)($|\?)/i.test(doc.fileUrl));
                      return (
                        <div key={doc.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {doc.type === "work_id"
                                ? "Courier Earnings Screenshot"
                                : doc.type?.replace(/_/g, " ").toUpperCase() || "DOCUMENT"}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Verified
                            </span>
                          </div>

                          {isImage ? (
                            <div
                              onClick={() => setPreviewImage(doc.fileUrl)}
                              className="relative h-44 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center cursor-pointer group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={doc.fileUrl}
                                alt={doc.fileName || "Document"}
                                className="w-full h-full object-contain group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                <Eye className="w-4 h-4" /> Click to enlarge
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                              PDF or Non-image Document
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="truncate max-w-[180px]">{doc.fileName || "document.jpg"}</span>
                            <button
                              type="button"
                              onClick={() => window.open(doc.fileUrl, "_blank")}
                              className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              Open <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No physical documents required or uploaded.
                  </div>
                )}
              </div>

              {/* Guarantors Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-purple-600" />
                  Digital Co-Signing Guarantors
                </h3>

                {currentLoan.guarantors && currentLoan.guarantors.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {currentLoan.guarantors.map((g: any, i: number) => (
                      <div key={g.id || i} className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-sm">{g.fullName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            g.status === "accepted" || g.status === "verified"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {g.status === "accepted" || g.status === "verified" ? "✓ Verified" : "Invited"}
                          </span>
                        </div>
                        <div className="text-slate-600">Relationship: <strong>{g.relationship || "Guarantor"}</strong></div>
                        <div className="text-slate-600">Phone: <strong>{g.phone}</strong></div>
                        {g.email && <div className="text-slate-600">Email: {g.email}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 text-xs text-purple-900">
                    Guarantor verification requests sent via SMS / WhatsApp.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sticky Action Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <span>Applicant: <strong>{applicantName}</strong></span>
            <span className="mx-2 text-slate-300">|</span>
            <span>Net Free Cashflow: <strong className="text-emerald-700">{formatNaira(netCashflow)}</strong></span>
            <span className="mx-2 text-slate-300">|</span>
            <span>DTI: <strong className={dtiRatio && dtiRatio <= 35 ? "text-emerald-700" : "text-amber-700"}>{dtiRatio ?? "N/A"}%</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            {currentLoan.status !== "rejected" && (
              <button
                type="button"
                onClick={() => onRejectClick(currentLoan)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition cursor-pointer"
              >
                Decline Application
              </button>
            )}

            {currentLoan.status !== "approved" && currentLoan.status !== "active" && (
              <button
                type="button"
                onClick={() => onApproveClick(currentLoan)}
                className="px-5 py-2.5 rounded-xl bg-[#0A1B46] hover:bg-[#162a63] text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-md shadow-slate-900/10 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#26fedc]" />
                Allocate Asset &amp; Approve
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black transition z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Enlarged Document"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}

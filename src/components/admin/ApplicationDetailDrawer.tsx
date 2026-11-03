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
  Briefcase,
  FileText,
  CheckCircle2,
  ExternalLink,
  Clock,
  Eye,
} from "lucide-react";
import {
  formatNaira,
  formatDate,
  capitalize,
  getStatusColor,
} from "@/lib/utils";

interface ApplicationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
  onApproveClick: (loan: any) => void;
  onRejectClick: (loan: any) => void;
}

export default function ApplicationDetailDrawer({
  isOpen,
  onClose,
  loan,
  onApproveClick,
  onRejectClick,
}: ApplicationDetailDrawerProps) {
  const [assessment, setAssessment] = useState<any | null>(null);
  const [sensitiveData, setSensitiveData] = useState<any | null>(null);
  const [loadingSensitive, setLoadingSensitive] = useState(false);
  useEffect(() => {
    if (!loan?.userId && !loan?.user?.id) return;
    const userId = loan.userId || loan.user.id;
    fetch(`/api/admin/credit-assessments?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setAssessment(json?.data?.[0] || null))
      .catch(() => setAssessment(null));
  }, [loan?.id, loan?.userId, loan?.user?.id]);
  const revealSensitiveData = async () => {
    if (!loan?.id || loadingSensitive) return;
    setLoadingSensitive(true);
    try {
      const response = await fetch(`/api/admin/loans/${loan.id}?reveal=1`);
      const json = await response.json();
      if (!response.ok)
        throw new Error(json.error || "Unable to reveal sensitive data");
      setSensitiveData(json.data?.user || null);
    } catch (error) {
      console.error("Sensitive applicant data could not be loaded", error);
    } finally {
      setLoadingSensitive(false);
    }
  };
  if (!isOpen || !loan) return null;

  const applicantName = loan.user
    ? `${loan.user.firstName} ${loan.user.lastName}`
    : loan.personalInfo
      ? `${loan.personalInfo.firstName} ${loan.personalInfo.lastName}`
      : loan.userName || "Applicant";
  const email =
    loan.user?.email ||
    loan.personalInfo?.email ||
    loan.userEmail ||
    "No Email";
  const phone =
    loan.user?.phone ||
    loan.personalInfo?.phone ||
    loan.userPhone ||
    "Not provided";
  const address =
    loan.deliveryAddress || loan.personalInfo?.address || "Not provided";

  const monthlyInflow = Number(
    assessment?.verifiedMonthlyInflow ||
      loan.monthlyInflow ||
      loan.user?.monthlyIncome ||
      0,
  );
  const loanMonthly = Number(loan.monthlyRepayment || 0);
  const dtiRatio = assessment
    ? Number(assessment.dtiRatioPercent)
    : monthlyInflow > 0
      ? Math.round((loanMonthly / monthlyInflow) * 100)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 animate-slide-in-right overflow-hidden">
        {/* Top Bar */}
        <div className="p-6 border-b border-neutral-150 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`badge ${getStatusColor(loan.status)}`}>
                {capitalize(loan.status)}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                #{loan.id.slice(0, 8)}
              </span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
              {applicantName}
            </h2>
            <div className="mt-3 text-xs text-neutral-500">
              Account:{" "}
              {sensitiveData?.bankAccountNumber || loan.user?.bankAccountNumber
                ? sensitiveData?.bankAccountNumber ||
                  `••••${String(loan.user.bankAccountNumber).slice(-4)}`
                : "Unavailable"}
              {" · "}BVN: {sensitiveData?.bvn || "••••"} {" · "}NIN:{" "}
              {sensitiveData?.ninNumber || "••••"}
              <button
                onClick={revealSensitiveData}
                className="ml-2 text-primary font-semibold"
                disabled={loadingSensitive}
              >
                {loadingSensitive ? "Loading…" : "Reveal securely"}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* 1. Financed Vehicle Summary */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Vehicle Financed
              </div>
              <div className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                {loan.bikeName || loan.bike?.name || "Dando E-Bike"}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Tenure: <strong>{loan.tenure} Months</strong> • Monthly:{" "}
                <strong>{formatNaira(loanMonthly)}</strong>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Total Obligation
              </div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatNaira(
                  loan.totalRepayable ||
                    loan.totalAmount ||
                    loan.loanAmount ||
                    0,
                )}
              </div>
            </div>
          </div>

          {/* 2. Mono Open Banking & Credit Assessment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-cyan-500" /> Mono Open Banking
                Assessment
              </h3>
              <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Verified Bank Stream
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="text-xs text-neutral-400">
                  Avg. Monthly Inflow
                </div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                  {formatNaira(monthlyInflow)}
                </div>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="text-xs text-neutral-400">
                  Debt-to-Income (DTI)
                </div>
                <div
                  className={`text-sm font-bold mt-0.5 ${dtiRatio !== null && dtiRatio > 35 ? "text-rose-500" : "text-emerald-500"}`}
                >
                  {dtiRatio === null
                    ? "Unavailable"
                    : `${dtiRatio}% ${dtiRatio <= 35 ? "(Healthy)" : "(High)"}`}
                </div>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="text-xs text-neutral-400">
                  Credit Bureau Score
                </div>
                <div className="text-sm font-bold text-emerald-500 mt-0.5">
                  {assessment?.creditScore == null
                    ? "Unavailable"
                    : `${assessment.creditScore} / 850`}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">BVN Match Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />{" "}
                  {loan.user?.kycStatus === "verified"
                    ? "Verified via Mono"
                    : "Not verified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Direct Debit Mandate:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {loan.monoMandateStatus === "active"
                    ? "Active"
                    : loan.monoMandateStatus || "Not active"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">
                  Active Multi-Lender Debt:
                </span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {assessment
                    ? Array.isArray(assessment.detectedLenders) &&
                      assessment.detectedLenders.length
                      ? assessment.detectedLenders.join(", ")
                      : "None detected"
                    : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Underwriting decision:</span>
                <span className="font-semibold">
                  {assessment?.underwritingDecision || "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Assessment source:</span>
                <span className="font-semibold">
                  {assessment?.source || "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Applicant Contact, Personal Profile & Delivery */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" /> Applicant Profile &amp; Dispatch Destination
            </h3>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <Mail className="w-4 h-4 text-neutral-400" /> {email}
              </div>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <Phone className="w-4 h-4 text-neutral-400" /> {phone}
              </div>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <MapPin className="w-4 h-4 text-neutral-400" /> {address}
              </div>
              {loan.user?.dateOfBirth && (
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Calendar className="w-4 h-4 text-neutral-400" /> Date of Birth:{" "}
                  <strong>{formatDate(loan.user.dateOfBirth)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* 4. Employment & Gig Courier Logistics Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-amber-500" /> Employment &amp; Gig Courier Logistics
            </h3>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Employment Status:</span>
                <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                  {loan.user?.employmentStatus?.replace(/_/g, " ") || "Gig Courier Rider"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Delivery Platform / Employer:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  🛵 {loan.user?.employerName || "Independent Logistics Rider"}
                </span>
              </div>
              {loan.user?.employerAddress && (
                <div className="flex justify-between items-start">
                  <span className="text-neutral-500">Delivery Hub / Base:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 text-right max-w-xs">
                    {loan.user.employerAddress}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 5. Repayment Bank Account & Mandate Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-500" /> Repayment Bank &amp; Debit Mandate
            </h3>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Bank Name:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {loan.user?.bankName || "Commercial Bank"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Account Name:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {loan.user?.bankAccountName || applicantName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">NUBAN Account:</span>
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  {sensitiveData?.bankAccountNumber ||
                    (loan.user?.bankAccountNumber
                      ? `••••${String(loan.user.bankAccountNumber).slice(-4)}`
                      : "••••••••••")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Deduction Frequency:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {loan.deductionFrequency || "Weekly"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mandate Reference:</span>
                <span className="font-mono text-[11px] text-neutral-500">
                  {loan.monoMandateRef || "MND-DANDO-PENDING"}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Uploaded Verification Documents & Courier Dashboard */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-500" /> Verification Documents &amp; Earnings Proof
            </h3>
            {loan.documents && loan.documents.length > 0 ? (
              <div className="space-y-2.5">
                {loan.documents.map((doc: any, idx: number) => {
                  const isImage =
                    typeof doc.fileUrl === "string" &&
                    (doc.fileUrl.startsWith("data:image") ||
                      /\.(png|jpe?g|webp|gif)($|\?)/i.test(doc.fileUrl));
                  return (
                    <div
                      key={doc.id || idx}
                      className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-info text-[10px]">
                            {doc.type === "work_id"
                              ? "Courier Earnings Dashboard"
                              : doc.type?.replace(/_/g, " ").toUpperCase() || "DOCUMENT"}
                          </span>
                          <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                            {doc.fileName || "proof-document.jpg"}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Uploaded
                        </span>
                      </div>
                      {isImage && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 max-h-48 bg-neutral-900 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.fileUrl}
                            alt={doc.fileName || "Uploaded document"}
                            className="w-full object-contain max-h-48 hover:opacity-95 transition cursor-pointer"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-400 text-xs text-center">
                No verification documents uploaded.
              </div>
            )}
          </div>

          {/* 7. Digital Guarantor Co-Signer Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-purple-500" /> Guarantor Co-Signing Verification
            </h3>
            {loan.guarantors && loan.guarantors.length > 0 ? (
              <div className="space-y-2">
                {loan.guarantors.map((g: any, i: number) => (
                  <div
                    key={g.id || i}
                    className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {g.fullName}{" "}
                        <span className="text-neutral-400 font-normal">
                          ({g.relationship || "Guarantor"})
                        </span>
                      </div>
                      <div className="text-neutral-500 text-[11px] mt-0.5">
                        Phone: {g.phone} {g.email ? `• ${g.email}` : ""}
                      </div>
                    </div>
                    <span
                      className={`badge text-[11px] ${
                        g.status === "accepted" || g.status === "verified"
                          ? "badge-success"
                          : "badge-warning"
                      }`}
                    >
                      {g.status === "accepted" || g.status === "verified"
                        ? "✓ Co-Signed"
                        : "Invited"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white">
                    Nominated Guarantors
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Pending guarantor verification via SMS/WhatsApp
                  </div>
                </div>
                <span className="badge badge-warning text-xs">Pending</span>
              </div>
            )}
          </div>

          {/* Existing hardware allocations if approved */}
          {loan.bikeSerialNumber && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Assigned Asset Identifiers
              </h3>
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-neutral-400">Serial:</span>{" "}
                  {loan.bikeSerialNumber}
                </div>
                <div>
                  <span className="text-neutral-400">Chassis:</span>{" "}
                  {loan.chassisNumber}
                </div>
                <div>
                  <span className="text-neutral-400">Battery 1:</span>{" "}
                  {loan.batteryNumber1}
                </div>
                {loan.batteryNumber2 && (
                  <div>
                    <span className="text-neutral-400">Battery 2:</span>{" "}
                    {loan.batteryNumber2}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-neutral-150 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/80 flex gap-3">
          {loan.status !== "approved" && loan.status !== "active" && (
            <button
              onClick={() => onApproveClick(loan)}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
            >
              ✓ Allocate Asset &amp; Approve
            </button>
          )}
          {loan.status !== "rejected" && (
            <button
              onClick={() => onRejectClick(loan)}
              className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              ✕ Reject Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

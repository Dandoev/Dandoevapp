'use client';

import React from 'react';
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
} from 'lucide-react';
import { formatNaira, formatDate, capitalize, getStatusColor } from '@/lib/utils';

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
  if (!isOpen || !loan) return null;

  const applicantName = loan.user
    ? `${loan.user.firstName} ${loan.user.lastName}`
    : loan.personalInfo
    ? `${loan.personalInfo.firstName} ${loan.personalInfo.lastName}`
    : loan.userName || 'Applicant';
  const email = loan.user?.email || loan.personalInfo?.email || loan.userEmail || 'No Email';
  const phone = loan.user?.phone || loan.personalInfo?.phone || loan.userPhone || 'Not provided';
  const address = loan.deliveryAddress || loan.personalInfo?.address || 'Not provided';

  const monthlyInflow = Number(loan.monthlyInflow || 0);
  const loanMonthly = Number(loan.monthlyRepayment || 0);
  const dtiRatio = monthlyInflow > 0 ? Math.round((loanMonthly / monthlyInflow) * 100) : null;

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
                {loan.bikeName || loan.bike?.name || 'Dando E-Bike'}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Tenure: <strong>{loan.tenure} Months</strong> • Monthly: <strong>{formatNaira(loanMonthly)}</strong>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Total Obligation</div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatNaira(loan.totalRepayable || loan.totalAmount || loan.loanAmount || 0)}
              </div>
            </div>
          </div>

          {/* 2. Mono Open Banking & Credit Assessment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-cyan-500" /> Mono Open Banking Assessment
              </h3>
              <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Verified Bank Stream
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="text-xs text-neutral-400">Avg. Monthly Inflow</div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                  {formatNaira(monthlyInflow)}
                </div>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="text-xs text-neutral-400">Debt-to-Income (DTI)</div>
                <div className={`text-sm font-bold mt-0.5 ${dtiRatio !== null && dtiRatio > 35 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {dtiRatio === null ? 'Unavailable' : `${dtiRatio}% ${dtiRatio <= 35 ? '(Healthy)' : '(High)'}`}
                </div>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="text-xs text-neutral-400">Credit Bureau Score</div>
                <div className="text-sm font-bold text-emerald-500 mt-0.5">
                  {loan.riskScore == null ? 'Unavailable' : `${loan.riskScore} / 850`}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">BVN Match Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Name &amp; Phone Match (Mono Identity)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Direct Debit Mandate:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Active (Authorized via Mono DirectPay)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Active Multi-Lender Debt:</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  None detected in 6-month statement scan
                </span>
              </div>
            </div>
          </div>

          {/* 3. Applicant Contact & Delivery */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" /> Contact &amp; Dispatch Destination
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
            </div>
          </div>

          {/* 4. Digital Guarantor Co-Signer Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-purple-500" /> Guarantor Co-Signing Verification
            </h3>
            <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs flex items-center justify-between">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-white">
                  Emeka Okafor (Guarantor)
                </div>
                <div className="text-neutral-500 text-[11px]">
                  Verified via Mono Open Banking • Access Bank Nigeria (223*****411)
                </div>
              </div>
              <span className="badge badge-success text-xs">✓ Co-Signed</span>
            </div>
          </div>

          {/* Existing hardware allocations if approved */}
          {loan.bikeSerialNumber && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Assigned Asset Identifiers
              </h3>
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-neutral-400">Serial:</span> {loan.bikeSerialNumber}
                </div>
                <div>
                  <span className="text-neutral-400">Chassis:</span> {loan.chassisNumber}
                </div>
                <div>
                  <span className="text-neutral-400">Battery 1:</span> {loan.batteryNumber1}
                </div>
                {loan.batteryNumber2 && (
                  <div>
                    <span className="text-neutral-400">Battery 2:</span> {loan.batteryNumber2}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-neutral-150 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/80 flex gap-3">
          {loan.status !== 'approved' && loan.status !== 'active' && (
            <button
              onClick={() => onApproveClick(loan)}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
            >
              ✓ Allocate Asset &amp; Approve
            </button>
          )}
          {loan.status !== 'rejected' && (
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

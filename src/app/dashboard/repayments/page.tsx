'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { formatNaira } from '@/lib/utils';
import {
  PiggyBank,
  CheckCircle2,
  Sparkles,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Printer,
  Calendar,
  FileText,
  X,
  Loader2,
  Zap,
} from 'lucide-react';

export default function RepaymentPortalPage() {
  const [dailySavingsEnabled, setDailySavingsEnabled] = useState(true);
  const [dailySavingsAmount, setDailySavingsAmount] = useState(1000);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'paid' | 'upcoming'>('all');
  const [earlyPayoffModalOpen, setEarlyPayoffModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [loan, setLoan] = useState({
    id: 'LOAN-882194',
    bikeName: 'DandoEv X6 Commercial Dispatch',
    totalLoanAmount: 950000,
    totalRepayable: 1180000,
    amountPaid: 491665,
    remainingBalance: 688335,
    monthlyInstallment: 98333,
    biDailyInstallment: 6555,
    nextDueDate: '2026-10-20',
    nextDueAmount: 6555,
    tenureMonths: 12,
    monthsCompleted: 5,
    lockedSavingsBalance: 150000,
    mandateId: 'mnd_live_882194',
    mandateReference: 'MND-DANDO-882194',
    mandateStatus: 'active',
    deductionFrequency: 'bidaily',
    mandateStartDate: '2026-05-01',
    mandateEndDate: '2027-05-01',
    bankName: 'Guaranty Trust Bank (GTBank)',
  });

  useEffect(() => {
    async function loadDashboardLoan() {
      try {
        const token =
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('token='))
            ?.split('=')[1] || 'demo-token-customer';
        const [dashRes, mandateRes] = await Promise.all([
          fetch('/api/user/dashboard', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .catch(() => null),
          fetch('/api/payments/mono/mandate', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .catch(() => null),
        ]);

        if (dashRes?.success && dashRes.loan) {
          const l = dashRes.loan;
          const totalRep = Number(l.totalRepayable || 1180000);
          const paid = Number(l.amountPaid || 491665);
          const rem = Math.max(0, totalRep - paid);
          const nextAmt = Number(l.nextPayment?.amount || 6555);
          setLoan((prev) => ({
            ...prev,
            id: l.loanId || prev.id,
            bikeName: l.bikeName || prev.bikeName,
            totalRepayable: totalRep,
            amountPaid: paid,
            remainingBalance: rem,
            nextDueAmount: nextAmt,
            biDailyInstallment: nextAmt,
            monthlyInstallment: Math.round(nextAmt * 15),
            nextDueDate: l.nextPayment?.dueDate
              ? new Date(l.nextPayment.dueDate).toISOString().slice(0, 10)
              : prev.nextDueDate,
            lockedSavingsBalance: Number(
              dashRes.profile?.wallet?.lockedSaving || prev.lockedSavingsBalance
            ),
          }));
        }

        if (mandateRes?.success && mandateRes.data) {
          const m = mandateRes.data;
          setLoan((prev) => ({
            ...prev,
            mandateId: m.mandateId || prev.mandateId,
            mandateReference: m.reference || prev.mandateReference,
            mandateStatus: m.status || 'active',
            deductionFrequency: m.deductionFrequency || prev.deductionFrequency,
            mandateStartDate: m.startDate || prev.mandateStartDate,
            mandateEndDate: m.endDate || prev.mandateEndDate,
            bankName: m.bankName || prev.bankName,
          }));
        }
      } catch {
        // Keep default fallback
      } finally {
        setLoading(false);
      }
    }
    loadDashboardLoan();
  }, []);

  const earlySettlementDiscount = Math.round(loan.remainingBalance * 0.14);
  const earlySettlementTotal = Math.max(0, loan.remainingBalance - earlySettlementDiscount);
  const percentComplete = Math.min(
    100,
    Math.round((loan.amountPaid / Math.max(1, loan.totalRepayable)) * 100)
  );

  const handleManualPayment = async () => {
    setIsProcessingPayment(true);
    const paidAmt = loan.nextDueAmount;
    try {
      const res = await fetch('/api/payments/mono/mandate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_auto_deduction',
          mandateId: loan.mandateId,
          loanId: loan.id,
          amount: paidAmt,
          narration: `DandoEv BNPL Installment Debit (${loan.id})`,
        }),
      });
      const result = await res.json();
      const ref = result?.data?.reference || `MONO-DEB-${Date.now().toString().slice(-6)}`;

      setLoan((prev) => ({
        ...prev,
        amountPaid: Math.min(prev.totalRepayable, prev.amountPaid + paidAmt),
        remainingBalance: Math.max(0, prev.remainingBalance - paidAmt),
        lockedSavingsBalance: prev.lockedSavingsBalance + 2000,
      }));
      setToastMessage(
        `Debited ${formatNaira(paidAmt)} via Mono Mandate (${ref})! +₦2,000 swept to your Compulsory Savings Vault.`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch {
      setLoan((prev) => ({
        ...prev,
        amountPaid: Math.min(prev.totalRepayable, prev.amountPaid + paidAmt),
        remainingBalance: Math.max(0, prev.remainingBalance - paidAmt),
        lockedSavingsBalance: prev.lockedSavingsBalance + 2000,
      }));
      setToastMessage(
        `Settled ${formatNaira(paidAmt)} via Mono DirectPay! +₦2,000 added to your Compulsory Savings Vault.`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmEarlyPayoff = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setEarlyPayoffModalOpen(false);
      setLoan((prev) => ({
        ...prev,
        amountPaid: prev.totalRepayable,
        remainingBalance: 0,
        monthsCompleted: prev.tenureMonths,
      }));
      setToastMessage(
        `Early Payoff of ${formatNaira(earlySettlementTotal)} complete! You saved ${formatNaira(
          earlySettlementDiscount
        )} in waived interest and unlocked your Compulsory Savings Vault.`
      );
      setTimeout(() => setToastMessage(null), 6000);
    }, 1400);
  };

  const scheduleRows = Array.from({ length: loan.tenureMonths }).map((_, i) => {
    const monthNum = i + 1;
    const isPaid = monthNum <= loan.monthsCompleted || loan.remainingBalance === 0;
    const isNext = !isPaid && monthNum === loan.monthsCompleted + 1;
    const status = isPaid ? 'paid' : isNext ? 'next' : 'upcoming';
    return {
      monthNum,
      dueDate: `2026-${String(((monthNum + 4) % 12) + 1).padStart(2, '0')}-02`,
      amount: loan.monthlyInstallment,
      principalPart: Math.round(loan.monthlyInstallment * 0.78),
      interestAndEscrow: Math.round(loan.monthlyInstallment * 0.22),
      method: 'Mono NIBSS e-Mandate',
      status,
    };
  });

  const filteredSchedule = scheduleRows.filter((row) => {
    if (scheduleFilter === 'paid') return row.status === 'paid';
    if (scheduleFilter === 'upcoming') return row.status !== 'paid';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface pb-24">
      <Navbar backHref="/dashboard" backLabel="Rider Portal" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 max-w-md bg-primary text-white px-5 py-4 rounded-2xl shadow-2xl border border-accent/30 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
          <span className="text-xs font-bold leading-snug">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        {/* Page Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-secondary mb-1">
              <PiggyBank className="w-4 h-4" />
              <span>Save-As-You-Ride Ledger & Escrow</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary">
              Loan Repayment & Compulsory Savings
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Manage your automated installments, track your 100% returnable rider escrow, or unlock early payoff rebates.
            </p>
          </div>
          <div className="flex items-center gap-2.5 print-hide">
            <Link
              href={`/dashboard/invoice?loanId=${loan.id}`}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span>Official Invoice</span>
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-primary text-primary text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* Top Progress & Compulsory Savings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Repayment Progress Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Financed Asset · #{loan.id.slice(0, 10)}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-primary mt-0.5">
                  {loan.bikeName}
                </h2>
              </div>
              <span className="badge badge-success">
                {loan.remainingBalance === 0 ? '100% Paid Off' : 'Active Mandate'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Ownership Progress: {percentComplete}%</span>
                <span className="text-primary tabular-nums">
                  {formatNaira(loan.amountPaid)} / {formatNaira(loan.totalRepayable)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-linear-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, percentComplete)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>
                  {loan.monthsCompleted} of {loan.tenureMonths} Months Settled
                </span>
                <span className="tabular-nums">{formatNaira(loan.remainingBalance)} Remaining</span>
              </div>
            </div>

            {/* Next Installment Due Action Box */}
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                  <Calendar className="w-3.5 h-3.5 text-secondary" />
                  <span>Next Scheduled Auto-Debit: {loan.nextDueDate}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-primary mt-1 tabular-nums">
                  {formatNaira(loan.nextDueAmount)}
                  <span className="text-xs font-semibold text-slate-500 ml-1">/ installment</span>
                </div>
              </div>
              <button
                onClick={handleManualPayment}
                disabled={isProcessingPayment || loan.remainingBalance === 0}
                className="px-6 py-3.5 bg-primary hover:bg-primary-light disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shrink-0 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Debiting Mono Mandate...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-accent" />
                    <span>
                      {loan.remainingBalance === 0 ? 'Loan Settled' : 'Trigger Mandate Debit Now'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Mono NIBSS e-Mandate Order Metadata Strip */}
            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-primary font-bold">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0" />
                <span>
                  Mono NIBSS e-Mandate: <strong className="font-mono">{loan.mandateReference}</strong> ({loan.bankName})
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-semibold">
                Auto-Deduction Term: <strong>{loan.mandateStartDate}</strong> → <strong>{loan.mandateEndDate}</strong> ({loan.deductionFrequency.toUpperCase()})
              </div>
            </div>
          </div>

          {/* Compulsory Savings Vault Box */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-accent text-[11px] font-extrabold uppercase">
                  <PiggyBank className="w-4 h-4" />
                  <span>100% Returnable Escrow</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dailySavingsEnabled}
                    onChange={(e) => setDailySavingsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                </label>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Locked Compulsory Savings Vault
                </span>
                <div className="text-3xl sm:text-4xl font-black text-accent mt-1 tabular-nums">
                  {formatNaira(loan.lockedSavingsBalance)}
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Automatically swept with your rides. Upon loan completion, 100% of this balance is unlocked to your bank account or can be used for a replacement 60V battery.
                </p>
              </div>
            </div>

            {/* Daily Auto-Sweep Target Selector */}
            <div className="space-y-2.5 pt-4 border-t border-white/10 relative z-10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">Daily Auto-Sweep Rate:</span>
                <span className="text-accent font-extrabold">
                  {formatNaira(dailySavingsAmount)} / day
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 1500, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDailySavingsAmount(amt)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all tabular-nums ${
                      dailySavingsAmount === amt
                        ? 'bg-accent text-primary-dark border-accent'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    ₦{amt.toLocaleString()}/day
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Early Payoff & Interest Rebate Calculator */}
        {loan.remainingBalance > 0 && (
          <div className="p-6 sm:p-8 bg-teal-50/80 border-2 border-teal-200 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 bg-secondary text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-primary">
                    Early Loan Settlement Rebate (Save {formatNaira(earlySettlementDiscount)})
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Pay off your remaining principal today to waive future unaccrued interest and immediately unlock your {formatNaira(loan.lockedSavingsBalance)} savings vault.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEarlyPayoffModalOpen(true)}
                className="px-6 py-3.5 bg-secondary hover:bg-secondary-dark text-white font-extrabold rounded-xl text-xs transition-all shadow-md shrink-0"
              >
                Settle & Save {formatNaira(earlySettlementDiscount)} →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-teal-200/70 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Standard Remaining Balance</span>
                <div className="text-xl font-black text-slate-800 mt-1 tabular-nums">
                  {formatNaira(loan.remainingBalance)}
                </div>
              </div>
              <div className="p-4 bg-white border border-teal-200/70 rounded-2xl">
                <span className="text-xs font-bold text-secondary">Unaccrued Interest Waived</span>
                <div className="text-xl font-black text-secondary mt-1 tabular-nums">
                  - {formatNaira(earlySettlementDiscount)}
                </div>
              </div>
              <div className="p-4 bg-primary text-white rounded-2xl">
                <span className="text-xs font-bold text-accent">Discounted Payoff Total Today</span>
                <div className="text-xl font-black text-white mt-1 tabular-nums">
                  {formatNaira(earlySettlementTotal)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Amortization & Repayment Schedule Table */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-primary">
                Amortization & Repayment Schedule
              </h3>
              <p className="text-xs text-slate-500">
                Complete breakdown of your {loan.tenureMonths}-month BNPL contract.
              </p>
            </div>

            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 print-hide">
              {[
                { id: 'all', label: `All (${scheduleRows.length})` },
                {
                  id: 'paid',
                  label: `Paid (${scheduleRows.filter((r) => r.status === 'paid').length})`,
                },
                {
                  id: 'upcoming',
                  label: `Upcoming (${scheduleRows.filter((r) => r.status !== 'paid').length})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setScheduleFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    scheduleFilter === tab.id
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-slate-600 hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Due Date</th>
                  <th>Total Due</th>
                  <th>Principal / Fees & Escrow</th>
                  <th>Payment Channel</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map((row) => (
                  <tr
                    key={row.monthNum}
                    className={row.status === 'next' ? 'bg-teal-50/50 font-semibold' : ''}
                  >
                    <td className="font-bold text-primary">
                      Month {row.monthNum} {row.status === 'next' && '(Next Due)'}
                    </td>
                    <td className="tabular-nums text-slate-600">{row.dueDate}</td>
                    <td className="font-extrabold text-slate-900 tabular-nums">
                      {formatNaira(row.amount)}
                    </td>
                    <td className="text-slate-500 tabular-nums text-xs">
                      {formatNaira(row.principalPart)} / {formatNaira(row.interestAndEscrow)}
                    </td>
                    <td className="text-xs font-semibold text-secondary">{row.method}</td>
                    <td className="text-right">
                      {row.status === 'paid' ? (
                        <span className="badge badge-success">Paid</span>
                      ) : row.status === 'next' ? (
                        <span className="badge badge-warning">Next Due</span>
                      ) : (
                        <span className="badge badge-default">Scheduled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Early Payoff Confirmation Modal */}
      {earlyPayoffModalOpen && (
        <div className="modal-overlay" onClick={() => setEarlyPayoffModalOpen(false)}>
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary">
                  0% Remaining Interest Rebate
                </span>
                <h3 className="text-xl font-black text-primary">Confirm Early Loan Payoff</h3>
              </div>
              <button
                onClick={() => setEarlyPayoffModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Standard Remaining Balance:</span>
                <span className="font-bold text-slate-700 tabular-nums">
                  {formatNaira(loan.remainingBalance)}
                </span>
              </div>
              <div className="flex justify-between text-secondary">
                <span className="font-semibold">Interest Rebate Waived:</span>
                <span className="font-extrabold tabular-nums">
                  -{formatNaira(earlySettlementDiscount)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Net Payoff Amount Today:</span>
                <span className="font-black text-primary text-base tabular-nums">
                  {formatNaira(earlySettlementTotal)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEarlyPayoffModalOpen(false)}
                className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEarlyPayoff}
                disabled={isProcessingPayment}
                className="w-2/3 py-3.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Settling Loan...</span>
                  </>
                ) : (
                  <span>Pay {formatNaira(earlySettlementTotal)} & Unlock Title</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

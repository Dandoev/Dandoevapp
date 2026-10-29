'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Target,
  ShieldAlert,
  PiggyBank,
  Bike,
  BatteryCharging,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  Building,
  FileCheck,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { formatNaira, timeAgo } from '@/lib/utils';

interface OverviewTabProps {
  stats: {
    totalRevenue: number;
    pendingApplications: number;
    activeLoans: number;
    totalUsers: number;
    defaultRate: number;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
    loansByStatus: Array<{ status: string; count: number }>;
    escrowBalance?: number;
    onTimeRate?: number;
    monthGrowth?: number;
    recentLedger?: any[];
    regionalHubs?: any[];
    providerVolume?: Array<{ provider: string; amount: number }>;
    outrightRevenue?: number;
    outrightTransactions?: number;
    outrightBuyers?: number;
  };
  delinquentData: {
    totalAtRisk: number;
    repayments: any[];
  };
  auditLogs: any[];
  bikesCount: number;
  onNavigateToTab: (tab: any) => void;
}

export default function OverviewTab({
  stats,
  delinquentData,
  auditLogs,
  bikesCount,
  onNavigateToTab,
}: OverviewTabProps) {
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'outright' | 'repayment'>('all');

  const totalPortfolioNaira = stats?.totalRevenue || 0;
  const activeLoansCount = stats?.activeLoans || 0;
  const pendingCount = stats?.pendingApplications ?? 0;
  const totalEscrowVault = stats?.escrowBalance || 0;
  const capitalAtRisk = delinquentData?.totalAtRisk || 0;
  const defaultRate = stats?.defaultRate || 0;

  const monthlySeries = stats?.monthlyRevenue || [];

  const maxMonthlyRev = Math.max(...monthlySeries.map((m) => m.revenue), 1);

  // Live payment ledger including outright sales and repayments.
  const recentLedger = stats?.recentLedger || [];

  const filteredLedger = recentLedger.filter((item) => {
    if (ledgerFilter === 'all') return true;
    return item.category === ledgerFilter;
  });

  // Regional Hub Utilization
  const regionalHubs = stats?.regionalHubs || [];
  const providerVolume = stats?.providerVolume || [];
  const providerTotal = providerVolume.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      <div className="rounded-2xl border border-[#BDECF5] bg-linear-to-r from-[#EFFBFF] to-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#087CA9]">Today at a glance</p>
          <h1 className="text-xl font-black text-[#0A1B46] mt-1">Here’s what needs your attention</h1>
          <p className="text-sm text-slate-500 mt-1">Review new applications first, then check payments and overdue accounts.</p>
        </div>
        <button onClick={() => onNavigateToTab(pendingCount ? 'applications' : 'payments')} className="rounded-xl bg-[#0A1B46] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#17469D]">
          {pendingCount ? `Review ${pendingCount} application${pendingCount === 1 ? '' : 's'}` : 'View recent payments'}
        </button>
      </div>
      {/* =========================================================================
          TOP ROW: 4 Executive KPI Cards in Nigerian Naira (₦)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Gross BNPL Portfolio */}
        <div className="bg-linear-to-br from-[#0A1B46] to-[#17469D] text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-[#65D9FA]/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#65D9FA]">
              Money currently financed
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#65D9FA]">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="my-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
              {formatNaira(totalPortfolioNaira)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-cyan-200 font-bold mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{(stats?.monthGrowth || 0).toFixed(1)}% MoM · {(stats?.onTimeRate || 0).toFixed(1)}% On-Time Repayments</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('payments')}
            className="text-xs font-bold text-white/90 hover:text-[#65D9FA] inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open Repayment Ledger ({activeLoansCount} Active Loans)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* KPI 2: Underwriting Queue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Applications to review
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Target className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0A1B46] tabular-nums">
                {pendingCount}
              </span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Need your decision
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Applicants waiting for approval or rejection
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('applications')}
            className="text-xs font-extrabold text-[#087CA9] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open applications</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* KPI 3: Compulsory Escrow Vault */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Customer savings held
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#087CA9] border border-sky-200 flex items-center justify-center">
              <PiggyBank className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="my-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {formatNaira(totalEscrowVault)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Funds reserved for customers’ repayment plans
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('reconciliation')}
            className="text-xs font-extrabold text-[#0A1B46] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Check payment settlement</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* KPI 4: Portfolio Risk & Delinquency */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Overdue payments
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">
                {formatNaira(capitalAtRisk)}
              </span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {defaultRate}% PAR
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Payments that need follow-up
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('defaults')}
            className="text-xs font-extrabold text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View overdue accounts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          MIDDLE ROW: Monthly Naira Disbursement Chart (7 cols) + Priority Queue (5 cols)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Collections & Disbursement Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#087CA9]">
                 Money coming into the business
              </span>
              <h2 className="text-base font-black text-[#0A1B46]">
                Monthly collections and savings (₦)
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0A1B46]" />
                  <span>Repayments</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#087CA9]" />
                  <span>Customer savings</span>
              </span>
            </div>
          </div>

          {/* 6-Month Bar Chart */}
          <div className="pt-8 pb-2">
            <div className="flex items-end justify-between gap-4 h-48 px-2 border-b border-slate-100 pb-3">
              {monthlySeries.map((item) => {
                const heightPct = Math.max(18, Math.round((item.revenue / maxMonthlyRev) * 100));
                const escrowHeightPct = Math.max(10, Math.round(heightPct * 0.35));
                return (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-2 group"
                  >
                    <div className="text-[10px] font-extrabold text-slate-500 group-hover:text-[#0A1B46] tabular-nums">
                      ₦{(item.revenue / 1000000).toFixed(1)}M
                    </div>
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[18px] bg-[#0A1B46] rounded-t-md transition-all group-hover:bg-[#1a2b88]"
                        title={`${item.month}: ${formatNaira(item.revenue)}`}
                      />
                      <div
                        style={{ height: `${escrowHeightPct}%` }}
                        className="w-full max-w-[12px] bg-[#087CA9] rounded-t-md transition-all group-hover:brightness-110"
                        title={`Escrow Vault: ${formatNaira(Math.round(item.revenue * 0.18))}`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gateway Breakdown Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
            {providerVolume.length === 0 && <p className="col-span-full text-slate-500">No successful payment volume in this period.</p>}
            {providerVolume.map((item) => (
              <div key={item.provider} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">{item.provider}</span>
                <span className="font-black text-slate-900 text-sm">
                  {providerTotal ? ((item.amount / providerTotal) * 100).toFixed(1) : '0.0'}% Volume
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Operational Action Queue & Regional Hub Telemetry */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#087CA9]">
                  Fleet &amp; Swap Network
                </span>
                <h2 className="text-base font-black text-[#0A1B46]">
                  Fleet overview ({bikesCount} bike models)
                </h2>
              </div>
              <button
                onClick={() => onNavigateToTab('bikes')}
                className="text-xs font-bold text-[#087CA9] hover:underline cursor-pointer"
              >
                Manage bikes &rarr;
              </button>
            </div>

            <div className="space-y-3.5 mt-4">
              {regionalHubs.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                  Hub telemetry is unavailable until operational hub records are configured.
                </p>
              )}
              {regionalHubs.map((hub) => (
                <div
                  key={hub.city}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">{hub.city}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {hub.collectionRate} Collect
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Bike className="w-3.5 h-3.5 text-[#0A1B46]" /> {hub.activeBikes} Financed Bikes
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BatteryCharging className="w-3.5 h-3.5 text-[#087CA9]" /> {hub.chargedPacks} Charged Packs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-5 h-5 text-[#087CA9] shrink-0" />
              <div>
                <div className="text-xs font-extrabold text-[#0A1B46]">
                  Identity and guarantor checks
                </div>
                <div className="text-[11px] text-slate-600">
                  Make sure applicants have completed their required checks
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('compliance')}
              className="px-3 py-1.5 rounded-lg bg-[#0A1B46] text-white text-xs font-bold hover:opacity-95 shrink-0 cursor-pointer"
            >
              Review checks
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM ROW: Live Naira Repayment Ledger (7 cols) + Security Audit Trail (5 cols)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live Naira Repayment & Escrow Ledger */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#0A1B46]">
                Live Payments &amp; Outright Sales
              </h2>
              <p className="text-xs text-slate-500">
                See what customers have paid and what still needs attention
              </p>
            </div>

            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'outright', label: 'Outright Sales' },
                  { id: 'repayment', label: 'Installments' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLedgerFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerFilter === tab.id
                      ? 'bg-[#0A1B46] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-[#0A1B46]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Outright revenue</div>
              <div className="text-sm font-black text-[#0A1B46]">{formatNaira(stats.outrightRevenue || 0)}</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Transactions</div>
              <div className="text-sm font-black text-[#0A1B46]">{stats.outrightTransactions || 0}</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Buyers</div>
              <div className="text-sm font-black text-[#0A1B46]">{stats.outrightBuyers || 0}</div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredLedger.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No transactions found.</p>}
            {filteredLedger.map((tx) => (
              <div
                key={tx.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.category === 'outright'
                        ? 'bg-sky-50 text-[#087CA9] border border-sky-200'
                        : 'bg-indigo-50 text-[#0A1B46] border border-indigo-200'
                    }`}
                  >
                    {tx.category === 'outright' ? (
                      <Bike className="h-5 w-5" />
                    ) : (
                      <Zap className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                      {tx.rider}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {tx.bike} · <span className="font-mono text-[11px]">{tx.channel}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-sm font-black tabular-nums ${tx.status === 'Settled' ? 'text-emerald-700' : tx.status === 'failed' || tx.status === 'reversed' ? 'text-rose-700' : 'text-amber-700'}`}>
                    {formatNaira(tx.amount)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    {tx.status} · {timeAgo(tx.time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Immutable Security Audit Stream */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-[#087CA9]" />
              <h2 className="text-base font-black text-[#0A1B46]">Recent staff activity</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('activity')}
              className="text-xs font-bold text-[#087CA9] hover:underline cursor-pointer"
            >
              Full Audit Log &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No audit activity recorded.</p>}
            {(auditLogs || []).slice(0, 4).map((log: any) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#0A1B46]/10 text-[#0A1B46] font-mono text-[10px] font-extrabold">
                    {(log.action || 'SYSTEM_EVENT').replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

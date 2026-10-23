'use client';

// ============================================================
// DandoEv — Admin Fraud Operations & Risk Management Console
// Real-time monitoring of flagged transactions & BNPL applications
// ============================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  ArrowLeft,
  UserCheck,
  UserX,
  CreditCard,
  FileText,
} from 'lucide-react';

export default function AdminFraudPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high_risk' | 'failed_tx'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFraudData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fraud');
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch fraud data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFraudData();
  }, []);

  const handleAdminAction = async (action: string, payload: Record<string, any>) => {
    const actionKey = `${action}-${payload.loanId || payload.userId}`;
    setActionLoading(actionKey);
    try {
      const res = await fetch('/api/admin/fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        await fetchFraudData();
      } else {
        const err = await res.json();
        alert(err.error || 'Action failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const flaggedLoans = data?.flaggedLoans || [];
  const failedTransactions = data?.failedTransactions || [];
  const auditLogs = data?.securityAuditLogs || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 mb-1">
              <ShieldAlert className="w-6 h-6" />
              <span className="text-xs font-semibold uppercase tracking-wider">Risk Management</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Fraud & Risk Operations Console</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Real-time anomaly detection, velocity triggers, and manual risk disposition.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchFraudData}
              disabled={loading}
              className="p-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-xl text-neutral-300 transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/admin"
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-sm transition-all inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Admin Portal
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
            <span className="text-xs font-medium text-neutral-400 uppercase">Pending Applications Under Review</span>
            <div className="text-2xl font-bold text-amber-400 mt-2">{flaggedLoans.length}</div>
          </div>
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
            <span className="text-xs font-medium text-neutral-400 uppercase">Recent Failed Payment Spikes</span>
            <div className="text-2xl font-bold text-rose-400 mt-2">{failedTransactions.length}</div>
          </div>
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
            <span className="text-xs font-medium text-neutral-400 uppercase">Security Anomaly Alerts (24h)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-2">{auditLogs.length}</div>
          </div>
        </div>

        {/* Flagged BNPL Loans Section */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">BNPL Applications Awaiting Risk Review</h2>
            </div>
            <span className="text-xs text-neutral-400">{flaggedLoans.length} items</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-neutral-500 text-sm">Loading risk signals...</div>
          ) : flaggedLoans.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              No flagged high-risk loan applications at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase">
                  <tr>
                    <th className="p-3">Applicant</th>
                    <th className="p-3">Bike / Loan Amount</th>
                    <th className="p-3">Monthly Income</th>
                    <th className="p-3">KYC Status</th>
                    <th className="p-3">Risk Assessment</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {flaggedLoans.map((loan: any) => {
                    const dti =
                      loan.user.monthlyIncome && loan.loanAmount
                        ? (loan.loanAmount / Number(loan.user.monthlyIncome)).toFixed(1)
                        : 'N/A';
                    return (
                      <tr key={loan.id} className="hover:bg-neutral-900/50">
                        <td className="p-3">
                          <div className="font-semibold text-white">
                            {loan.user.firstName} {loan.user.lastName}
                          </div>
                          <div className="text-xs text-neutral-500 font-mono">{loan.user.email}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-white">{loan.bike?.name}</div>
                          <div className="text-xs text-emerald-400">₦{Number(loan.loanAmount).toLocaleString()}</div>
                        </td>
                        <td className="p-3">
                          <div>₦{Number(loan.user.monthlyIncome || 0).toLocaleString()}</div>
                          <div className="text-xs text-neutral-500">Loan/Income: {dti}x</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              loan.user.kycStatus === 'verified'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {loan.user.kycStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            Review Required
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() =>
                              handleAdminAction('APPROVE_LOAN', { loanId: loan.id, reason: 'Approved by Compliance Officer' })
                            }
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleAdminAction('BLOCK_USER', { userId: loan.user.id, reason: 'Suspicious profile flagged' })
                            }
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Block
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Failed Transactions & Audit Feeds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Failed Payments */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-rose-400" />
              <h3 className="font-semibold text-white">Recent Failed Card Deductions</h3>
            </div>
            <div className="space-y-3">
              {failedTransactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono text-neutral-400">{tx.providerRef || tx.id.slice(0, 8)}</div>
                    <div className="text-rose-400 font-semibold mt-0.5">₦{Number(tx.amount).toLocaleString()}</div>
                  </div>
                  <div className="text-right text-neutral-500">
                    <div>Status: Failed</div>
                    <div>{new Date(tx.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Audit Feed */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Real-Time Security Event Logs</h3>
            </div>
            <div className="space-y-3">
              {auditLogs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white">{log.action}</div>
                    <div className="text-neutral-500 font-mono">{log.actorEmail || 'System'}</div>
                  </div>
                  <div className="text-neutral-500">{new Date(log.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

// ============================================================
// DandoEv — Admin Compliance & NDPR Privacy Portal
// Track data subject requests, identity audits, and erasure events
// ============================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileCheck2,
  Trash2,
  Users,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function AdminCompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/compliance');
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch compliance records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const stats = data?.stats || {};
  const erasureLogs = data?.erasureLogs || [];
  const complianceLogs = data?.complianceLogs || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 mb-1">
              <ShieldCheck className="w-6 h-6" />
              <span className="text-xs font-semibold uppercase tracking-wider">Regulatory Compliance</span>
            </div>
            <h1 className="text-3xl font-bold text-white">NDPR & Data Governance Portal</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Statutory audit logs, data subject erasure requests, and Mono identity verification tracking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchComplianceData}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 uppercase">Total Users</span>
              <Users className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{stats.totalUsers || 0}</div>
          </div>
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 uppercase">KYC Verified</span>
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{stats.verifiedKyc || 0}</div>
          </div>
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 uppercase">KYC Pending</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">{stats.pendingKyc || 0}</div>
          </div>
          <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 uppercase">Data Erasures</span>
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{erasureLogs.length}</div>
          </div>
        </div>

        {/* NDPR Data Subject Erasure Logs */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h2>NDPR / GDPR Data Erasure Requests (Right to be Forgotten)</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Immutable records of scrubbed user accounts. CBN financial transaction logs are preserved for the statutory 6-year retention period.
          </p>

          {erasureLogs.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 text-xs">
              No data subject erasure requests recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 text-neutral-400 uppercase">
                  <tr>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Requested By</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Compliance Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {erasureLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="p-3 font-mono text-neutral-400">{log.userId?.slice(0, 12)}...</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-white">{log.actorEmail || 'Self Service'}</td>
                      <td className="p-3">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 text-emerald-400 font-mono">NDPR Section 3.1</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* KYC & Identity Audits */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2>Mono Identity & KYC Audit Stream</h2>
          </div>
          <div className="space-y-3">
            {complianceLogs.slice(0, 10).map((log: any) => (
              <div key={log.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{log.action}</div>
                  <div className="text-neutral-400">Actor: {log.actorEmail || 'System'}</div>
                </div>
                <div className="text-neutral-500 font-mono">{new Date(log.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

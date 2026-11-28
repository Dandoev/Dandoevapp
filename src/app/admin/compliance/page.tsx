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
  Eye,
  ArrowRight,
  UserRound,
  Building2,
  FileText,
} from 'lucide-react';

export default function AdminCompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [applicantLoading, setApplicantLoading] = useState(false);

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
  const kycDocs = data?.kycDocs || [];

  const openApplicant = async (userId: string) => {
    setApplicantLoading(true);
    try {
      const res = await fetch(`/api/admin/compliance/applicant/${encodeURIComponent(userId)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to load applicant');
      setSelectedApplicant(json.data);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to load applicant');
    } finally {
      setApplicantLoading(false);
    }
  };

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
        <div className="bg-white text-neutral-900 border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold"><FileCheck2 className="w-5 h-5" /><h2>KYC Identity Documents Queue</h2></div>
              <p className="text-xs text-neutral-500 mt-1">Open a full applicant record to review every submitted form, document, identity check, financial assessment, and guarantor.</p>
            </div>
            <span className="rounded-full bg-amber-50 text-amber-800 px-3 py-1 text-xs font-semibold">{kycDocs.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-neutral-500 border-b border-neutral-200"><tr><th className="py-3 pr-4">Applicant</th><th className="py-3 pr-4">Document</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Uploaded</th><th className="py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {kycDocs.map((doc: any) => <tr key={doc.id} className="hover:bg-neutral-50">
                  <td className="py-3 pr-4"><div className="font-semibold">{doc.user?.firstName || doc.userName || 'Applicant'} {doc.user?.lastName || ''}</div><div className="text-xs text-neutral-500">{doc.user?.email || doc.userEmail || '—'}</div></td>
                  <td className="py-3 pr-4"><span className="font-medium">{String(doc.type || 'identity_document').replace(/_/g, ' ')}</span><div className="text-xs text-neutral-500 truncate max-w-[220px]">{doc.fileName || 'Document'}</div></td>
                  <td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${doc.verificationStatus === 'verified' || doc.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : doc.verificationStatus === 'rejected' || doc.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{doc.verificationStatus || doc.status || 'pending'}</span></td>
                  <td className="py-3 pr-4 text-xs text-neutral-500">{new Date(doc.uploadedAt || doc.createdAt).toLocaleString()}</td>
                  <td className="py-3 text-right"><button disabled={applicantLoading} onClick={() => openApplicant(doc.userId)} className="inline-flex items-center gap-1 rounded-lg bg-[#021064] px-3 py-2 text-xs font-semibold text-white hover:bg-[#10258d] disabled:opacity-50"><Eye className="h-3.5 w-3.5" /> View applicant</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {!kycDocs.length && <div className="py-8 text-center text-sm text-neutral-500">No identity documents found.</div>}
        </div>

        {selectedApplicant && <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 p-4 sm:p-8" onClick={() => setSelectedApplicant(null)}>
          <div className="mx-auto max-w-6xl rounded-3xl bg-white text-neutral-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-neutral-200 p-6"><div><div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider"><UserRound className="h-4 w-4" />Applicant compliance review</div><h2 className="mt-2 text-2xl font-bold">{selectedApplicant.user.firstName} {selectedApplicant.user.lastName}</h2><p className="text-sm text-neutral-500">{selectedApplicant.user.email} · {selectedApplicant.user.phone || 'Phone not supplied'}</p></div><button onClick={() => setSelectedApplicant(null)} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold">Close</button></div>
            <div className="grid gap-5 p-6 lg:grid-cols-3">
              <section className="rounded-2xl border border-neutral-200 p-4 lg:col-span-2"><h3 className="font-bold">Applicant information</h3><div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">{[['KYC status', selectedApplicant.user.kycStatus], ['KYC stage', selectedApplicant.user.kycStage || '—'], ['BVN', selectedApplicant.user.bvn || 'Not supplied'], ['NIN', selectedApplicant.user.ninNumber || 'Not supplied'], ['Employment', selectedApplicant.user.employmentStatus || 'Not supplied'], ['Monthly income', selectedApplicant.user.monthlyIncome ? `₦${Number(selectedApplicant.user.monthlyIncome).toLocaleString()}` : 'Not supplied'], ['Bank', selectedApplicant.user.bankName || 'Not linked'], ['Account name', selectedApplicant.user.bankAccountName || 'Not verified'], ['Account number', selectedApplicant.user.bankAccountNumber ? `••••${String(selectedApplicant.user.bankAccountNumber).slice(-4)}` : 'Not supplied']].map(([label, value]) => <div key={label}><div className="text-xs text-neutral-500">{label}</div><div className="mt-1 font-semibold break-words">{value}</div></div>)}</div></section>
              <section className="rounded-2xl border border-neutral-200 p-4"><h3 className="font-bold">Review status</h3><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>Documents</span><b>{selectedApplicant.documents.length}</b></div><div className="flex justify-between"><span>Financial assessments</span><b>{selectedApplicant.assessments.length}</b></div><div className="flex justify-between"><span>Applications</span><b>{selectedApplicant.loans.length}</b></div><div className="flex justify-between"><span>Guarantors</span><b>{selectedApplicant.guarantors.length}</b></div><div className="border-t pt-3 text-xs text-neutral-500">Every status change and officer action is recorded in the audit trail.</div></div></section>
              <section className="rounded-2xl border border-neutral-200 p-4 lg:col-span-2"><h3 className="flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-indigo-600" />Mono financial assessment</h3>{selectedApplicant.assessments.length ? selectedApplicant.assessments.map((a: any) => <div key={a.id} className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><div><span className="text-xs text-neutral-500">Decision</span><p className="font-bold capitalize">{String(a.underwritingDecision).replace(/_/g, ' ')}</p></div><div><span className="text-xs text-neutral-500">Statement</span><p className="font-bold">{a.statementMonthsAnalysed} months</p><p className="text-xs text-neutral-500">{a.statementPeriodStart || '—'} to {a.statementPeriodEnd || '—'}</p></div><div><span className="text-xs text-neutral-500">Cash flow</span><p className="font-bold">₦{Number(a.netMonthlyCashflow || 0).toLocaleString()}</p><p className="text-xs text-neutral-500">In ₦{Number(a.verifiedMonthlyInflow || 0).toLocaleString()} · Out ₦{Number(a.verifiedMonthlyOutflow || 0).toLocaleString()}</p></div><div><span className="text-xs text-neutral-500">Risk</span><p className="font-bold">{a.riskTier} · {a.creditScore}</p><p className="text-xs text-neutral-500">DTI {a.dtiRatioPercent}%</p></div></div>) : <p className="mt-3 text-sm text-neutral-500">No Mono assessment completed.</p>}</section>
              <section className="rounded-2xl border border-neutral-200 p-4"><h3 className="font-bold">Submitted documents</h3><div className="mt-3 space-y-3">{selectedApplicant.documents.map((doc: any) => <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3 text-sm hover:bg-neutral-100"><span><FileText className="mr-2 inline h-4 w-4 text-indigo-600" />{String(doc.type).replace(/_/g, ' ')}<span className="block truncate text-xs text-neutral-500">{doc.fileName || 'Open document'}</span></span><ArrowRight className="h-4 w-4" /></a>)}</div></section>
               <section className="rounded-2xl border border-neutral-200 p-4 lg:col-span-2"><h3 className="font-bold">BNPL applications and guarantors</h3><div className="mt-3 space-y-3">{selectedApplicant.loans.map((loan: any) => <div key={loan.id} className="rounded-xl bg-neutral-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{loan.bike?.name || 'E-bike application'}</b><span className="capitalize">{String(loan.status).replace(/_/g, ' ')}</span></div><div className="mt-1 text-xs text-neutral-500">Loan ₦{Number(loan.loanAmount || 0).toLocaleString()} · Weekly repayment ₦{Number(loan.monthlyRepayment || 0).toLocaleString()} · Mandate {loan.monoMandateStatus || 'pending'}</div><div className="mt-3 space-y-2">{loan.guarantors.map((g: any) => <div key={g.id} className="rounded-xl border border-neutral-200 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{g.fullName}</span><span className="rounded-full bg-neutral-100 px-2 py-1 text-xs capitalize">{String(g.status || 'pending').replace(/_/g, ' ')}</span></div><div className="mt-1 text-xs text-neutral-500">{g.relationship || 'Relationship not supplied'} · Delivery: {g.inviteDeliveryStatus || 'pending'}</div><div className="mt-2 flex flex-wrap gap-2 text-xs">{[['ID', g.idDocumentUrl], ['Proof of address', g.proofOfAddressUrl], ['Work ID', g.workIdUrl]].map(([label, url]) => url ? <a key={String(label)} href={String(url)} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-200 px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-50">View {label}</a> : <span key={String(label)} className="rounded-lg bg-neutral-50 px-2 py-1 text-neutral-400">{label}: not uploaded</span>)}</div></div>)}</div></div>)}{!selectedApplicant.loans.length && <p className="text-sm text-neutral-500">No BNPL application found.</p>}</div></section>
              <section className="rounded-2xl border border-neutral-200 p-4"><h3 className="font-bold">Audit trail</h3><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{selectedApplicant.auditLogs.map((log: any) => <div key={log.id} className="border-b border-neutral-100 pb-2 text-xs"><b>{String(log.action).replace(/_/g, ' ')}</b><div className="text-neutral-500">{new Date(log.createdAt).toLocaleString()}</div></div>)}</div></section>
            </div>
          </div>
        </div>}

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

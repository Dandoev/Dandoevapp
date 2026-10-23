'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCheck,
  Bike,
  FileText,
  Clock,
  Eye,
  Plus,
  AlertCircle,
  SlidersHorizontal,
  ClipboardList,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatNaira, formatDate, capitalize, getStatusColor } from '@/lib/utils';

interface ApplicationsTabProps {
  loans: any[];
  onOpenApprovalModal: (loan: any) => void;
  onOpenRejectionModal: (loan: any) => void;
  onOpenDetailDrawer: (loan: any) => void;
  searchQuery: string;
}

export default function ApplicationsTab({
  loans,
  onOpenApprovalModal,
  onOpenRejectionModal,
  onOpenDetailDrawer,
  searchQuery,
}: ApplicationsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');

  const activeSearch = searchQuery || localSearch;

  const filteredLoans = loans.filter((loan) => {
    if (statusFilter === 'pending' && loan.status !== 'pending' && loan.status !== 'under_review') return false;
    if (statusFilter === 'approved' && loan.status !== 'approved' && loan.status !== 'active') return false;
    if (statusFilter === 'rejected' && loan.status !== 'rejected') return false;

    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      const uName = (loan.personalInfo ? `${loan.personalInfo.firstName} ${loan.personalInfo.lastName}` : (loan.user ? `${loan.user.firstName} ${loan.user.lastName}` : (loan.userName || ''))).toLowerCase();
      const email = (loan.personalInfo?.email || loan.user?.email || loan.userEmail || '').toLowerCase();
      const bike = (loan.bike?.name || loan.bikeName || '').toLowerCase();
      const phone = (loan.personalInfo?.phone || loan.user?.phone || loan.userPhone || '').toLowerCase();
      const bvn = (loan.personalInfo?.bvn || loan.bvn || '').toLowerCase();
      return uName.includes(q) || email.includes(q) || bike.includes(q) || phone.includes(q) || bvn.includes(q);
    }
    return true;
  });

  const counts = {
    all: loans.length,
    pending: loans.filter(l => l.status === 'pending' || l.status === 'under_review').length,
    approved: loans.filter(l => l.status === 'approved' || l.status === 'active').length,
    rejected: loans.filter(l => l.status === 'rejected').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">BNPL Credit Underwriting &amp; Asset Allocation</h2>
          <p className="text-xs text-slate-500">
            Adjudicate incoming customer financing applications, inspect Open Banking cashflow, and assign physical bike frame/battery assets.
          </p>
        </div>

        {/* Local Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search applicant, phone, BVN..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#021064] focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Applications', count: counts.all },
          { id: 'pending', label: 'Pending Adjudication', count: counts.pending, alert: counts.pending > 0 },
          { id: 'approved', label: 'Approved & Allocated', count: counts.approved },
          { id: 'rejected', label: 'Adverse Action / Rejected', count: counts.rejected },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === f.id
                ? 'bg-[#021064] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                statusFilter === f.id
                  ? 'bg-white/20 text-white'
                  : f.alert
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Applications Cards / Pipeline */}
      {filteredLoans.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          <CardContent className="space-y-2">
            <ClipboardList className="h-8 w-8 mx-auto text-slate-400" />
            <div className="text-sm font-semibold text-slate-800">No applications match your criteria</div>
            <p className="text-xs text-slate-400">Try adjusting your status filter or search keywords.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map((loan) => {
            const uName = loan.personalInfo
              ? `${loan.personalInfo.firstName} ${loan.personalInfo.lastName}`
              : loan.user
              ? `${loan.user.firstName} ${loan.user.lastName}`
              : loan.userName || 'Applicant';
            const uEmail = loan.personalInfo?.email || loan.user?.email || loan.userEmail || 'N/A';
            const uPhone = loan.personalInfo?.phone || loan.user?.phone || loan.userPhone || 'N/A';
            const isApproved = loan.status === 'approved' || loan.status === 'active';
            const isRejected = loan.status === 'rejected';

            return (
              <Card key={loan.id} className="overflow-hidden border border-slate-200 hover:border-slate-300 transition-all shadow-xs">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Applicant ID & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#021064] to-[#26fedc] text-white font-bold text-xs uppercase shadow-xs">
                        {uName.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{uName}</span>
                          <span className="text-xs text-slate-400 font-mono">#{loan.id?.slice(0, 8) || 'APP-2026'}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{uEmail}</span>
                          <span>•</span>
                          <span>{uPhone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant={isApproved ? 'success' : isRejected ? 'destructive' : 'warning'} className="text-xs">
                        {capitalize(loan.status || 'Pending')}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">{formatDate(loan.createdAt)}</span>
                    </div>
                  </div>

                  {/* Middle: FinTech Underwriting Parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Selected E-Bike</div>
                      <div className="font-bold text-slate-900 mt-0.5">{loan.bikeName || loan.bike?.name || 'DandoEv E-Bike'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Loan Total (₦)</div>
                      <div className="font-bold text-[#021064] mt-0.5">{formatNaira(loan.totalAmount || loan.loanAmount || 0)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Bi-Daily EMI</div>
                      <div className="font-bold text-slate-900 mt-0.5">{formatNaira(Math.round((loan.monthlyRepayment || 65000) / 15))} / 2 days</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Credit Risk Tier</div>
                      <div className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <span>{loan.riskScore || 85}/100</span>
                        <span className="text-[10px] font-semibold bg-emerald-100 px-1 rounded text-emerald-800">Tier A</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Fulfillment Type</div>
                      <div className="font-bold text-slate-800 mt-0.5 capitalize">{loan.deliveryType === 'pickup' ? 'Hub Pick Up' : (loan.deliveryState || 'Lagos')}</div>
                    </div>
                  </div>

                  {/* Open Banking & Verification Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Mono BVN Match (Verified)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 border border-blue-200">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      Cashflow Verified (₦340k Inflow /mo)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-800 border border-purple-200">
                      <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                      Guarantor Co-Signed
                    </span>
                    {loan.bikeSerialNumber && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 text-xs font-mono text-[#26fedc]">
                        VIN: {loan.bikeSerialNumber}
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      Compulsory daily savings will lock ₦1,000/day upon disbursement.
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenDetailDrawer(loan)}
                        className="text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect Cashflow &amp; KYC</span>
                      </Button>

                      {!isApproved && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => onOpenApprovalModal(loan)}
                          className="text-xs gap-1 font-semibold"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Allocate Asset &amp; Approve</span>
                        </Button>
                      )}

                      {!isRejected && !isApproved && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onOpenRejectionModal(loan)}
                          className="text-xs gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

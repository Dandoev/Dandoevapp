'use client';

import React, { useState } from 'react';
import {
  Wallet,
  PiggyBank,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Send,
  Calendar,
  Search,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatNaira, formatDate, capitalize, getStatusColor } from '@/lib/utils';

interface RepaymentsTabProps {
  loans: any[];
  onOpenDetailDrawer: (loan: any) => void;
}

export default function RepaymentsTab({ loans, onOpenDetailDrawer }: RepaymentsTabProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const activeLoans = loans.filter((l) => {
    if (filter === 'active' && l.status !== 'active' && l.status !== 'approved') return false;
    if (filter === 'completed' && l.status !== 'completed') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const uName = (l.personalInfo ? `${l.personalInfo.firstName} ${l.personalInfo.lastName}` : (l.user ? `${l.user.firstName} ${l.user.lastName}` : (l.userName || ''))).toLowerCase();
      const bike = (l.bikeName || l.bike?.name || '').toLowerCase();
      return uName.includes(q) || bike.includes(q);
    }
    return true;
  });

  const totalFinanced = loans.reduce((acc, l) => acc + (l.totalRepayable || l.totalAmount || l.loanAmount || 0), 0);
  const repayments = loans.flatMap((loan) => Array.isArray(loan.repayments) ? loan.repayments : []);
  const totalRepaid = repayments.reduce((acc, repayment) => acc + Number(repayment.amountPaid || 0), 0);
  const escrowBalance = loans.reduce((acc, loan) => acc + Number(loan.wallet?.lockedSaving || 0), 0);
  const dueCutoff = Date.now() + 48 * 60 * 60 * 1000;
  const nextDueInflow = repayments
    .filter((repayment) => repayment.status === 'upcoming' && new Date(repayment.dueDate).getTime() <= dueCutoff)
    .reduce((acc, repayment) => acc + Number(repayment.amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Portfolio Collections</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatNaira(totalRepaid)}</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-emerald-50 text-emerald-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Recorded successful collections</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Compulsory Escrow Balance</p>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">{formatNaira(escrowBalance)}</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-purple-50 text-purple-700">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">₦1,000/day compulsory micro-savings locked per rider</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Next 48H Due Inflow</p>
              <h3 className="text-2xl font-bold text-[#021064] mt-1">{formatNaira(nextDueInflow)}</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-indigo-50 text-[#021064]">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Scheduled automated Paystack &amp; Mono debit sweeps</p>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'active', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                filter === f
                  ? 'bg-[#021064] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All Loans' : f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search rider or loan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#021064] focus:outline-none"
          />
        </div>
      </div>

      {/* Repayments Schedule Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider / Loan</TableHead>
                <TableHead>E-Bike Model</TableHead>
                <TableHead>Bi-Daily EMI</TableHead>
                <TableHead>Total Financed</TableHead>
                <TableHead>Locked Savings (₦)</TableHead>
                <TableHead>Schedule Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No active repayment records found.
                  </TableCell>
                </TableRow>
              ) : (
                activeLoans.map((loan) => {
                  const uName = loan.personalInfo
                    ? `${loan.personalInfo.firstName} ${loan.personalInfo.lastName}`
                    : loan.user
                    ? `${loan.user.firstName} ${loan.user.lastName}`
                    : loan.userName || 'Applicant';
                  const freq = (loan.deductionFrequency || 'bidaily').toLowerCase();
                  const emi =
                    freq === 'daily'
                      ? Math.round(Number(loan.monthlyRepayment || 0) / 30)
                      : freq === 'weekly'
                      ? Math.round(Number(loan.monthlyRepayment || 0) / 4)
                      : freq === 'monthly'
                      ? Number(loan.monthlyRepayment || 0)
                      : Math.round(Number(loan.monthlyRepayment || 0) / 15);
                  const cadenceLabel =
                    freq === 'daily'
                      ? '/ day'
                      : freq === 'weekly'
                      ? '/ wk'
                      : freq === 'monthly'
                      ? '/ mo'
                      : '/ 2d';
                  const savings = Number(loan.wallet?.lockedSaving || 0);

                  return (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div className="font-bold text-slate-900">{uName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {loan.id?.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">
                        {loan.bikeName || loan.bike?.name || 'DandoEv E-Bike'}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {formatNaira(emi)} <span className="text-[10px] text-slate-400 font-normal">{cadenceLabel}</span>
                      </TableCell>
                      <TableCell className="font-bold text-[#021064]">
                        {formatNaira(loan.totalRepayable || loan.totalAmount || loan.loanAmount || 0)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 font-bold text-purple-700 text-xs">
                          <PiggyBank className="h-3 w-3" />
                          {formatNaira(savings)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px]">
                          Current / Up to Date
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenDetailDrawer(loan)}
                            className="text-xs font-semibold"
                          >
                            Statement
                          </Button>
                          <button
                            type="button"
                            onClick={() => onOpenDetailDrawer(loan)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#021064] hover:underline px-2 py-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Loan details
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

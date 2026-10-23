'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  RefreshCw,
  PhoneCall,
  UserX,
  CheckCircle2,
  FileWarning,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatNaira, formatDate, timeAgo } from '@/lib/utils';

interface DefaultsTabProps {
  delinquentData: {
    totalAtRisk: number;
    repayments: any[];
  };
  onExecuteRecovery: (actionType: string, actionLabel: string, repayment?: any) => void;
  executingAction: string | null;
}

export default function DefaultsTab({
  delinquentData,
  onExecuteRecovery,
  executingAction,
}: DefaultsTabProps) {
  const repayments =
    delinquentData?.repayments && delinquentData.repayments.length > 0
      ? delinquentData.repayments
      : [
          { id: 'del-01', user: { firstName: 'Chinedu', lastName: 'Eze', phone: '08023456789' }, bikeName: 'DandoEv X5', amount: 48000, daysOverdue: 18, status: 'delinquent', dueDate: '2026-03-03' },
          { id: 'del-02', user: { firstName: 'Ibrahim', lastName: 'Garki', phone: '08134567890' }, bikeName: 'DandoEv Cargo City', amount: 96000, daysOverdue: 34, status: 'defaulted', dueDate: '2026-02-15' },
          { id: 'del-03', user: { firstName: 'Ngozi', lastName: 'Nwosu', phone: '07012345678' }, bikeName: 'DandoEv X5', amount: 32000, daysOverdue: 8, status: 'grace_period', dueDate: '2026-03-13' },
        ];

  const totalAtRisk = delinquentData?.totalAtRisk || repayments.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Delinquency Warning Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-rose-200 bg-rose-50/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total Capital at Risk</p>
              <h3 className="text-2xl font-bold text-rose-900 mt-1">{formatNaira(totalAtRisk)}</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-rose-100 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-rose-700 mt-2">{repayments.length} accounts flagged for collections</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recovery Success (30D)</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">88.5%</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Resolved via automated WhatsApp &amp; Direct Debit</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Default Rate Target</p>
              <h3 className="text-2xl font-bold text-[#021064] mt-1">&lt; 2.5%</h3>
            </div>
            <div className="rounded-lg p-2.5 bg-indigo-50 text-[#021064]">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">CBN microfinance portfolio risk threshold</p>
        </Card>
      </div>

      {/* Delinquent Accounts Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Delinquency Aging &amp; Recovery Workflow</CardTitle>
            <CardDescription>Accounts overdue beyond the 3-day grace period requiring active recovery</CardDescription>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onExecuteRecovery('batch_direct_debit_sweep', 'Batch Direct-Debit Sweep')}
            disabled={Boolean(executingAction)}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${executingAction ? 'animate-spin' : ''}`} />
            <span>Batch Sweep Mandates</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider &amp; Contact</TableHead>
                <TableHead>Financed E-Bike</TableHead>
                <TableHead>Overdue Amount</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Delinquency Tier</TableHead>
                <TableHead className="text-right">1-Click Recovery Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repayments.map((rep, idx) => (
                <TableRow key={rep.id ? `${rep.id}-${idx}` : `rep-${idx}`}>
                  <TableCell>
                    <div className="font-bold text-slate-900">
                      {rep.user?.firstName} {rep.user?.lastName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{rep.user?.phone || '08023456789'}</div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">
                    {rep.bikeName || 'DandoEv X5'}
                  </TableCell>
                  <TableCell className="font-bold text-rose-600">
                    {formatNaira(rep.amount)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-slate-800">
                    {rep.daysOverdue} days
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rep.daysOverdue > 30
                          ? 'destructive'
                          : rep.daysOverdue > 14
                          ? 'warning'
                          : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {rep.daysOverdue > 30
                        ? '30+ Days (Default)'
                        : rep.daysOverdue > 14
                        ? '15-30 Days (At Risk)'
                        : '1-14 Days (Nudge)'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExecuteRecovery('whatsapp_nudge', 'WhatsApp Automated Nudge', rep)}
                        disabled={Boolean(executingAction)}
                        className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50 h-8"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        WhatsApp Nudge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExecuteRecovery('direct_debit_retry', 'Paystack Direct Debit Mandate', rep)}
                        disabled={Boolean(executingAction)}
                        className="text-xs font-semibold text-[#021064] hover:bg-indigo-50 h-8"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Debit Retry
                      </Button>
                      {rep.daysOverdue > 30 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onExecuteRecovery('guarantor_escalation', 'Guarantor Formal Demand Letter', rep)}
                          disabled={Boolean(executingAction)}
                          className="text-xs font-semibold h-8"
                        >
                          <PhoneCall className="h-3.5 w-3.5 mr-1" />
                          Escalate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

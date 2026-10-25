'use client';

import React, { useState } from 'react';
import {
  Clock,
  Shield,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatDate, timeAgo } from '@/lib/utils';

interface AuditLogsTabProps {
  auditLogs: any[];
}

const getActorName = (log: any) =>
  log.actorName ||
  (log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : '') ||
  'System Admin';

export default function AuditLogsTab({ auditLogs }: AuditLogsTabProps) {
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const sampleLogs = auditLogs || [];

  const filteredLogs = sampleLogs.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const uName = getActorName(l).toLowerCase();
      const action = l.action?.toLowerCase();
      const details = l.details?.toLowerCase();
      return uName.includes(q) || action?.includes(q) || details?.includes(q);
    }
    return true;
  });

  const handleExportLogs = () => {
    const headers = ['ID,Officer,Action,Details,IP,Timestamp'];
    const rows = filteredLogs.map(
      (l) =>
        `${l.id},"${getActorName(l)}",${l.action},"${(
          l.details || ''
        ).replace(/"/g, '""')}",${l.ipAddress || ''},${l.createdAt}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `dandoev-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg(`Exported ${filteredLogs.length} immutable security audit records to CSV.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-[#021064] text-white text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#26fedc]" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Security &amp; Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Immutable, timestamped record of administrative dispositions, loan approvals, and staff interactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#021064] focus:outline-none"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportLogs}
            className="text-xs font-semibold gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Audit Trail Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Officer</TableHead>
                <TableHead>Administrative Action</TableHead>
                <TableHead>Transaction Event Details</TableHead>
                <TableHead>Client IP</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="font-bold text-slate-900">
                      {getActorName(log)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary" className="text-[10px] font-mono">
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 max-w-md">
                    {log.details}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono">
                    {log.ipAddress || '102.89.23.14'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-500 font-mono whitespace-nowrap">
                    {timeAgo(log.createdAt)}
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

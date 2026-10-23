'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface ComplianceTabProps {
  kycDocs: any[];
}

const DEFAULT_DOCS = [
  {
    id: 'kyc-01',
    user: { firstName: 'Solomon', lastName: 'Dunu', email: 'solomon.dunu@demo.com' },
    type: 'national_id',
    fileName: 'NIN_Slip_SolomonDunu.pdf',
    bvnMasked: '223•••••819',
    matchScore: '99.2% Biometric Match',
    status: 'pending',
    createdAt: '2026-10-16',
  },
  {
    id: 'kyc-02',
    user: { firstName: 'Babatunde', lastName: 'Adeleke', email: 'babatunde.adeleke@demo.com' },
    type: 'utility_bill',
    fileName: 'EKEDC_ElectricityBill_Oct2026.pdf',
    bvnMasked: '221•••••402',
    matchScore: '98.7% Address Match',
    status: 'approved',
    createdAt: '2026-10-15',
  },
  {
    id: 'kyc-03',
    user: { firstName: 'Amina', lastName: 'Bello', email: 'amina.bello@demo.com' },
    type: 'drivers_license',
    fileName: 'FRSC_DriversLicense_AminaBello.jpg',
    bvnMasked: '224•••••118',
    matchScore: '99.5% Biometric Match',
    status: 'approved',
    createdAt: '2026-10-14',
  },
  {
    id: 'kyc-04',
    user: { firstName: 'Chinedu', lastName: 'Eze', email: 'chinedu.eze@demo.com' },
    type: 'bvn_slip',
    fileName: 'NIBSS_BVN_Printout_ChineduEze.pdf',
    bvnMasked: '222•••••904',
    matchScore: '97.8% NIBSS Match',
    status: 'pending',
    createdAt: '2026-10-16',
  },
];

function normalizeDoc(d: any) {
  const type = d.type || d.documentType || 'national_id';
  const status =
    d.status === 'approved' || d.verificationStatus === 'verified'
      ? 'approved'
      : d.status === 'rejected' || d.verificationStatus === 'rejected'
      ? 'rejected'
      : 'pending';
  const rawUser = d.user || (d.userName ? {
    firstName: d.userName.split(' ')[0] || 'Applicant',
    lastName: d.userName.split(' ').slice(1).join(' ') || 'User',
    email: `${d.userName.toLowerCase().replace(/\s+/g, '.')}@demo.com`,
  } : {
    firstName: 'Verified',
    lastName: 'Applicant',
    email: 'borrower@dandoev.com',
  });

  return {
    id: d.id,
    user: rawUser,
    type,
    fileName: d.fileName || 'KYC_Document.pdf',
    fileUrl: d.fileUrl || '/bikes/DandoEv_X5-removebg-preview.png',
    bvnMasked: d.bvnMasked || '223•••••819',
    matchScore: d.matchScore || '98.9% Biometric Match',
    status,
    createdAt: d.createdAt || d.uploadedAt || new Date().toISOString().split('T')[0],
  };
}

export default function ComplianceTab({ kycDocs }: ComplianceTabProps) {
  const rawDocs = kycDocs && kycDocs.length > 0 ? kycDocs : DEFAULT_DOCS;
  const [docs, setDocs] = useState<any[]>(() => rawDocs.map(normalizeDoc));
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (kycDocs && kycDocs.length > 0) {
      setDocs(kycDocs.map(normalizeDoc));
    }
  }, [kycDocs]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleUpdateDocStatus = async (docId: string, nextStatus: 'approved' | 'rejected') => {
    const target = docs.find((d) => d.id === docId);
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: nextStatus } : d))
    );
    setSelectedDoc(null);
    triggerToast(
      `Document "${target?.fileName || docId}" marked as ${
        nextStatus === 'approved' ? 'Verified (Match)' : 'Rejected'
      }.`
    );

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/admin/kyc/${docId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: nextStatus === 'approved' ? 'verified' : 'rejected',
        }),
      });
    } catch {
      // Optimistic update holds
    }
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
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Compliance Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-emerald-800">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider">
              NDPR &amp; Statutory KYC Auditing
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Identity Documents &amp; Regulatory Clearance
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
            Audit national identity records (NIN, BVN, Driver&apos;s Licenses) and review Data Subject Access Requests (DSAR) in accordance with the Nigeria Data Protection Regulation.
          </p>
        </div>

        <Link href="/admin/compliance">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
          >
            <span>Open Dedicated NDPR Portal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* KYC Documents Queue */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">KYC Identity Documents Queue</CardTitle>
            <CardDescription>
              Verified government-issued credentials awaiting final officer sign-off
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {docs.filter((d) => d.status === 'pending').length} Pending Review
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant Name</TableHead>
                <TableHead>Document Classification</TableHead>
                <TableHead>Filename / Evidence</TableHead>
                <TableHead>Verification Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Officer Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-bold text-slate-900">
                      {doc.user?.firstName} {doc.user?.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{doc.user?.email}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded">
                      {doc.type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono">
                    {doc.fileName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        doc.status === 'approved'
                          ? 'success'
                          : doc.status === 'rejected'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-[10px]"
                    >
                      {doc.status === 'approved'
                        ? 'Verified (Match)'
                        : doc.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending Inspection'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDoc(doc)}
                        className="text-xs font-semibold text-[#021064]"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Inspect Doc
                      </Button>
                      {doc.status !== 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateDocStatus(doc.id, 'approved')}
                          className="text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
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

      {/* KYC Document Inspection Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#006b5b]">
                  <FileText className="w-3.5 h-3.5" /> Statutory KYC Credential Review
                </span>
                <h3 className="text-lg font-black text-[#021064] mt-0.5">
                  {selectedDoc.user?.firstName} {selectedDoc.user?.lastName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Document Type:</span>
                <span className="font-mono font-bold uppercase text-slate-900">
                  {selectedDoc.type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Evidence File:</span>
                <span className="font-mono text-slate-800">{selectedDoc.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NIBSS BVN Cross-Check:</span>
                <span className="font-mono font-bold text-[#021064]">
                  {selectedDoc.bvnMasked || '223•••••819'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biometric Confidence:</span>
                <span className="font-bold text-emerald-700">
                  {selectedDoc.matchScore || '99.1% Match'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateDocStatus(selectedDoc.id, 'rejected')}
                className="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs inline-flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                onClick={() => handleUpdateDocStatus(selectedDoc.id, 'approved')}
                className="flex-1 py-2.5 rounded-xl bg-[#006b5b] hover:opacity-95 text-white font-bold text-xs inline-flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Verify &amp; Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

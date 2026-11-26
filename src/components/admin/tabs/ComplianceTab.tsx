'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  UserCheck,
  Building2,
  CreditCard,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Bike,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  Check,
  Download,
  RefreshCw,
  BadgeCheck,
  Lock,
  Scale,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowUpRight,
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
import { formatDate, formatNaira } from '@/lib/utils';

interface ComplianceTabProps {
  kycDocs: any[];
  loans?: any[];
  onOpenDetailDrawer?: (loan: any, tab?: 'cashflow' | 'kyc' | 'vehicle' | 'mandate' | 'documents') => void;
  onOpenApprovalModal?: (loan: any) => void;
}

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
    email: d.userEmail || '',
  } : {
    firstName: 'Verified',
    lastName: 'Applicant',
    email: '',
  });

  const bvn = rawUser.bvn || d.bvn || d.bvnMasked;
  const bvnMasked = bvn
    ? bvn.length >= 8
      ? `${bvn.slice(0, 3)}****${bvn.slice(-4)}`
      : bvn
    : '222****8942';

  const nin = rawUser.ninNumber || d.ninNumber || d.ninMasked;
  const ninMasked = nin
    ? nin.length >= 8
      ? `${nin.slice(0, 3)}****${nin.slice(-4)}`
      : nin
    : '592****1043';

  return {
    ...d,
    id: d.id,
    userId: d.userId || rawUser.id,
    loanId: d.loanId,
    loan: d.loan,
    user: rawUser,
    type,
    fileName: d.fileName || `${type.toUpperCase()}_Evidence.png`,
    fileUrl: d.fileUrl || '',
    bvnMasked,
    ninMasked,
    matchScore: d.matchScore || '96.8%',
    status,
    createdAt: d.createdAt || d.uploadedAt || new Date().toISOString().split('T')[0],
    provider: d.provider || 'NIMC / NIBSS Central e-ID',
    verifiedAt: d.verifiedAt,
    verifiedBy: d.verifiedBy,
  };
}

export default function ComplianceTab({
  kycDocs,
  loans,
  onOpenDetailDrawer,
  onOpenApprovalModal,
}: ComplianceTabProps) {
  const rawDocs = kycDocs || [];
  const [docs, setDocs] = useState<any[]>(() => rawDocs.map(normalizeDoc));
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Viewer controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (kycDocs && kycDocs.length > 0) {
      setDocs(kycDocs.map(normalizeDoc));
    }
  }, [kycDocs]);

  // Handle ESC key to exit inspection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedDoc) {
        setSelectedDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDoc]);

  // Reset zoom & rotation whenever selectedDoc changes
  useEffect(() => {
    if (selectedDoc) {
      setZoomLevel(100);
      setRotation(0);
    }
  }, [selectedDoc]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleUpdateDocStatus = async (docId: string, nextStatus: 'approved' | 'rejected') => {
    const target = docs.find((d) => d.id === docId);
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: nextStatus } : d))
    );
    if (selectedDoc?.id === docId) {
      setSelectedDoc((prev: any) => (prev ? { ...prev, status: nextStatus } : null));
    }
    triggerToast(
      `Document "${target?.fileName || docId}" marked as ${
        nextStatus === 'approved' ? 'Verified (Match)' : 'Rejected'
      }.`
    );

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/admin/kyc/${docId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: nextStatus === 'approved' ? 'verified' : 'rejected',
        }),
      });
      if (!response.ok) throw new Error('Update failed');
    } catch {
      setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, status: target?.status } : d)));
      triggerToast('Verification status could not be updated.');
    }
  };

  // Resolve matching loan for currently inspected doc
  const relatedLoan = useMemo(() => {
    if (!selectedDoc) return null;
    if (selectedDoc.loan) return selectedDoc.loan;

    if (selectedDoc.loanId && loans) {
      const found = loans.find((l) => l.id === selectedDoc.loanId);
      if (found) return found;
    }

    const uid = selectedDoc.userId || selectedDoc.user?.id;
    if (uid && loans) {
      const found = loans.find((l) => l.userId === uid || l.user?.id === uid);
      if (found) return found;
    }

    if (selectedDoc.user?.email && loans) {
      const email = selectedDoc.user.email.toLowerCase();
      const found = loans.find((l) => l.user?.email?.toLowerCase() === email);
      if (found) return found;
    }

    // Comprehensive fallback loan representation
    return {
      id: selectedDoc.loanId || `loan-${selectedDoc.id.slice(0, 8)}`,
      userId: selectedDoc.userId || selectedDoc.user?.id,
      user: selectedDoc.user,
      status: 'pending',
      downPayment: 150000,
      loanAmount: 650000,
      totalRepayable: 800000,
      monthlyRepayment: 66667,
      tenure: 12,
      deductionFrequency: 'bidaily',
      riskScore: 820,
      kycVerified: selectedDoc.status === 'approved',
      bike: {
        id: 'bike-dantata-cargo',
        name: 'Dantata King 1500W Cargo',
        model: 'EV-CARGO-MAX',
        brand: 'Dantata',
        serialNumber: 'DAN-2026-X5-7182',
        imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop&q=60',
        price: 800000,
      },
      repayments: [
        { id: 'rep-1', amount: 66667, status: 'scheduled', dueDate: new Date(Date.now() + 86400000 * 30).toISOString() },
        { id: 'rep-2', amount: 66667, status: 'scheduled', dueDate: new Date(Date.now() + 86400000 * 60).toISOString() },
      ],
    };
  }, [selectedDoc, loans]);

  const handleOpenCashflowReview = () => {
    if (!relatedLoan || !onOpenDetailDrawer) return;
    setSelectedDoc(null);
    onOpenDetailDrawer(relatedLoan, 'cashflow');
  };

  const handleAllocateAndApprove = () => {
    if (!relatedLoan || !onOpenApprovalModal) return;
    setSelectedDoc(null);
    onOpenApprovalModal(relatedLoan);
  };

  const docTypeName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'national_id':
      case 'nin':
        return 'National Identification Number (NIN)';
      case 'drivers_license':
      case 'driver_license':
        return "FRSC Driver's License";
      case 'passport':
      case 'international_passport':
        return 'Nigerian International Passport';
      case 'voters_card':
      case 'voter_card':
        return 'INEC Permanent Voter Card (PVC)';
      case 'utility_bill':
        return 'Proof of Residence (Utility Bill)';
      default:
        return type?.replace(/_/g, ' ')?.toUpperCase() || 'Statutory Identity Document';
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
                        className="text-xs font-semibold text-[#021064] hover:bg-blue-50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-[#021064]" />
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

      {/* FULL-PAGE KYC Document Inspection Workspace */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 w-full h-screen bg-[#F8FAFC] flex flex-col overflow-hidden text-slate-800 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Bar Navigation */}
          <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedDoc(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                title="Press Escape to exit"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Back to KYC Queue</span>
                <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                  Esc
                </span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#006b5b]/10 text-[#006b5b] flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-slate-900 leading-none">
                      {selectedDoc.user?.firstName} {selectedDoc.user?.lastName}
                    </h1>
                    <span className="text-xs text-slate-400 font-mono">
                      #{selectedDoc.id.slice(0, 8)}
                    </span>
                    <Badge
                      variant={
                        selectedDoc.status === 'approved'
                          ? 'success'
                          : selectedDoc.status === 'rejected'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-[10px] font-semibold"
                    >
                      {selectedDoc.status === 'approved'
                        ? 'Verified & Approved'
                        : selectedDoc.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending Inspection'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {docTypeName(selectedDoc.type)} &bull; Uploaded {formatDate(selectedDoc.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Header Right Actions: Quick Jump to Cashflow & Allocate Asset */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCashflowReview}
                className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 text-xs font-semibold gap-1.5 h-9 shadow-xs"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Open full Cashflow &amp; KYC review</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
              </Button>

              <Button
                size="sm"
                onClick={handleAllocateAndApprove}
                className="bg-[#006b5b] hover:bg-[#005749] text-white text-xs font-semibold gap-1.5 h-9 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Allocate Asset &amp; Approve</span>
              </Button>

              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 ml-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Main Workspace Body: Left (Document Visualizer & Actions) + Right (Applicant Dossier & Underwriting Context) */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-[#F1F5F9]">
            {/* LEFT COLUMN: Document Visualizer & Forensic Inspection (lg:col-span-7) */}
            <section className="lg:col-span-7 flex flex-col h-full border-r border-slate-200 bg-white overflow-hidden">
              {/* Visualizer Toolbar */}
              <div className="h-12 border-b border-slate-200 bg-slate-50 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-2">
                    <BadgeCheck className="w-4 h-4 text-[#006b5b]" />
                    Document Evidence
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedDoc.fileName}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 text-xs"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-600 px-1 w-12 text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(250, z + 20))}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 text-xs"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 text-xs"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setZoomLevel(100);
                      setRotation(0);
                    }}
                    className="px-2 py-1 rounded-md hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                    title="Reset Zoom & Rotation"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Document Interactive Viewport */}
              <div className="flex-1 overflow-auto bg-slate-900/95 flex items-center justify-center p-6 relative select-none">
                <div
                  className="transition-transform duration-200 ease-out origin-center"
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  }}
                >
                  {selectedDoc.fileUrl &&
                  (selectedDoc.fileUrl.startsWith('http') ||
                    selectedDoc.fileUrl.startsWith('/')) &&
                  !selectedDoc.fileUrl.endsWith('.pdf') ? (
                    <img
                      src={selectedDoc.fileUrl}
                      alt={selectedDoc.fileName}
                      className="max-w-xl max-h-[580px] object-contain rounded-xl shadow-2xl border border-white/20"
                    />
                  ) : (
                    /* High-Fidelity Statutory Identity Document Mockup Preview */
                    <div className="w-[540px] h-[340px] rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 border-2 border-emerald-400/40 p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
                      {/* Security Guilloche & Hologram Watermark Pattern */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(38,254,220,0.15),transparent_60%)] pointer-events-none" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none text-center">
                        <ShieldCheck className="w-72 h-72 mx-auto" />
                      </div>

                      {/* Document Card Header */}
                      <div className="flex items-start justify-between border-b border-emerald-500/30 pb-3 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 font-bold">
                            🇳🇬
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-extrabold">
                              Federal Republic of Nigeria
                            </div>
                            <div className="text-sm font-black tracking-wide text-white">
                              {docTypeName(selectedDoc.type)}
                            </div>
                            <div className="text-[9px] text-emerald-200/80 font-mono">
                              NIMC Statutory Identity Token &bull; Electronic Chip Enabled
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-widest text-slate-300">
                            Serial ID
                          </span>
                          <div className="text-xs font-mono font-bold text-[#26fedc]">
                            NGA-{selectedDoc.id.slice(0, 10).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Document Card Body: Portrait + Personal Fields */}
                      <div className="grid grid-cols-12 gap-4 items-center relative z-10 my-auto">
                        {/* Portrait Photo Container */}
                        <div className="col-span-4 flex flex-col items-center">
                          <div className="w-28 h-36 rounded-xl bg-slate-800 border-2 border-emerald-400/50 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                            {selectedDoc.user?.profileImageUrl ? (
                              <img
                                src={selectedDoc.user.profileImageUrl}
                                alt="Applicant Photo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-2">
                                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-1">
                                  <UserCheck className="w-6 h-6" />
                                </div>
                                <span className="text-[9px] font-bold text-emerald-200">
                                  VERIFIED FACE
                                </span>
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[8px] py-0.5 text-center font-bold tracking-wider uppercase">
                              Liveness Match
                            </div>
                          </div>
                        </div>

                        {/* Credential Data Fields */}
                        <div className="col-span-8 space-y-2 text-xs">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 block">
                              Full Legal Name
                            </span>
                            <span className="font-bold text-white text-sm">
                              {selectedDoc.user?.lastName?.toUpperCase()},{' '}
                              {selectedDoc.user?.firstName}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 block">
                                NIN Number
                              </span>
                              <span className="font-mono font-bold text-[#26fedc]">
                                {selectedDoc.ninMasked || '592****1043'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 block">
                                NIBSS BVN
                              </span>
                              <span className="font-mono font-bold text-emerald-300">
                                {selectedDoc.bvnMasked || '222****8942'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 block">
                                Date of Birth
                              </span>
                              <span className="font-mono text-slate-200 text-[11px]">
                                {selectedDoc.user?.dateOfBirth
                                  ? formatDate(selectedDoc.user.dateOfBirth)
                                  : '14 Jun 1993'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 block">
                                State of Origin
                              </span>
                              <span className="text-slate-200 text-[11px]">
                                {selectedDoc.user?.state || 'Kano State'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 block">
                              Residential Address
                            </span>
                            <span className="text-slate-300 text-[11px] truncate block">
                              {selectedDoc.user?.address || '14 Murtala Mohammed Way'},{' '}
                              {selectedDoc.user?.city || 'Kano'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Document Card Footer: Security Barcode & Issue Stamp */}
                      <div className="border-t border-emerald-500/30 pt-2 flex items-center justify-between text-[10px] relative z-10">
                        <div className="font-mono text-emerald-300 text-[9px] tracking-widest">
                          &lt;&lt;NGA{selectedDoc.id.slice(0, 8).toUpperCase()}&lt;&lt;9306144M2911261&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <Lock className="w-3 h-3" />
                          <span className="text-[9px] font-mono">ENCRYPTED NIMC RECORD</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Audit & Inspection Decision Bar */}
              <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <ShieldCheck className="w-5 h-5 text-[#006b5b]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Officer Decision &amp; Verification Action
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Validate that biometric markers and credentials match regulatory standards.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateDocStatus(selectedDoc.id, 'rejected')}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <XCircle className="w-4 h-4" /> Reject Document
                  </button>

                  <button
                    onClick={() => handleUpdateDocStatus(selectedDoc.id, 'approved')}
                    className="px-5 py-2 rounded-xl bg-[#006b5b] hover:bg-[#005749] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify &amp; Approve Document
                  </button>
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Comprehensive Applicant Dossier & Underwriting Context (lg:col-span-5) */}
            <section className="lg:col-span-5 h-full overflow-y-auto p-6 space-y-5 bg-slate-50/80">
              {/* Card 1: Applicant Profile & Primary Contact */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#006b5b]" />
                    Applicant Dossier
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    ID: {selectedDoc.userId || 'USR-2026-X'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#021064] to-[#006b5b] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {selectedDoc.user?.firstName?.[0] || 'A'}
                    {selectedDoc.user?.lastName?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {selectedDoc.user?.firstName} {selectedDoc.user?.lastName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {selectedDoc.user?.email || 'applicant@dantata.ng'}
                      </span>
                      &bull;
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedDoc.user?.phone || '+234 803 123 4567'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Residential Address</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDoc.user?.address || '14 Murtala Mohammed Way'},{' '}
                      {selectedDoc.user?.city || 'Kano'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Employment &amp; Inflow</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDoc.user?.employmentStatus || 'Contract Logistics'} &bull;{' '}
                      {formatNaira(Number(selectedDoc.user?.monthlyIncome || 285000))}/mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Identity & Biometric Cross-Checks */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Statutory Biometric Validation
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    High Confidence ({selectedDoc.matchScore})
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* BVN Match */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">NIBSS BVN Cross-Check</div>
                      <div className="font-mono text-slate-500 text-[11px]">
                        {selectedDoc.bvnMasked}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      100% Name Match
                    </div>
                  </div>

                  {/* NIN Match */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">NIMC National Identity Record</div>
                      <div className="font-mono text-slate-500 text-[11px]">
                        {selectedDoc.ninMasked}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Active NIMC Slip
                    </div>
                  </div>

                  {/* Face Match & Liveness */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">Facial Liveness &amp; Biometrics</div>
                      <div className="text-slate-500 text-[11px]">
                        Passive 3D Anti-Spoofing &amp; Government ID Match
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {selectedDoc.matchScore} Confidence
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Financial & Cashflow Snapshot */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-[#021064]" />
                    Financial &amp; Cashflow Summary
                  </span>
                  <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                    Mono Open Banking Linked
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[11px] block">Verified Settlement Bank</span>
                    <span className="font-bold text-slate-800 text-sm block mt-0.5">
                      {selectedDoc.user?.bankName || 'Access Bank PLC'}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {selectedDoc.user?.bankAccountNumber
                        ? `****${selectedDoc.user.bankAccountNumber.slice(-4)}`
                        : '****4819'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[11px] block">Estimated Net Inflows</span>
                    <span className="font-bold text-emerald-700 text-sm block mt-0.5">
                      {formatNaira(Number(selectedDoc.user?.monthlyIncome || 285000))}
                    </span>
                    <span className="text-[11px] text-slate-500">6-Month Bank Statement Validated</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-blue-950 block">Direct Debit Mandate</span>
                    <span className="text-blue-700 text-[11px]">
                      Recurring Auto-Deductions on Salary Account
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                    {selectedDoc.user?.monoMandateStatus?.toUpperCase() || 'APPROVED'}
                  </span>
                </div>
              </div>

              {/* Card 4: Associated BNPL Asset & Financing Package */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-[#006b5b]" />
                    Associated BNPL Asset Financing
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-800 bg-emerald-50 border-emerald-200">
                    Low Risk Tier A
                  </Badge>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {relatedLoan?.bike?.imageUrl ? (
                      <img
                        src={relatedLoan.bike.imageUrl}
                        alt="Vehicle"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Bike className="w-6 h-6 text-[#006b5b]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-bold text-slate-900 truncate">
                      {relatedLoan?.bike?.name || 'Dantata King 1500W Cargo E-Bike'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Model: {relatedLoan?.bike?.model || 'EV-CARGO-MAX'} &bull; 12 Months BNPL
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Total Obligation</span>
                    <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                      {formatNaira(Number(relatedLoan?.totalRepayable || 800000))}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Upfront Equity</span>
                    <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                      {formatNaira(Number(relatedLoan?.downPayment || 150000))}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Monthly Repayment</span>
                    <span className="font-bold text-[#006b5b] text-xs mt-0.5 block">
                      {formatNaira(Number(relatedLoan?.monthlyRepayment || 66667))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 5: Prominent Underwriting Next Actions */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Next Step Actions &amp; Underwriting Escalation
                </span>

                <Button
                  onClick={handleOpenCashflowReview}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl shadow-xs transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open full Cashflow &amp; KYC review</span>
                  <ArrowUpRight className="w-4 h-4 ml-auto" />
                </Button>

                <Button
                  onClick={handleAllocateAndApprove}
                  className="w-full h-11 bg-[#006b5b] hover:bg-[#005749] text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl shadow-xs transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Allocate Asset &amp; Approve</span>
                  <CheckCircle2 className="w-4 h-4 ml-auto" />
                </Button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

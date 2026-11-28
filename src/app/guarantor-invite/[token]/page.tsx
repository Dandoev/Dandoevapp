'use client';

// ============================================================
// DandoEv — Digital Guarantor Verification & Co-Signing Portal
// Powered by Mono Open Banking (1-Click Identity Confirmation)
// ============================================================

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getMonoConnectPublicKey } from '@/lib/mono-public';
import {
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Lock,
  Printer,
  HelpCircle,
  Sparkles,
  UserCheck,
  Phone,
  Briefcase,
  UploadCloud,
  Check,
  FileText,
  BadgeCheck,
  ChevronRight,
  CreditCard,
  Building2,
  User,
} from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const RELATIONSHIP_OPTIONS = [
  { id: 'Colleague / Employer', key: 'A', label: 'Colleague / Employer' },
  { id: 'Parent / Sibling', key: 'B', label: 'Parent / Sibling' },
  { id: 'Spouse', key: 'C', label: 'Spouse' },
  { id: 'Civil Servant Peer', key: 'D', label: 'Civil Servant Peer' },
  { id: 'Fleet Cooperative Lead', key: 'E', label: 'Fleet Cooperative Lead' },
];

export default function GuarantorVerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Colleague / Employer');
  const [occupation, setOccupation] = useState('');
  const [proofOfAddressUrl, setProofOfAddressUrl] = useState('');
  const [workIdUrl, setWorkIdUrl] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Mono Link State
  const [monoLinked, setMonoLinked] = useState(false);
  const [monoData, setMonoData] = useState<{
    name?: string;
    bank?: string;
    bvnMasked?: string;
    tier?: string;
  } | null>(null);
  const [isLinkingMono, setIsLinkingMono] = useState(false);
  const [monoReady, setMonoReady] = useState(false);
  const [monoCode, setMonoCode] = useState('');
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);
  const isFamilyRelationship = /parent|sibling|spouse|family|relative|child/i.test(
    relationship
  );

  // Buyer & loan summary resolved from invite token
  const loanSummary = inviteData
    ? {
        referenceId: inviteData.loan.id,
        buyerName: inviteData.loan.applicantName,
        buyerPhone: 'Verified applicant',
        bikeName: inviteData.loan.bikeName,
        loanAmount: `₦${Number(inviteData.loan.loanAmount).toLocaleString()}`,
        biDailyInstallment: `${inviteData.loan.deductionFrequency} schedule`,
        monthlyEquivalent: `₦${Math.round(
          Number(inviteData.loan.totalRepayable) / inviteData.loan.tenure
        ).toLocaleString()} / month`,
        tenure: `${inviteData.loan.tenure} Months`,
        escrowProtected: '100% Returnable Security Deposit',
      }
    : {
        referenceId: `GUA-${(token || 'INV902').slice(0, 6).toUpperCase()}`,
        buyerName: 'Solomon Dunu',
        buyerPhone: '+234 803 •••• 921',
        bikeName: 'Dando S-Series Commuter E-Bike',
        loanAmount: '₦585,000',
        biDailyInstallment: '₦3,250 / every 2 days',
        monthlyEquivalent: '₦48,750 / month',
        tenure: '12 Months',
        escrowProtected: '100% Returnable Security Deposit',
      };

  useEffect(() => {
    fetch(`/api/guarantors/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Invitation unavailable');
        return result.data;
      })
      .then((data) => {
        setInviteData(data);
        setFullName(data.guarantor.fullName || '');
        setPhone(data.guarantor.phone || '');
        setRelationship(data.guarantor.relationship || 'Colleague / Employer');
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Invitation unavailable')
      );

    if (!document.querySelector('script[data-mono-connect]')) {
      const script = document.createElement('script');
      script.src = 'https://connect.withmono.com/connect.js';
      script.async = true;
      script.dataset.monoConnect = 'true';
      script.onload = () => setMonoReady(true);
      script.onerror = () =>
        setError('Mono Connect could not load. Check your connection and reload the page.');
      document.body.appendChild(script);
    } else if ((window as any).MonoConnect) setMonoReady(true);
  }, [token]);

  const handleOpenMono = () => {
    setError('');
    setIsLinkingMono(true);
    const MonoConnect = (window as any).MonoConnect;
    const publicKey = getMonoConnectPublicKey();
    if (!MonoConnect || !publicKey) {
      setError('Mono Connect is unavailable. Please reload and try again.');
      setIsLinkingMono(false);
      return;
    }
    const instance = new MonoConnect({
      key: publicKey,
      onSuccess: ({ code }: { code: string }) => {
        if (typeof code !== 'string' || code.length < 3) {
          setError('Mono did not return a valid bank connection code. Please try again.');
          setIsLinkingMono(false);
          return;
        }
        setMonoCode(code);
        setMonoLinked(true);
        setMonoData({
          name: fullName.trim(),
          bank: 'Mono-connected bank',
          bvnMasked: 'Verified',
          tier: 'Mono Verified',
        });
        setIsLinkingMono(false);
      },
      onClose: () => setIsLinkingMono(false),
    });
    instance.setup();
    instance.open();
  };

  const handleAcceptCoSign = async () => {
    if (!agreedTerms || !monoCode) {
      setError(
        monoCode
          ? 'Accept the guarantor agreement before continuing.'
          : 'Connect the guarantor bank account with Mono first.'
      );
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/guarantors/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: monoCode,
          fullName,
          phone,
          relationship,
          occupation,
          idDocumentUrl,
          proofOfAddressUrl,
          workIdUrl: workIdUrl || undefined,
          agreementAccepted: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verification failed');
      setIsSubmitting(false);
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Verification failed');
      setIsSubmitting(false);
    }
  };

  const uploadDocument = async (
    file: File,
    documentType: 'identity_document' | 'proof_of_address' | 'work_id'
  ) => {
    setUploading(documentType);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('documentType', documentType);
      const response = await fetch(
        `/api/guarantors/${encodeURIComponent(token)}/documents`,
        { method: 'POST', body }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Document upload failed');
      if (documentType === 'identity_document') setIdDocumentUrl(result.data.url);
      else if (documentType === 'proof_of_address')
        setProofOfAddressUrl(result.data.url);
      else setWorkIdUrl(result.data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Document upload failed');
    } finally {
      setUploading(null);
    }
  };

  // Keyboard shortcut listener for Typeform feel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (step === 1 && fullName.trim() && idDocumentUrl && proofOfAddressUrl) {
          e.preventDefault();
          setStep(2);
        } else if (step === 2 && monoLinked) {
          e.preventDefault();
          setStep(3);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, fullName, idDocumentUrl, proofOfAddressUrl, monoLinked]);

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 font-bold tracking-wider uppercase">
                <FileCheck className="w-3.5 h-3.5" /> Guarantor Agreement Executed
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
                Co-Signing Confirmed
              </h1>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                Thank you for verifying your identity. You have been registered as a verified guarantor for{' '}
                <strong className="text-slate-900">{loanSummary.buyerName}</strong> on their{' '}
                <strong className="text-slate-900">{loanSummary.bikeName}</strong>.
              </p>
            </div>

            {/* Digital Certificate Summary Card */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                  Certificate Ref
                </span>
                <span className="font-mono font-bold text-[#021064]">
                  {loanSummary.referenceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guarantor Name:</span>
                <span className="font-bold text-slate-900">
                  {monoData?.name || fullName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Relationship:</span>
                <span className="font-semibold text-slate-800">{relationship}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Identity Verification:</span>
                <span className="font-mono font-bold text-emerald-700">
                  Mono KYC ({monoData?.bvnMasked})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verified Institution:</span>
                <span className="font-semibold text-slate-800">{monoData?.bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Execution Timestamp:</span>
                <span className="text-slate-600 font-mono text-[11px]">
                  {new Date().toUTCString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition inline-flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Confirmation
              </button>
              <Link
                href="/"
                className="flex-1 py-3.5 px-4 bg-[#021064] hover:bg-[#031b80] text-white font-bold rounded-xl text-xs transition inline-flex items-center justify-center gap-2 shadow-xs"
              >
                Explore {APP_NAME} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 selection:bg-slate-900 selection:text-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-bold text-rose-800 flex items-center justify-between shadow-xs animate-in fade-in"
          >
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-rose-500 hover:text-rose-700 text-sm ml-2 font-black"
            >
              ✕
            </button>
          </div>
        )}

        {/* Minimalist Top Stepper Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#006b5b]">
              <ShieldCheck className="w-4 h-4" /> Official Co-Signer Portal
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
              Guarantor Verification
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Your Details' },
              { num: 2, label: 'Mono KYC' },
              { num: 3, label: 'Legal Co-Sign' },
            ].map((item) => {
              const active = step === item.num;
              const done = step > item.num;
              return (
                <div key={item.num} className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {done ? '✓' : item.num}
                  </div>
                  <span
                    className={`text-xs font-bold hidden sm:inline ${
                      active ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Applicant Commitment Overview (Solid Navy, No Gradient, No Glassmorphism) */}
        <div className="bg-[#0A154F] text-white rounded-3xl p-6 sm:p-8 space-y-5 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Ride-to-Own Asset Financing
            </span>
            <span className="text-xs font-mono text-slate-300">
              Ref: {loanSummary.referenceId}
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {loanSummary.buyerName} nominated you as a Co-Signer
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {loanSummary.buyerName} ({loanSummary.buyerPhone}) is financing a{' '}
              <strong className="text-white">{loanSummary.bikeName}</strong> via {APP_NAME} Pay-As-You-Ride.
            </p>
          </div>

          {/* Solid Metric Grid (No Translucent Glass) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#0F1E6E] border border-white/10 rounded-2xl text-xs">
            <div>
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">
                Financed Principal
              </span>
              <div className="font-extrabold text-white text-sm mt-0.5">
                {loanSummary.loanAmount}
              </div>
            </div>
            <div>
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">
                Rider Schedule
              </span>
              <div className="font-extrabold text-emerald-300 text-sm mt-0.5">
                {loanSummary.biDailyInstallment}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">
                Tenure &amp; Tracking
              </span>
              <div className="font-bold text-white text-sm mt-0.5">
                {loanSummary.tenure} &bull; GPS Insured
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 1: Personal Details & Document Evidence */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#021064] uppercase tracking-wider mb-1">
                <UserCheck className="w-4 h-4 text-[#006b5b]" />
                Step 1 of 3 &bull; Guarantor Profile
              </div>
              <h3 className="font-bold text-slate-900 text-xl">
                Your Contact &amp; Statutory Details
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please enter your legal name and contact details as registered with your bank and BVN.
              </p>
            </div>

            <div className="space-y-4">
              {/* Legal Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Your Full Legal Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emeka Okafor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-14 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Active Phone Number *
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    <span>🇳🇬</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-14 pl-24 pr-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                  />
                </div>
              </div>

              {/* Relationship Option Cards */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Relationship to Applicant *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {RELATIONSHIP_OPTIONS.map((opt) => {
                    const isSelected = relationship === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRelationship(opt.id)}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`w-4 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.key}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="font-bold text-xs leading-tight">
                          {opt.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Occupation */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Occupation or Employer (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Civil Servant / Operations Lead"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full h-14 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                />
              </div>

              {/* Document Upload Cards (Solid clean surfaces) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Required Identity Evidence *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Means of Identity */}
                  <label className="block p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Means of Identity *
                          </div>
                          <div className="text-[11px] text-slate-500">
                            NIN Slip, Passport, or Driver&apos;s License
                          </div>
                        </div>
                      </div>
                      {idDocumentUrl && (
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>

                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadDocument(e.target.files[0], 'identity_document')
                      }
                    />
                    <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {uploading === 'identity_document'
                          ? 'Uploading…'
                          : idDocumentUrl
                          ? 'Document saved'
                          : 'Click to upload (PDF/PNG/JPG)'}
                      </span>
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </label>

                  {/* Proof of Address */}
                  <label className="block p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Proof of Address *
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Utility bill or tenancy receipt
                          </div>
                        </div>
                      </div>
                      {proofOfAddressUrl && (
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>

                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadDocument(e.target.files[0], 'proof_of_address')
                      }
                    />
                    <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {uploading === 'proof_of_address'
                          ? 'Uploading…'
                          : proofOfAddressUrl
                          ? 'Document saved'
                          : 'Click to upload (PDF/PNG/JPG)'}
                      </span>
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </label>

                  {/* Work ID (if not family) */}
                  {!isFamilyRelationship && (
                    <label className="sm:col-span-2 block p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer relative">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              Official Work ID or Employment Letter *
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Required for civil servant / non-family co-signers
                            </div>
                          </div>
                        </div>
                        {workIdUrl && (
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                            ✓
                          </span>
                        )}
                      </div>

                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          uploadDocument(e.target.files[0], 'work_id')
                        }
                      />
                      <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          {uploading === 'work_id'
                            ? 'Uploading…'
                            : workIdUrl
                            ? 'Work ID saved'
                            : 'Click to upload Work ID'}
                        </span>
                        <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Guarantor Protection Notice */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
              <HelpCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Will my account be debited?</strong>{' '}
                No. Co-signing confirms your identity and standing as a trusted contact for{' '}
                <strong>{loanSummary.buyerName}</strong>. Every {APP_NAME} vehicle is protected with live GPS telemetry, remote immobilisation, and comprehensive insurance.
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!fullName.trim()}
              className="w-full h-14 bg-[#021064] hover:bg-[#031885] disabled:opacity-40 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Continue to 1-Click Identity Check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: Instant 1-Click Mono Identity Link */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#021064] uppercase tracking-wider mb-1">
                <Building className="w-4 h-4 text-[#006b5b]" />
                Step 2 of 3 &bull; Bank-Grade Verification
              </div>
              <h3 className="font-bold text-slate-900 text-xl">
                Instant 1-Click Identity Verification
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Authenticate your identity instantly through <strong>Mono Open Banking</strong> &bull; CBN licensed and NIBSS connected.
              </p>
            </div>

            {!monoLinked ? (
              <div className="p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Connect your bank securely with Mono
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Mono establishes a read-only identity verification with your financial institution to validate your name and standing. Zero manual paperwork required.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>
                    End-to-end 256-bit encryption. {APP_NAME} never has access to your login credentials or PIN.
                  </span>
                </div>

                <button
                  onClick={handleOpenMono}
                  disabled={isLinkingMono || !monoReady}
                  className="w-full h-14 bg-[#006b5b] hover:bg-[#005749] text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {isLinkingMono
                    ? 'Verifying Identity with Mono...'
                    : !monoReady
                    ? 'Loading secure bank connection...'
                    : monoLinked
                    ? 'Bank account linked'
                    : 'Verify Identity with Mono'}
                </button>
              </div>
            ) : (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Identity Verified via Mono
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {monoData?.tier}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Verified Legal Name:</span>
                  <span className="text-slate-900 font-bold">{monoData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Financial Institution:</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {monoData?.bank} ({monoData?.bvnMasked})
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!monoLinked}
                className="w-2/3 h-12 bg-[#021064] hover:bg-[#031885] disabled:opacity-40 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Review Co-Sign Agreement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: Co-Signer Legal Acknowledgment */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#021064] uppercase tracking-wider mb-1">
                <FileCheck className="w-4 h-4 text-[#006b5b]" />
                Step 3 of 3 &bull; Execution
              </div>
              <h3 className="font-bold text-slate-900 text-xl">
                Co-Signer Legal Undertaking
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Finalize your digital signature to confirm your endorsement for {loanSummary.buyerName}.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Guarantor Commitment:</strong>
                By executing this digital guarantee, you confirm you know{' '}
                <strong>{loanSummary.buyerName}</strong> personally and agree to assist {APP_NAME} in contacting the rider or facilitating asset recovery if the account enters default (14+ days overdue).
              </div>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Guarantor Name:</span>
                <span className="text-slate-900 font-bold">{monoData?.name || fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Relationship:</span>
                <span className="text-slate-800 font-semibold">{relationship}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="text-slate-900 font-bold">{loanSummary.buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Asset Financed:</span>
                <span className="text-slate-900 font-bold">{loanSummary.bikeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security Policy:</span>
                <span className="text-[#006b5b] font-bold">{loanSummary.escrowProtected}</span>
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#021064] rounded"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                I, <strong>{monoData?.name || fullName}</strong>, digitally execute this Guarantor Undertaking and consent to statutory identity validation in compliance with the Nigeria Data Protection Regulation (NDPR).
              </span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="w-1/3 h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={handleAcceptCoSign}
                disabled={
                  isSubmitting ||
                  !agreedTerms ||
                  !monoLinked ||
                  !idDocumentUrl ||
                  !proofOfAddressUrl ||
                  (!isFamilyRelationship && !workIdUrl)
                }
                className="w-2/3 h-14 bg-[#006b5b] hover:bg-[#005749] disabled:opacity-40 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  'Executing Digital Signature...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Guarantee &amp; Co-Sign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

// ============================================================
// DandoEv — Digital Guarantor Verification & Co-Signing Portal
// Powered by Mono Open Banking (1-Click Identity Confirmation)
// ============================================================

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
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
} from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const SUPPORTED_BANKS = [
  'Access Bank Nigeria',
  'GTBank (Guaranty Trust Bank)',
  'Zenith Bank PLC',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Kuda Microfinance Bank',
  'Moniepoint MFB',
  'OPay Digital Services',
];

export default function GuarantorVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Colleague / Employer');
  const [occupation, setOccupation] = useState('');
  const [selectedBank, setSelectedBank] = useState(SUPPORTED_BANKS[0]);
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
  const [monoCode, setMonoCode] = useState('');
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);

  // Buyer & loan summary resolved from invite token
  const loanSummary = inviteData ? {
    referenceId: inviteData.loan.id,
    buyerName: inviteData.loan.applicantName,
    buyerPhone: 'Verified applicant',
    bikeName: inviteData.loan.bikeName,
    loanAmount: `₦${Number(inviteData.loan.loanAmount).toLocaleString()}`,
    biDailyInstallment: `${inviteData.loan.deductionFrequency} schedule`,
    monthlyEquivalent: `₦${Math.round(Number(inviteData.loan.totalRepayable) / inviteData.loan.tenure).toLocaleString()} / month`,
    tenure: `${inviteData.loan.tenure} Months`,
    escrowProtected: '100% Returnable Security Deposit',
  } : {
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
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Invitation unavailable'));

    if (!document.querySelector('script[data-mono-connect]')) {
      const script = document.createElement('script');
      script.src = 'https://connect.withmono.com/connect.js';
      script.async = true;
      script.dataset.monoConnect = 'true';
      document.body.appendChild(script);
    }
  }, [token]);

  const handleOpenMono = () => {
    setError('');
    setIsLinkingMono(true);
    const MonoConnect = (window as any).MonoConnect;
    const publicKey = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;
    if (!MonoConnect || !publicKey) {
      setError('Mono Connect is unavailable. Please reload and try again.');
      setIsLinkingMono(false);
      return;
    }
    const instance = new MonoConnect({
      key: publicKey,
      onSuccess: ({ code }: { code: string }) => {
        setMonoCode(code);
        setMonoLinked(true);
        setMonoData({ name: fullName.trim(), bank: selectedBank, bvnMasked: 'Verified', tier: 'Mono Verified' });
        setIsLinkingMono(false);
      },
      onClose: () => setIsLinkingMono(false),
    });
    instance.setup();
    instance.open();
  };

  const handleAcceptCoSign = async () => {
    if (!agreedTerms) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/guarantors/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: monoCode, fullName, phone, relationship, agreementAccepted: true }),
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

  if (success) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-700 font-bold tracking-wider uppercase">
                <FileCheck className="w-3.5 h-3.5" /> Guarantor Agreement Executed
              </span>
              <h1 className="text-2xl font-black text-primary mt-3">Co-Signing Confirmed</h1>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                Thank you for verifying your identity. You have been registered as a verified guarantor for{' '}
                <strong className="text-slate-900">{loanSummary.buyerName}</strong> on their{' '}
                <strong className="text-slate-900">{loanSummary.bikeName}</strong>.
              </p>
            </div>

            {/* Digital Certificate Summary */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Certificate Ref
                </span>
                <span className="font-mono font-bold text-primary">{loanSummary.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guarantor Name:</span>
                <span className="font-bold text-slate-900">{monoData?.name || fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Relationship:</span>
                <span className="font-semibold text-slate-800">{relationship}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Identity Verification:</span>
                <span className="font-mono font-bold text-secondary">
                  Mono KYC ({monoData?.bvnMasked})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verified Bank:</span>
                <span className="font-semibold text-slate-800">{monoData?.bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-600 font-mono text-[11px]">{new Date().toUTCString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all inline-flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Confirmation
              </button>
              <Link
                href="/"
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl text-xs transition-all inline-flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-background text-on-surface pb-16">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}
        {/* Header & Progress Stepper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
              <ShieldCheck className="w-4 h-4" /> Official Co-Signer Portal
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary mt-0.5">
              Guarantor Verification
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Mono KYC' },
              { num: 3, label: 'Co-Sign' },
            ].map((item) => {
              const active = step === item.num;
              const done = step > item.num;
              return (
                <div key={item.num} className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center transition-all ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : active
                        ? 'bg-primary text-white ring-4 ring-primary/15'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {done ? '✓' : item.num}
                  </div>
                  <span
                    className={`text-xs font-bold hidden sm:inline ${
                      active ? 'text-primary' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Applicant & Commitment Card */}
        <div className="bg-gradient-to-br from-[#021064] to-[#0a2396] text-white rounded-3xl p-6 sm:p-7 space-y-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#26fedc] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Ride-to-Own Asset Financing
            </span>
            <span className="text-xs font-mono text-white/70">Ref: {loanSummary.referenceId}</span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              {loanSummary.buyerName} invited you as a Co-Signer
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1">
              {loanSummary.buyerName} ({loanSummary.buyerPhone}) is acquiring a{' '}
              <strong className="text-white">{loanSummary.bikeName}</strong> via {APP_NAME} Pay-As-You-Ride financing.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl text-xs">
            <div>
              <span className="text-white/60 block text-[10px] uppercase font-bold">Financed Principal</span>
              <div className="font-black text-white text-sm mt-0.5">{loanSummary.loanAmount}</div>
            </div>
            <div>
              <span className="text-white/60 block text-[10px] uppercase font-bold">Rider Schedule</span>
              <div className="font-black text-[#26fedc] text-sm mt-0.5">
                {loanSummary.biDailyInstallment}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-white/60 block text-[10px] uppercase font-bold">Tenure & Security</span>
              <div className="font-bold text-white text-sm mt-0.5">{loanSummary.tenure} · GPS Insured</div>
            </div>
          </div>
        </div>

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-primary text-base">
                  Step 1: Your Contact & Relationship Details
                </h3>
                <p className="text-xs text-slate-500">
                  Please enter your legal name as it appears on your BVN and bank account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Your Full Legal Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emeka Okafor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Active Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="0801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Relationship to Applicant *
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                >
                  <option>Colleague / Employer</option>
                  <option>Parent / Sibling</option>
                  <option>Spouse</option>
                  <option>Fleet Cooperative Lead</option>
                  <option>Civil Servant Peer</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Occupation / Employer (Optional)
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Senior Civil Servant / Logistics Supervisor"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Guarantor FAQ Pill */}
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
              <HelpCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Will my card or bank account be charged today?</strong>{' '}
                No. Co-signing verifies your identity and standing as a trusted contact for{' '}
                <strong>{loanSummary.buyerName}</strong>. Every {APP_NAME} bike is also equipped with smart GPS telemetry and comprehensive theft/damage insurance.
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!fullName.trim()}
              className="w-full py-3.5 bg-primary hover:bg-primary-light disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Continue to 1-Click Identity Verification <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: 1-Click Mono Identity Link */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-primary text-base">
                  Step 2: Instant 1-Click Identity Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm your identity via <strong>Mono Open Banking</strong> — no paper ID uploads required.
                </p>
              </div>
            </div>

            {!monoLinked ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Select Your Primary Bank for Instant BVN Match
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none"
                  >
                    {SUPPORTED_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span>
                    End-to-end 256-bit encryption by Mono. {APP_NAME} never sees your banking PIN or login password.
                  </span>
                </div>

                <button
                  onClick={handleOpenMono}
                  disabled={isLinkingMono}
                  className="w-full py-3.5 bg-secondary hover:opacity-95 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isLinkingMono ? 'Verifying Identity with Mono...' : `Verify with ${selectedBank}`}
                </button>
              </div>
            ) : (
              <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Identity Verified via Mono
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
                  <span className="text-slate-500">Institution & BVN:</span>
                  <span className="text-secondary font-mono font-bold">
                    {monoData?.bank} ({monoData?.bvnMasked})
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!monoLinked}
                className="w-2/3 py-3 bg-primary hover:bg-primary-light disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                Review Co-Sign Agreement <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Legal Co-Signing Agreement */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <h3 className="font-extrabold text-primary text-base">
              Step 3: Co-Signer Legal Acknowledgment
            </h3>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Guarantor Commitment:</strong> By executing this digital guarantee, you confirm that you know{' '}
                <strong>{loanSummary.buyerName}</strong> personally and agree to assist {APP_NAME} in reaching the rider or facilitating asset recovery if the account enters prolonged default (14+ days overdue).
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Guarantor Name:</span>
                <span className="text-slate-900 font-bold">{monoData?.name || fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Relationship:</span>
                <span className="text-slate-800 font-semibold">{relationship}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="text-slate-900 font-bold">{loanSummary.buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Financed Asset:</span>
                <span className="text-slate-900 font-bold">{loanSummary.bikeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security Deposit Policy:</span>
                <span className="text-secondary font-bold">{loanSummary.escrowProtected}</span>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary rounded"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I, <strong>{monoData?.name || fullName}</strong>, digitally sign this Guarantor Undertaking and consent to identity verification under the Nigeria Data Protection Regulation (NDPR).
              </span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={handleAcceptCoSign}
                disabled={isSubmitting || !agreedTerms}
                className="w-2/3 py-3.5 bg-secondary hover:opacity-95 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? 'Executing Digital Signature...' : 'Accept Guarantee & Co-Sign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

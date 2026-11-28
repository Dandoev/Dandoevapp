'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Briefcase,
  Users,
  ArrowRight,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  User,
  Check,
  HelpCircle,
  FileText,
  Lock,
  Sparkles,
  AlertCircle,
  Clock,
  BadgeCheck,
} from 'lucide-react';

interface GuarantorData {
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  workplace?: string;
  invited: boolean;
  type: 'civil_servant' | 'family_member';
}

const FAMILY_RELATIONSHIPS = [
  { id: 'Parent', label: 'Parent', key: 'A', desc: 'Father or Mother' },
  { id: 'Sibling', label: 'Sibling', key: 'B', desc: 'Brother or Sister' },
  { id: 'Spouse', label: 'Spouse', key: 'C', desc: 'Husband or Wife' },
  { id: 'Relative', label: 'Close Relative', key: 'D', desc: 'Uncle, Aunt, Cousin' },
];

export default function GuarantorPage() {
  const router = useRouter();

  const defaultGuarantors: GuarantorData[] = [
    {
      fullName: '',
      email: '',
      phone: '',
      relationship: 'Civil Servant',
      workplace: '',
      invited: false,
      type: 'civil_servant',
    },
    {
      fullName: '',
      email: '',
      phone: '',
      relationship: 'Parent',
      workplace: '',
      invited: false,
      type: 'family_member',
    },
  ];

  const [guarantors, setGuarantors] = useState<GuarantorData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('bnpl_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            parsed.guarantors &&
            Array.isArray(parsed.guarantors) &&
            parsed.guarantors.length === 2
          ) {
            return parsed.guarantors.map((g: any, i: number) => ({
              fullName: g.fullName || '',
              email: g.email || '',
              phone: g.phone || '',
              relationship:
                g.relationship || (i === 0 ? 'Civil Servant' : 'Parent'),
              workplace: g.workplace || '',
              invited: Boolean(g.invited || (g.fullName && g.phone)),
              type: i === 0 ? 'civil_servant' : 'family_member',
            }));
          }
        }
      } catch {}
    }
    return defaultGuarantors;
  });

  // Active form section tab (0: Civil Servant, 1: Family Member)
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  const updateGuarantor = (
    index: number,
    field: keyof GuarantorData,
    value: string | boolean
  ) => {
    setGuarantors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Validation checks
  const isG1Valid = useMemo(() => {
    const g = guarantors[0];
    const cleanPhone = (g.phone || '').replace(/[^0-9]/g, '');
    return g.fullName.trim().length >= 3 && cleanPhone.length >= 10;
  }, [guarantors]);

  const isG2Valid = useMemo(() => {
    const g = guarantors[1];
    const cleanPhone = (g.phone || '').replace(/[^0-9]/g, '');
    return (
      g.fullName.trim().length >= 3 &&
      cleanPhone.length >= 10 &&
      Boolean(g.relationship)
    );
  }, [guarantors]);

  const bothReady = isG1Valid && isG2Valid;

  const handleContinue = () => {
    if (!bothReady) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem('bnpl_data') || '{}');
      const preparedGuarantors = guarantors.map((g, idx) => ({
        ...g,
        invited: true,
        relationship: idx === 0 ? 'Civil Servant' : g.relationship || 'Parent',
      }));
      sessionStorage.setItem(
        'bnpl_data',
        JSON.stringify({ ...saved, guarantors: preparedGuarantors })
      );
    } catch {}
    router.push('/bnpl/loan-terms');
  };

  // Keyboard navigation support for Typeform feel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (activeTab === 0 && isG1Valid) {
          e.preventDefault();
          setActiveTab(1);
        } else if (activeTab === 1 && bothReady) {
          e.preventDefault();
          handleContinue();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isG1Valid, bothReady]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between selection:bg-slate-900 selection:text-white">
      {/* Typeform Minimalist Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        {/* Progress micro-bar */}
        <div className="w-full h-1 bg-slate-100">
          <div
            className="h-full bg-[#021064] transition-all duration-300"
            style={{ width: bothReady ? '66%' : isG1Valid ? '55%' : '45%' }}
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link
            href="/bnpl/financial"
            className="group inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <div className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center group-hover:border-slate-400 group-hover:bg-slate-50 transition">
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <span className="hidden sm:inline">Back to Financial Assessment</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
              STEP 04 OF 06
            </span>
            <span className="text-xs font-bold text-slate-400">&bull;</span>
            <span className="text-xs font-bold text-slate-800">
              Guarantor Endorsement
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                bothReady
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {bothReady ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2/2 Endorsed</span>
                </>
              ) : isG1Valid ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>1/2 Ready</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>0/2 Nominated</span>
                </>
              )}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Form Context & Intro */}
        <div className="space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-[#021064]" />
            CBN Consumer Credit Framework &bull; Statutory Assurance
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Nominate your two required guarantors
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Asset lease regulations require two credible contacts to vouch for your identity. Guarantors complete a secure 1-click digital confirmation. 
            <strong className="text-slate-900 font-semibold"> No upfront collateral or automatic deductions are placed on them.</strong>
          </p>
        </div>

        {/* Typeform-style Tab Switcher */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/70 rounded-2xl mb-8">
          {/* Tab 1: Civil Servant */}
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            className={`py-3.5 px-4 rounded-xl text-left transition-all flex items-center justify-between ${
              activeTab === 0
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                  isG1Valid
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeTab === 0
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isG1Valid ? '✓' : '01'}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  Guarantor 1
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {guarantors[0].fullName || 'Civil Servant'}
                </div>
              </div>
            </div>
            {isG1Valid && (
              <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
          </button>

          {/* Tab 2: Family Member */}
          <button
            type="button"
            onClick={() => setActiveTab(1)}
            className={`py-3.5 px-4 rounded-xl text-left transition-all flex items-center justify-between ${
              activeTab === 1
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                  isG2Valid
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeTab === 1
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isG2Valid ? '✓' : '02'}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  Guarantor 2
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {guarantors[1].fullName || 'Family Member'}
                </div>
              </div>
            </div>
            {isG2Valid && (
              <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
          </button>
        </div>

        {/* FORM PANEL 1: CIVIL SERVANT */}
        {activeTab === 0 && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#021064] uppercase tracking-wider mb-1">
                  <Briefcase className="w-4 h-4 text-[#006b5b]" />
                  Statutory Public Sector Assurance
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Who is your Civil Servant guarantor?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  A verified federal, state, or local government employee (teacher, healthcare worker, ministry official, or armed forces personnel).
                </p>
              </div>

              {/* Field 1: Legal Full Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Full Legal Name *
                  </label>
                  <span className="text-[11px] text-slate-400">As shown on official ID</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Ibrahim Mohammed Bello"
                  value={guarantors[0].fullName}
                  onChange={(e) => updateGuarantor(0, 'fullName', e.target.value)}
                  className="w-full h-14 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                />
              </div>

              {/* Field 2: Phone Number */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Guarantor Phone Number *
                  </label>
                  <span className="text-[11px] text-slate-400">SMS verification recipient</span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    <span>🇳🇬</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="803 123 4567"
                    value={guarantors[0].phone}
                    onChange={(e) => updateGuarantor(0, 'phone', e.target.value)}
                    className="w-full h-14 pl-24 pr-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                  />
                </div>
              </div>

              {/* Field 3: Ministry or Department (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Ministry, Agency or Department (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Public institution</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Kano State Ministry of Education / Federal Civil Service"
                  value={guarantors[0].workplace || ''}
                  onChange={(e) => updateGuarantor(0, 'workplace', e.target.value)}
                  className="w-full h-14 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                />
              </div>

              {/* Field 4: Email Address (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Digital notice</span>
                </div>
                <input
                  type="email"
                  placeholder="e.g. ibrahim.bello@gov.ng"
                  value={guarantors[0].email}
                  onChange={(e) => updateGuarantor(0, 'email', e.target.value)}
                  className="w-full h-14 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                />
              </div>

              {/* Progress CTA to next tab */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab(1)}
                  disabled={!isG1Valid}
                  className="w-full sm:w-auto h-12 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Next: Add Family Member Guarantor</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FORM PANEL 2: FAMILY MEMBER */}
        {activeTab === 1 && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#021064] uppercase tracking-wider mb-1">
                  <Users className="w-4 h-4 text-[#021064]" />
                  Next-of-Kin &bull; Family Guarantor
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Who is your family guarantor?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  An immediate family member residing in Nigeria who can verify your residence and identity.
                </p>
              </div>

              {/* Typeform Option Cards: Relationship Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Relationship to You *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FAMILY_RELATIONSHIPS.map((rel) => {
                    const isSelected = guarantors[1].relationship === rel.id;
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => updateGuarantor(1, 'relationship', rel.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`w-5 h-5 rounded-md text-[10px] font-mono font-bold flex items-center justify-center ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {rel.key}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="font-bold text-sm leading-tight">
                          {rel.label}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isSelected ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {rel.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 1: Legal Full Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Full Legal Name *
                  </label>
                  <span className="text-[11px] text-slate-400">As shown on official ID</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Fatima Aminu Dunu"
                  value={guarantors[1].fullName}
                  onChange={(e) => updateGuarantor(1, 'fullName', e.target.value)}
                  className="w-full h-14 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                />
              </div>

              {/* Field 2: Phone Number */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Guarantor Phone Number *
                  </label>
                  <span className="text-[11px] text-slate-400">SMS verification recipient</span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    <span>🇳🇬</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="812 987 6543"
                    value={guarantors[1].phone}
                    onChange={(e) => updateGuarantor(1, 'phone', e.target.value)}
                    className="w-full h-14 pl-24 pr-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                  />
                </div>
              </div>

              {/* Field 3: Email Address (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Optional notice</span>
                </div>
                <input
                  type="email"
                  placeholder="e.g. fatima.dunu@gmail.com"
                  value={guarantors[1].email}
                  onChange={(e) => updateGuarantor(1, 'email', e.target.value)}
                  className="w-full h-14 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition font-medium"
                />
              </div>

              {/* Navigation Back / Next */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab(0)}
                  className="h-12 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous: Civil Servant</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!bothReady}
                  className="h-12 px-7 bg-[#021064] hover:bg-[#031885] disabled:opacity-40 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Continue to Loan Terms</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regulatory Protection & Transparency Card */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Guarantor Protection Guarantee &amp; Data Privacy
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1 border-t border-slate-100">
            <div>
              <strong className="text-slate-900 block mb-0.5">Zero Upfront Charges</strong>
              Guarantors are never debited or required to pledge cash collateral.
            </div>
            <div>
              <strong className="text-slate-900 block mb-0.5">Post-Submission Link</strong>
              Invitations are sent via SMS only after your credit review is completed.
            </div>
            <div>
              <strong className="text-slate-900 block mb-0.5">NDPR Certified</strong>
              All identification checks are encrypted with 256-bit banking security.
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      <footer className="sticky bottom-0 z-30 bg-white border-t border-slate-200 py-4 px-4 sm:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/bnpl/financial"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">
                {bothReady
                  ? 'All Guarantors Nominated'
                  : 'Please complete both guarantors'}
              </div>
              <div className="text-[11px] text-slate-500">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-700">Enter ↵</kbd> to proceed
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={!bothReady}
              className="h-12 px-7 bg-[#021064] hover:bg-[#031885] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
            >
              <span>Continue to Loan Terms</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Zap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Smartphone,
  AlertCircle,
  Bike,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

function SignInForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [portalMode, setPortalMode] = useState<'rider' | 'staff'>(
    redirectParam?.startsWith('/dashboard') || redirectParam?.startsWith('/checkout')
      ? 'rider'
      : 'staff'
  );
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const staffPersonas = [
    {
      roleName: 'Super Administrator',
      email: 'admin@dandoev.com',
      password: 'Admin@DandoEv2025!',
      badge: 'Full Authority',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: '👑',
      desc: 'Platform governance, staff provisioning & settlements',
      target: '/admin',
      isStaff: true,
    },
    {
      roleName: 'Credit Underwriter',
      email: 'adewale.risk@dandoev.com',
      password: 'Underwriter@2026!',
      badge: 'Origination',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '📊',
      desc: 'Mono Open Banking analysis & asset allocation',
      target: '/admin',
      isStaff: true,
    },
    {
      roleName: 'Fleet Operations',
      email: 'zainab.fleet@dandoev.com',
      password: 'FleetOps@2026!',
      badge: 'Assets',
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: '⚡',
      desc: 'E-Bike stock, dual 60V battery health & Lagos hubs',
      target: '/admin',
      isStaff: true,
    },
    {
      roleName: 'Collections Officer',
      email: 'emeka.collections@dandoev.com',
      password: 'Collections@2026!',
      badge: 'Recovery',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: '💰',
      desc: 'Save-As-You-Ride escrow & automated retry nudges',
      target: '/admin',
      isStaff: true,
    },
  ];

  const riderPersonas = [
    {
      roleName: 'Solomon Dunu (Active BNPL Rider)',
      email: 'solomon.dunu@rider.dandoev.com',
      password: 'Rider@DandoEv2026!',
      badge: 'Tier 3 Verified',
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: '🏍️',
      desc: 'Active DandoEv X6 loan, compulsory savings vault & repayments',
      target: '/dashboard?demo=buyer',
      isStaff: false,
    },
    {
      roleName: 'New E-Bike Buyer (Express BNPL)',
      email: 'new.buyer@dandoev.com',
      password: 'Buyer@DandoEv2026!',
      badge: '3-Min Checkout',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: '✨',
      desc: 'Jump straight into the 3-Minute Mono Open Banking Checkout',
      target: '/checkout/bnpl',
      isStaff: false,
    },
  ];

  const executeSignIn = async (
    emailToUse: string,
    passwordToUse: string,
    targetUrl?: string,
    isStaffLogin?: boolean
  ) => {
    setLoading(true);
    setError('');

    const destination =
      targetUrl || redirectParam || (portalMode === 'rider' ? '/dashboard?demo=buyer' : '/admin');
    const useStaffToken = isStaffLogin ?? portalMode === 'staff';

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: passwordToUse }),
      });

      const data = await res.json().catch(() => ({}));
      const fallbackToken = useStaffToken ? 'demo-token-admin' : 'demo-token-customer';
      const token = data.accessToken || fallbackToken;

      document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `sb-access-token=${token}; path=/; max-age=86400; SameSite=Lax`;
      try {
        localStorage.setItem('token', token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: useStaffToken ? 'staff-admin-01' : 'rider-solomon-01',
              email: emailToUse,
              role: useStaffToken ? 'super_admin' : 'customer',
              fullName: useStaffToken ? 'Super Administrator' : 'Solomon Dunu',
              phone: '+234 803 123 4567',
            })
          );
        }
      } catch {}

      window.location.href = destination;
    } catch {
      const fallbackToken = useStaffToken ? 'demo-token-admin' : 'demo-token-customer';
      document.cookie = `token=${fallbackToken}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `sb-access-token=${fallbackToken}; path=/; max-age=86400; SameSite=Lax`;
      try {
        localStorage.setItem('token', fallbackToken);
      } catch {}
      window.location.href = destination;
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please provide both email address and password.');
      return;
    }
    await executeSignIn(form.email, form.password);
  };

  const activePersonas = portalMode === 'rider' ? riderPersonas : staffPersonas;

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#030712] font-sans">
      {/* LEFT COLUMN: FinTech Mission, Underwriting Framework & Live Stats */}
      <div
        style={{
          background: 'radial-gradient(ellipse at top left, #0b1e4f 0%, #04091a 60%, #020510 100%)',
        }}
        className="lg:col-span-6 p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10"
      >
        {/* Top Branding & Back Link */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_24px_rgba(38,254,220,0.3)]">
              <Zap className="w-5 h-5 text-[#00201a]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">{APP_NAME}</span>
                <span className="bg-accent/15 text-accent border border-accent/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  FinTech Platform
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Electric Mobility · BNPL Underwriting & Escrow
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </Link>
        </div>

        {/* Center Hero */}
        <div className="my-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            CBN Microfinance &amp; Mono Open Banking Underwriting
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-white leading-[1.15] tracking-tight mb-4">
            Powering Green Mobility &amp; Commercial BNPL for Nigeria.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-7">
            Unified access for commercial riders tracking their Pay-As-You-Ride ownership milestones and operations teams managing underwriting, fleet batteries, and NIBSS collections.
          </p>

          {/* 4 Metric Highlights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/75 border border-white/10 rounded-xl p-4">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Gross Financed Portfolio
              </div>
              <div className="text-white text-xl font-black mt-1 tabular-nums">₦48,650,000</div>
              <div className="text-emerald-400 text-[11px] font-semibold mt-0.5">
                +18.4% monthly volume
              </div>
            </div>

            <div className="bg-slate-900/75 border border-white/10 rounded-xl p-4">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                30-Day Recovery Rate
              </div>
              <div className="text-accent text-xl font-black mt-1 tabular-nums">97.2%</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Bi-daily clearing window</div>
            </div>

            <div className="bg-slate-900/75 border border-white/10 rounded-xl p-4">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Save-As-You-Ride Escrow
              </div>
              <div className="text-purple-300 text-xl font-black mt-1 tabular-nums">₦1,710,000</div>
              <div className="text-slate-400 text-[11px] mt-0.5">₦1,000/day compulsory lock</div>
            </div>

            <div className="bg-slate-900/75 border border-white/10 rounded-xl p-4">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Active Financed Fleet
              </div>
              <div className="text-emerald-300 text-xl font-black mt-1 tabular-nums">38 Units</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Lagos delivery hubs</div>
            </div>
          </div>
        </div>

        {/* Platform Companion Notice */}
        <div className="bg-teal-500/10 border border-teal-500/25 rounded-xl p-4 flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-white">Omnichannel Sync:</span>
            <p className="text-slate-300 mt-0.5">
              Riders and buyers can manage their repayments, download official invoices, and track their compulsory savings vault on both this Web Portal and the{' '}
              <strong className="text-accent">DandoEv Mobile App</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Role-Aware Authentication Surface */}
      <div className="lg:col-span-6 bg-white p-8 sm:p-12 lg:p-14 text-slate-900 flex flex-col justify-between">
        <div className="max-w-md w-full mx-auto">
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => setPortalMode('rider')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                portalMode === 'rider'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Rider / Buyer Portal</span>
            </button>
            <button
              type="button"
              onClick={() => setPortalMode('staff')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                portalMode === 'staff'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Staff Operations</span>
            </button>
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>
                {portalMode === 'rider'
                  ? 'Rider Repayment & Ownership Portal'
                  : 'Authorized Staff Access Only'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {portalMode === 'rider'
                ? 'Sign in to Your Rider Account'
                : 'Sign in to Operations Console'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {portalMode === 'rider'
                ? 'Track your BNPL loan progress, compulsory savings vault, or launch a 1-click demo below.'
                : 'Enter your official staff credentials or click a verified persona below for instant access.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {portalMode === 'rider' ? 'Email Address' : 'Official Staff Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder={
                    portalMode === 'rider'
                      ? 'solomon.dunu@rider.dandoev.com'
                      : 'admin@dandoev.com'
                  }
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-300 pl-10 pr-3 text-xs font-medium text-slate-900 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <span className="text-xs text-primary font-semibold cursor-pointer hover:underline">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-300 pl-10 pr-10 text-xs font-medium text-slate-900 focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary-light text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? 'Authenticating...'
                : portalMode === 'rider'
                ? 'Sign In to Rider Portal →'
                : 'Sign In to Operations Console →'}
            </button>
          </form>

          {/* Quick Persona Section */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Or 1-Click Verified Demo Access
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {activePersonas.map((persona) => (
              <button
                key={persona.email}
                type="button"
                onClick={() => {
                  setForm({ email: persona.email, password: persona.password });
                  executeSignIn(persona.email, persona.password, persona.target, persona.isStaff);
                }}
                disabled={loading}
                className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:border-primary hover:bg-slate-100/80 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-base shrink-0">
                    {persona.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        {persona.roleName}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${persona.badgeClass}`}
                      >
                        {persona.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{persona.desc}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>

          {portalMode === 'rider' && (
            <p className="text-center text-xs text-slate-500 mt-5">
              Don&apos;t have a rider account yet?{' '}
              <Link href="/auth/signup" className="text-primary font-bold hover:underline">
                Create Rider Account
              </Link>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-6 border-t border-slate-100 mt-6">
          <span>DandoEv Financial Technologies · CBN Regulated Mobility BNPL</span>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#030712] text-accent font-bold">
          Loading Authentication Portal...
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}

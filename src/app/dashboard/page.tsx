'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { formatNaira, formatDate } from '@/lib/utils';
import {
  Wallet,
  Calendar,
  CheckCircle,
  Bike,
  ClipboardList,
  Settings,
  Zap,
  Loader2,
  PiggyBank,
  FileText,
  ArrowRight,
  CreditCard,
  ShieldCheck,
  Sparkles,
  X,
  CheckCircle2,
  Bell,
  MapPin,
  BatteryCharging,
  Wrench,
} from 'lucide-react';

const SWAP_HUBS = [
  {
    id: 'ikeja-central',
    city: 'Lagos',
    name: 'Ikeja Central Swap & Service Hub',
    address: '14 Allen Avenue, Ikeja, Lagos',
    hours: '6:00 AM – 10:00 PM Daily',
    charged60v: 18,
    charged72v: 12,
    waitMins: 3,
  },
  {
    id: 'lekki-phase1',
    city: 'Lagos',
    name: 'Lekki Admiralty Express Hub',
    address: 'Plot 8B Admiralty Way, Lekki Phase 1, Lagos',
    hours: '24/7 Automated Cabinet + Tech Support',
    charged60v: 24,
    charged72v: 9,
    waitMins: 2,
  },
  {
    id: 'yaba-tech',
    city: 'Lagos',
    name: 'Yaba Dispatch Corridor Station',
    address: '292 Herbert Macaulay Way, Sabo Yaba, Lagos',
    hours: '6:00 AM – 11:00 PM Daily',
    charged60v: 15,
    charged72v: 11,
    waitMins: 4,
  },
  {
    id: 'wuse-abuja',
    city: 'Abuja',
    name: 'Wuse II Logistics & Swap Center',
    address: '42 Aminu Kano Crescent, Wuse II, Abuja',
    hours: '7:00 AM – 9:00 PM Daily',
    charged60v: 14,
    charged72v: 8,
    waitMins: 2,
  },
  {
    id: 'ringroad-ibadan',
    city: 'Ibadan',
    name: 'Ring Road Rider Service Hub',
    address: '19 MKO Abiola Way, Ring Road, Ibadan',
    hours: '7:00 AM – 8:00 PM Mon–Sat',
    charged60v: 10,
    charged72v: 6,
    waitMins: 3,
  },
];

export default function CustomerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [swapHubModalOpen, setSwapHubModalOpen] = useState(false);
  const [hubCityFilter, setHubCityFilter] = useState<'All' | 'Lagos' | 'Abuja' | 'Ibadan'>('All');
  const [isPaying, setIsPaying] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        let token =
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('token='))
            ?.split('=')[1] ||
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('sb-access-token='))
            ?.split('=')[1];

        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get('demo') === 'buyer' || !token) {
            token = 'demo-token-customer';
            document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `sb-access-token=${token}; path=/; max-age=86400; SameSite=Lax`;
            try {
              localStorage.setItem('token', token);
            } catch {}
          }
        }

        if (!token) {
          window.location.href = '/auth/signin?redirect=/dashboard';
          return;
        }

        const res = await fetch('/api/user/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          window.location.href = '/auth/signin?redirect=/dashboard';
          return;
        }

        const json = await res.json();
        if (json.success) {
          setData(json);
        } else {
          setError('Failed to load dashboard data');
        }
      } catch {
        setError('Network error loading dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-md mx-auto text-center py-20 px-6">
          <p className="text-lg font-bold text-slate-800 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { profile, loan, notifications } = data;
  const activeLoan = loan;
  const nextPayment = activeLoan?.nextPayment;
  const bikeCount = activeLoan ? '1 Unit' : '0 Units';

  const handleInstantPay = () => {
    if (!activeLoan || !nextPayment) return;
    setIsPaying(true);
    setTimeout(() => {
      const paidAmt = Number(nextPayment.amount || 14500);
      const newAmountPaid = Math.min(
        activeLoan.totalRepayable,
        Number(activeLoan.amountPaid || 0) + paidAmt
      );
      const newProgress = Math.min(100, (newAmountPaid / activeLoan.totalRepayable) * 100);

      setData((prev: any) => ({
        ...prev,
        profile: {
          ...prev.profile,
          wallet: {
            ...prev.profile.wallet,
            lockedSaving: Number(prev.profile?.wallet?.lockedSaving || 0) + 2000,
          },
        },
        loan: {
          ...prev.loan,
          amountPaid: newAmountPaid,
          progress: newProgress,
        },
      }));
      setIsPaying(false);
      setPayModalOpen(false);
      setToastMsg(
        `Installment of ${formatNaira(paidAmt)} settled! +₦2,000 added to your Compulsory Savings Vault.`
      );
      setTimeout(() => setToastMsg(null), 5000);
    }, 1000);
  };

  const progressPct = activeLoan ? Math.min(100, Math.max(0, Number(activeLoan.progress || 0))) : 0;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-24">
      <Navbar
        rightSlot={
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>KYC Verified Rider</span>
          </div>
        }
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 max-w-md bg-primary text-white px-5 py-4 rounded-2xl shadow-2xl border border-accent/30 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
          <span className="text-xs font-bold leading-snug">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-white/60 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Greeting Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-accent flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {profile.name?.split(' ')[0]?.[0]}
              {profile.name?.split(' ')[1]?.[0] || ''}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rider Ownership & Escrow Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary mt-0.5">
                Welcome back, {profile.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Track your Pay-As-You-Ride bike equity, scheduled installments, and compulsory savings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {nextPayment && (
              <button
                onClick={() => setPayModalOpen(true)}
                className="px-5 py-3 rounded-xl bg-accent text-primary-dark font-extrabold text-xs hover:brightness-95 transition-all shadow-sm flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Next Installment ({formatNaira(nextPayment.amount)})</span>
              </button>
            )}
            <Link
              href="/dashboard/repayments"
              className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all"
            >
              Full Ledger →
            </Link>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <Wallet size={20} />,
              label: 'Total Financed Obligation',
              value: activeLoan ? formatNaira(activeLoan.totalRepayable) : 'None',
              sub: activeLoan ? `${formatNaira(activeLoan.amountPaid)} settled` : 'No active plan',
              color: 'bg-primary/10 text-primary',
            },
            {
              icon: <Calendar size={20} />,
              label: 'Next Installment Due',
              value: nextPayment ? formatNaira(nextPayment.amount) : 'All Clear',
              sub: nextPayment ? `Due ${formatDate(nextPayment.dueDate)}` : 'Up to date',
              color: 'bg-amber-500/15 text-amber-700',
            },
            {
              icon: <PiggyBank size={20} />,
              label: 'Compulsory Savings Vault',
              value: formatNaira(profile.wallet?.lockedSaving || 0),
              sub: '₦1,000/day returnable escrow',
              color: 'bg-teal-500/15 text-secondary',
            },
            {
              icon: <Bike size={20} />,
              label: 'Ownership Equity',
              value: activeLoan ? `${progressPct.toFixed(0)}%` : '0%',
              sub: `${bikeCount} in fleet`,
              color: 'bg-emerald-500/15 text-emerald-700',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">{s.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  {s.icon}
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-primary tabular-nums">
                  {s.value}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Active Loan & Ownership Milestone Timeline */}
          <div className="lg:col-span-8 space-y-6">
            {activeLoan ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-low border border-slate-200 p-2 flex items-center justify-center shrink-0">
                      <img
                        src={activeLoan.bikeImage || '/bikes/DandoEV_X6.jpg'}
                        alt={activeLoan.bikeName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-success">Active BNPL Plan</span>
                        <span className="text-xs font-mono text-slate-400">
                          #{activeLoan.loanId?.slice(0, 8)}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-primary mt-1">
                        {activeLoan.bikeName}
                      </h2>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/invoice?loanId=${activeLoan.loanId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-primary text-xs font-bold text-primary transition-all"
                  >
                    <FileText size={15} />
                    <span>Official Invoice & Chassis Serials</span>
                  </Link>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-bold text-slate-600">
                      Repayment & Ownership Transfer Progress
                    </span>
                    <span className="text-sm font-black text-secondary tabular-nums">
                      {progressPct.toFixed(1)}% Complete
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className="h-full bg-linear-to-r from-primary to-secondary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, progressPct)}%` }}
                    />
                  </div>
                </div>

                {/* Ownership Milestone Stepper */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Ride-to-Own Milestones
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { pct: 0, title: 'Hub Dispatch', desc: 'Chassis & 60V Battery Issued' },
                      { pct: 25, title: '25% Equity', desc: 'Tier 2 Credit Boost' },
                      { pct: 50, title: '50% Mid-Term', desc: 'Free Hub Maintenance Check' },
                      { pct: 100, title: '100% Ownership', desc: 'Title Transfer + Escrow Unlock' },
                    ].map((m) => {
                      const reached = progressPct >= m.pct;
                      return (
                        <div
                          key={m.title}
                          className={`p-3 rounded-xl border text-xs ${
                            reached
                              ? 'bg-teal-50/70 border-teal-200 text-primary'
                              : 'bg-white border-slate-200/70 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-extrabold">
                            <CheckCircle2
                              size={14}
                              className={reached ? 'text-secondary' : 'text-slate-300'}
                            />
                            <span>{m.title}</span>
                          </div>
                          <div className="text-[10px] mt-1 opacity-80">{m.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Paid vs Remaining */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                    <div className="text-xs font-bold text-emerald-800">Total Principal & Fees Paid</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
                      {formatNaira(activeLoan.amountPaid)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="text-xs font-bold text-slate-500">Remaining Balance</div>
                    <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                      {formatNaira(Math.max(0, activeLoan.totalRepayable - activeLoan.amountPaid))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-primary flex items-center justify-center mx-auto">
                  <Bike size={32} />
                </div>
                <h3 className="text-xl font-bold text-primary">No Active E-Bike Financing</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Start earning more today by financing a zero-emission DandoEv electric bike in under 3 minutes.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Link href="/bikes" className="btn btn-primary btn-sm">
                    Browse Marketplace
                  </Link>
                  <Link href="/checkout/bnpl" className="btn btn-outline btn-sm">
                    3-Min BNPL Checkout
                  </Link>
                </div>
              </div>
            )}

            {/* Notifications Feed */}
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-extrabold text-primary text-base flex items-center gap-2">
                  <Bell size={18} className="text-secondary" />
                  <span>Account & Payment Activity</span>
                </h2>
                <span className="text-xs font-semibold text-slate-400">
                  {notifications?.length || 0} alerts
                </span>
              </div>
              <div className="p-6">
                {notifications?.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                            n.read ? 'bg-slate-300' : 'bg-secondary'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-xs text-slate-900">{n.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {n.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs py-6">
                    No new notifications right now.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Next Payment, Compulsory Savings Vault & Quick Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Next Payment Due Card */}
            {nextPayment && (
              <div className="p-6 rounded-3xl bg-primary text-white shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/15 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">
                    Next Scheduled Installment
                  </span>
                  <Calendar size={18} className="text-accent" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white tabular-nums">
                    {formatNaira(nextPayment.amount)}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Due Date: <strong>{formatDate(nextPayment.dueDate)}</strong>
                  </div>
                </div>
                <button
                  onClick={() => setPayModalOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-accent hover:brightness-95 text-primary-dark font-black text-xs transition-all shadow-md"
                >
                  Pay Installment Now →
                </button>
              </div>
            )}

            {/* Compulsory Savings Vault Card */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg relative overflow-hidden space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-300">
                  Save-As-You-Ride Vault
                </span>
                <PiggyBank size={20} className="text-accent" />
              </div>

              <div>
                <div className="text-xs text-slate-400">Locked Compulsory Escrow Balance</div>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">
                  {formatNaira(profile.wallet?.lockedSaving || 0)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                <Zap size={15} className="text-accent shrink-0" />
                <span>
                  100% yours! Automatically accrues <strong>₦1,000/day</strong> and unlocks upon loan completion.
                </span>
              </div>

              <Link
                href="/dashboard/repayments"
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs text-center block transition-all"
              >
                Manage Savings & Withdrawal →
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-primary text-xs uppercase tracking-wider">
                Quick Rider Actions
              </h3>
              <div className="space-y-2">
                {[
                  {
                    icon: <Wallet size={17} />,
                    label: 'Repayment & Savings Portal',
                    href: '/dashboard/repayments',
                  },
                  {
                    icon: <FileText size={17} />,
                    label: 'Official Invoice & Serials',
                    href: activeLoan
                      ? `/dashboard/invoice?loanId=${activeLoan.loanId}`
                      : '/dashboard/repayments',
                  },
                  {
                    icon: <Settings size={17} />,
                    label: 'Security, 2FA & NDPR Privacy',
                    href: '/dashboard/security',
                  },
                  {
                    icon: <ClipboardList size={17} />,
                    label: '3-Min BNPL Calculator',
                    href: '/checkout/bnpl',
                  },
                  {
                    icon: <Bike size={17} />,
                    label: 'Browse E-Bike Marketplace',
                    href: '/bikes',
                  },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-100 hover:border-teal-200 text-xs font-bold text-slate-800 transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-primary group-hover:text-secondary">{a.icon}</span>
                      <span>{a.label}</span>
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                    />
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => setSwapHubModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200 text-xs font-extrabold text-primary transition-all group"
                >
                  <span className="flex items-center gap-2.5">
                    <BatteryCharging size={17} className="text-secondary" />
                    <span>Battery Swap & Service Hubs (Live)</span>
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-secondary group-hover:translate-x-0.5 transition-all"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Payment Modal */}
      {payModalOpen && nextPayment && (
        <div className="modal-overlay" onClick={() => setPayModalOpen(false)}>
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary">
                  Instant Repayment Settlement
                </span>
                <h3 className="text-xl font-black text-primary">Settle Scheduled Installment</h3>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Installment Amount:</span>
                <span className="font-black text-primary text-base tabular-nums">
                  {formatNaira(nextPayment.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Includes Compulsory Savings:</span>
                <span className="font-bold text-secondary">+₦2,000 (Locked to Your Vault)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-bold text-slate-800">Mono DirectPay / Active Mandate</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPayModalOpen(false)}
                className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleInstantPay}
                disabled={isPaying}
                className="w-2/3 py-3.5 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                {isPaying ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} className="text-accent" />
                    <span>Confirm & Pay {formatNaira(nextPayment.amount)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service & Battery Swap Hub Locator Modal */}
      {swapHubModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSwapHubModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-secondary">
                  <BatteryCharging className="w-4 h-4" /> Real-Time Telemetry Network
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-primary mt-0.5">
                  DandoEv Battery Swap & Service Hubs
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reserve a 100%-charged 60V/72V lithium pack or book free preventive maintenance.
                </p>
              </div>
              <button
                onClick={() => setSwapHubModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(['All', 'Lagos', 'Abuja', 'Ibadan'] as const).map((city) => (
                <button
                  key={city}
                  onClick={() => setHubCityFilter(city)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    hubCityFilter === city
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {city === 'All' ? 'All Cities (5 Hubs)' : city}
                </button>
              ))}
            </div>

            {/* Hub Cards */}
            <div className="space-y-3">
              {SWAP_HUBS.filter(
                (h) => hubCityFilter === 'All' || h.city === hubCityFilter
              ).map((hub) => (
                <div
                  key={hub.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-extrabold text-[10px] uppercase">
                        {hub.city}
                      </span>
                      <span className="text-sm font-black text-primary">{hub.name}</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin size={13} className="text-secondary shrink-0" />
                      <span>{hub.address}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{hub.hours}</div>

                    <div className="flex flex-wrap items-center gap-2 pt-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                        ⚡ {hub.charged60v}× 60V Ready
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-secondary text-[11px] font-bold">
                        🔋 {hub.charged72v}× 72V Ready
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        ~{hub.waitMins} min swap time
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSwapHubModalOpen(false);
                        setToastMsg(
                          `Charged battery slot reserved at ${hub.name} for the next 45 minutes!`
                        );
                        setTimeout(() => setToastMsg(null), 5000);
                      }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs transition-all"
                    >
                      Reserve Swap
                    </button>
                    <button
                      onClick={() => {
                        setSwapHubModalOpen(false);
                        setToastMsg(
                          `Preventive maintenance check booked at ${hub.name}. Confirmation SMS sent.`
                        );
                        setTimeout(() => setToastMsg(null), 5000);
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs inline-flex items-center justify-center gap-1"
                    >
                      <Wrench size={12} /> Book Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

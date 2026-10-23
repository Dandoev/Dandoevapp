'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { formatNaira, calculateInstallment } from '@/lib/utils';
import { BNPL_CONFIG, APP_NAME } from '@/lib/constants';
import {
  ShieldCheck,
  Bike,
  Zap,
  Battery,
  Gauge,
  Truck,
  Search,
  ArrowRight,
  Headphones,
  Leaf,
  ChevronRight,
  ClipboardList,
  Globe,
  Mail,
  Flame,
  PiggyBank,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const [bikes, setBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadenceView, setCadenceView] = useState<'daily' | 'bidaily' | 'monthly'>('monthly');
  const [dailyFuelSpend, setDailyFuelSpend] = useState<number>(6500);
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState<number>(26);

  useEffect(() => {
    fetch('/api/bikes')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && Array.isArray(resData.data)) {
          setBikes(resData.data);
        }
      })
      .catch((err) => console.error('Failed to fetch bikes', err))
      .finally(() => setLoading(false));
  }, []);

  // Selection of real bikes that represent the brand
  const featuredBikes = bikes.slice(0, 3);

  // Calculate cheapest EMI for the Hero section
  const cheapestBike = bikes.reduce(
    (min, bike) => (Number(bike.price) < Number(min.price) ? bike : min),
    bikes[0] || null
  );
  const heroInstallmentObj = cheapestBike
    ? calculateInstallment(
        Number(cheapestBike.price),
        BNPL_CONFIG.interestRate,
        BNPL_CONFIG.defaultTenure
      )
    : { installmentAmount: 5500, totalSavings: 360000 };

  const heroBiDaily = heroInstallmentObj.installmentAmount;
  const heroDaily = Math.round(heroBiDaily / 2);
  const heroMonthly = Math.round(heroBiDaily * 15);

  // Fuel vs. EV ROI Calculator Math
  const monthlyFuelCost = dailyFuelSpend * workingDaysPerMonth;
  const monthlyChargingCost = 700 * workingDaysPerMonth; // ~₦700/day electric charge or swap
  const netMonthlySavings = Math.max(0, monthlyFuelCost - (heroMonthly + monthlyChargingCost));
  const annualFuelSavings = (monthlyFuelCost - monthlyChargingCost) * 12;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* ========== SHARED NAVBAR ========== */}
      <Navbar />

      <main>
        {/* ========== HERO SECTION ========== */}
        <section className="relative overflow-hidden bg-white py-14 md:py-24 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="z-10 lg:col-span-7 order-2 lg:order-1 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 px-4 py-1.5 rounded-full mb-6 text-teal-900 font-semibold text-xs shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                <span>3-Minute Mono Open Banking Approval · Zero Paperwork</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-primary mb-6 leading-[1.1] tracking-tight">
                Stop Burning Cash on Petrol.{' '}
                <span className="text-secondary">Ride Electric to Own.</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-8 max-w-2xl leading-relaxed">
                Switch to an electric bike today with flexible Buy Now, Pay Later financing. Own a high-performance{' '}
                <strong className="text-slate-900">{cheapestBike ? cheapestBike.name : 'DandoEv E-Bike'}</strong> for as low as{' '}
                <strong className="text-secondary tabular-nums">{formatNaira(heroDaily)}/day</strong> ({formatNaira(heroMonthly)}/mo) while building compulsory savings.
              </p>

              {/* Key Value Pills */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mb-8">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Approval Time</div>
                  <div className="text-lg font-black text-primary mt-0.5">~3 Mins</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Down Payment</div>
                  <div className="text-lg font-black text-secondary mt-0.5">From 0%</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Rider Escrow</div>
                  <div className="text-lg font-black text-primary mt-0.5">₦1,000/day</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/bikes"
                  className="bg-primary text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:bg-primary-light transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Browse E-Bike Marketplace</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/checkout/bnpl"
                  className="bg-teal-50 border-2 border-secondary text-secondary font-bold px-8 py-4 rounded-xl hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <span>Start 3-Min BNPL Checkout</span>
                </Link>
              </div>
            </div>

            <div className="relative lg:col-span-5 order-1 lg:order-2 animate-scale-in">
              <div className="absolute -top-12 -right-12 w-80 h-80 bg-accent/25 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 rounded-3xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-2xl">
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-primary/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-bold">
                  <Zap size={14} className="text-accent" />
                  <span>{cheapestBike?.name || 'DandoEv Flagship'}</span>
                </div>
                <img
                  className="w-full aspect-4/3 object-contain p-8 sm:p-10"
                  src={cheapestBike?.images?.[0] || '/bikes/DandoEV_X6.jpg'}
                  alt={cheapestBike?.name || 'E-Bike'}
                />
                <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 border-t border-slate-200 flex justify-between items-center gap-4">
                  <div>
                    <p className="text-[11px] font-extrabold text-secondary uppercase tracking-wider mb-0.5">
                      Pay-As-You-Ride Plan
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
                      {formatNaira(heroBiDaily)}
                      <span className="text-xs font-semibold text-slate-500 ml-1">/ every 2 days</span>
                    </p>
                  </div>
                  <Link
                    href={cheapestBike ? `/bikes/${cheapestBike.id}` : '/bikes'}
                    className="px-4 py-2.5 rounded-xl bg-accent text-primary-dark font-extrabold text-xs hover:brightness-95 transition-all shrink-0"
                  >
                    Configure →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== TRUST SIGNALS ========== */}
        <section className="bg-surface-container-low py-10 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              {[
                { icon: <Truck size={24} />, label: '24-Hr Lagos Dispatch', sub: 'Ready-to-ride with plates' },
                { icon: <ShieldCheck size={24} />, label: 'CBN & NDPR Compliant', sub: 'Mono Open Banking verified' },
                { icon: <PiggyBank size={24} />, label: 'Save-As-You-Ride', sub: '100% returnable rider escrow' },
                { icon: <Headphones size={24} />, label: 'Battery & Hub Support', sub: '1-year motor & battery warranty' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 bg-white/80 p-4 rounded-2xl border border-slate-200/70 shadow-2xs"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-bold text-primary text-xs sm:text-sm">{item.label}</div>
                    <div className="text-[11px] text-slate-500">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== INTERACTIVE FUEL VS ELECTRIC ROI CALCULATOR ========== */}
        <section className="py-20 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-slate-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

              <div className="lg:col-span-6 space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
                  <Flame size={14} />
                  <span>Commercial Rider & Commuter ROI Calculator</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  See How Much Petrol Money You Keep Every Month
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Dispatch riders on Bolt, Chowdeck, and Glovo spend up to ₦180,000/month on petrol with zero asset equity. Slide your daily fuel cost below to see how switching to DandoEv pays for your bike.
                </p>

                {/* Sliders */}
                <div className="space-y-5 bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Your Daily Petrol Spend
                      </label>
                      <span className="text-xl font-black text-amber-400 tabular-nums">
                        {formatNaira(dailyFuelSpend)} / day
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2000}
                      max={15000}
                      step={500}
                      value={dailyFuelSpend}
                      onChange={(e) => setDailyFuelSpend(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer h-2 rounded-lg"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>₦2,000/day (Commuter)</span>
                      <span>₦7,500/day (Dispatch)</span>
                      <span>₦15,000/day (Heavy Fleet)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Riding Days Per Month
                      </label>
                      <span className="text-base font-black text-accent tabular-nums">
                        {workingDaysPerMonth} days / mo
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={30}
                      step={1}
                      value={workingDaysPerMonth}
                      onChange={(e) => setWorkingDaysPerMonth(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer h-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 relative z-10">
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <div className="text-[11px] font-bold uppercase text-rose-300">
                        Monthly Petrol Burned
                      </div>
                      <div className="text-2xl font-black text-rose-400 mt-1 tabular-nums">
                        {formatNaira(monthlyFuelCost)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        100% lost to fuel stations · ₦0 bike ownership
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="text-[11px] font-bold uppercase text-emerald-300">
                        DandoEv Charging Cost
                      </div>
                      <div className="text-2xl font-black text-accent mt-1 tabular-nums">
                        {formatNaira(monthlyChargingCost)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Saves {formatNaira(monthlyFuelCost - monthlyChargingCost)}/mo on energy alone
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-linear-to-r from-teal-950 to-slate-900 border border-teal-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                        <TrendingUp size={16} /> Annual Energy Savings vs. Petrol
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-accent text-primary-dark text-[10px] font-black uppercase">
                        100% Bike Ownership
                      </span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                      {formatNaira(annualFuelSavings)}{' '}
                      <span className="text-sm font-medium text-teal-300">/ year saved</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Plus, your plan includes <strong className="text-accent">₦30,000/month in compulsory rider escrow savings</strong> unlocked in cash when you finish your tenure!
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/checkout/bnpl"
                      className="flex-1 py-3.5 px-6 rounded-xl bg-accent text-primary-dark font-extrabold text-sm text-center hover:brightness-105 transition-all"
                    >
                      Lock In My BNPL Plan Now →
                    </Link>
                    <Link
                      href="/bikes"
                      className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm text-center transition-all"
                    >
                      Compare Models
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== FEATURED BIKES ========== */}
        <section className="py-20 bg-surface-container-lowest">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-primary mb-2">
                  Top-Selling Dando E-Bikes
                </h2>
                <p className="text-slate-600 text-base sm:text-lg">
                  Engineered for Nigerian roads, high payload capacity, and rapid battery swap.
                </p>
              </div>

              {/* Repayment Cadence Toggle */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {[
                    { id: 'daily', label: 'Daily' },
                    { id: 'bidaily', label: 'Every 2 Days' },
                    { id: 'monthly', label: 'Monthly' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCadenceView(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        cadenceView === tab.id
                          ? 'bg-primary text-white shadow-2xs'
                          : 'text-slate-600 hover:text-primary'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Link
                  href="/bikes"
                  className="hidden sm:inline-flex items-center gap-1 text-primary font-bold text-sm hover:underline"
                >
                  <span>Full Catalog</span>
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs animate-pulse"
                  >
                    <div className="h-64 bg-slate-100 flex items-center justify-center">
                      <Bike size={32} className="text-slate-300" />
                    </div>
                    <div className="p-6">
                      <div className="h-6 bg-slate-200 rounded w-2/3 mb-4" />
                      <div className="h-4 bg-slate-200 rounded w-1/2 mb-6" />
                      <div className="h-10 bg-slate-200 rounded w-full" />
                    </div>
                  </div>
                ))
              ) : featuredBikes.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-slate-500 font-medium">
                  No e-bikes currently available. Please check back later!
                </div>
              ) : (
                featuredBikes.map((bike) => {
                  const { installmentAmount } = calculateInstallment(
                    Number(bike.price),
                    BNPL_CONFIG.interestRate,
                    BNPL_CONFIG.defaultTenure
                  );
                  const displayInstallment =
                    cadenceView === 'daily'
                      ? Math.round(installmentAmount / 2)
                      : cadenceView === 'bidaily'
                      ? installmentAmount
                      : Math.round(installmentAmount * 15);
                  const cadenceSuffix =
                    cadenceView === 'daily' ? '/day' : cadenceView === 'bidaily' ? '/2 days' : '/mo';

                  return (
                    <Link
                      href={`/bikes/${bike.id}`}
                      key={bike.id}
                      className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-primary/40 hover:shadow-xl transition-all duration-300 flex flex-col"
                    >
                      <div className="relative h-64 overflow-hidden bg-surface-container-low">
                        <img
                          className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                          src={bike.images?.[0] || '/bikes/DandoEV_X6.jpg'}
                          alt={bike.name}
                        />
                        <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {bike.category}
                        </div>
                        <div className="absolute top-4 right-4 bg-accent text-primary-dark text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                          0% Down Eligible
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-secondary transition-colors">
                            {bike.name}
                          </h3>
                          <div className="flex flex-wrap gap-3 mb-5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <Zap size={13} className="text-secondary" /> {bike.motorPower}W
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <Battery size={13} className="text-secondary" /> {bike.rangeKm || bike.range || 0}km Range
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <Gauge size={13} className="text-secondary" /> {bike.topSpeed || 45}km/h
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center py-4 border-t border-slate-100">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                Cash Price
                              </p>
                              <p className="text-lg font-bold text-slate-800 tabular-nums">
                                {formatNaira(Number(bike.price))}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                                BNPL Plan
                              </p>
                              <p className="text-xl font-black text-secondary tabular-nums">
                                {formatNaira(displayInstallment)}
                                <span className="text-xs font-semibold text-slate-500">{cadenceSuffix}</span>
                              </p>
                            </div>
                          </div>
                          <div className="w-full mt-2 bg-primary group-hover:bg-secondary text-white font-bold py-3.5 rounded-xl text-center text-sm transition-colors">
                            Inspect & Finance Bike →
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ========== HOW IT WORKS ========== */}
        <section className="py-20 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-primary mb-3">
                Ride Home in 3 Simple Steps
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-base sm:text-lg">
                Our digital underwriting engine verifies your bank cashflow via Mono in under 3 minutes—no paper statements required.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Search size={28} />,
                  title: '1. Select Your E-Bike',
                  desc: 'Compare range, motor power, and extra 60V batteries. Choose daily, bi-daily, or monthly installments.',
                },
                {
                  icon: <ClipboardList size={28} />,
                  title: '2. Link Bank via Mono',
                  desc: 'Verify your identity and cashflow securely in 3 minutes and activate your NIBSS Direct Debit mandate.',
                },
                {
                  icon: <Bike size={28} />,
                  title: '3. Ride & Build Equity',
                  desc: 'Pick up your bike at our Lagos hub or get doorstep delivery. Every payment builds your compulsory savings vault.',
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex flex-col items-start bg-slate-50/70 p-8 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-all"
                >
                  <div
                    className={`w-14 h-14 ${
                      i === 1 ? 'bg-secondary' : 'bg-primary'
                    } text-white rounded-2xl flex items-center justify-center mb-6 shadow-md`}
                  >
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">{step.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== FINAL CTA SECTION ========== */}
        <section className="py-20 bg-primary text-white overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
              Ready to lead the EV revolution?
            </h2>
            <p className="text-slate-300 text-base sm:text-lg mb-10 max-w-2xl mx-auto">
              Join hundreds of commercial riders and commuters across Nigeria saving money every day with DandoEv.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/bikes"
                className="bg-accent text-primary-dark text-base font-extrabold px-10 py-4 rounded-xl hover:brightness-105 transition-all shadow-lg"
              >
                Explore Marketplace
              </Link>
              <Link
                href="/checkout/bnpl"
                className="border-2 border-white/30 hover:border-white text-white text-base font-bold px-10 py-4 rounded-xl transition-all"
              >
                Check 3-Min Eligibility
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="bg-primary-dark border-t border-white/10 w-full text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-6 py-14 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-4 text-white font-black text-xl tracking-tight">
              <img src="/logo.png" alt="logo" className="h-8 w-auto brightness-0 invert" />
              {APP_NAME}
            </div>
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Nigeria&apos;s premier gateway to affordable, reliable electric mobility. Bridging clean technology and inclusive finance.
            </p>
            <div className="flex gap-3">
              <a
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-accent hover:text-primary transition-all"
                href="#"
              >
                <Globe size={16} />
              </a>
              <a
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-accent hover:text-primary transition-all"
                href="#"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Marketplace</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><Link className="hover:text-white transition-colors" href="/bikes">All Electric Bikes</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/accessories">60V Batteries & Chargers</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/checkout/bnpl">3-Min BNPL Calculator</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Portals</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><Link className="hover:text-white transition-colors" href="/dashboard">Rider Repayment Portal</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/dashboard/repayments">Compulsory Savings Vault</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/admin">Staff Operations Console</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Compliance & Legal</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><Link className="hover:text-white transition-colors" href="/privacy">Privacy Policy</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/terms">BNPL Terms & Conditions</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/dashboard/security">NDPR Data Security</Link></li>
              <li><Link className="hover:text-rose-400 transition-colors" href="/delete-account">Delete Account Request</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-xs">
          <p>© 2026 {APP_NAME} Mobility Limited. All rights reserved.</p>
          <div className="flex gap-6">
            <span>CBN Microfinance Partner</span>
            <span>NDPR Data Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

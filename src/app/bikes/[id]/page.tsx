'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { formatNaira, calculateInstallment } from '@/lib/utils';
import { BNPL_CONFIG } from '@/lib/constants';
import {
  Zap,
  Battery,
  Gauge,
  ShieldCheck,
  Clock,
  Star,
  Loader2,
  Scale,
  Activity,
  Truck,
  PiggyBank,
  Info,
  CheckCircle2,
  ArrowRight,
  Flame,
} from 'lucide-react';

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#0f172a',
  'matte black': '#1e293b',
  white: '#f8fafc',
  'pearl white': '#f1f5f9',
  silver: '#94a3b8',
  grey: '#64748b',
  gray: '#64748b',
  blue: '#2563eb',
  'electric blue': '#0284c7',
  navy: '#021064',
  red: '#dc2626',
  green: '#059669',
  teal: '#006b5b',
  yellow: '#eab308',
  orange: '#ea580c',
};

export default function BikeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [bike, setBike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedTenure, setSelectedTenure] = useState(BNPL_CONFIG.defaultTenure);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(0);
  const cadenceView = 'weekly';
  const [paymentChoice, setPaymentChoice] = useState<'buy' | 'bnpl'>('bnpl');
  const [accessoriesList, setAccessoriesList] = useState<any[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, boolean>>({});
  const [showEscrowInfo, setShowEscrowInfo] = useState(false);

  useEffect(() => {
    async function fetchAccessories() {
      try {
        const res = await fetch('/api/accessories');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAccessoriesList(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch accessories:', err);
      }
    }
    fetchAccessories();
  }, []);

  useEffect(() => {
    async function fetchBike() {
      try {
        const res = await fetch(`/api/bikes/${id}`);
        const data = await res.json();
        if (data.success) {
          setBike(data.data);
          if (data.data.colors?.length > 0) setSelectedColor(data.data.colors[0]);
          if (data.data.bnplEligible !== false) setPaymentChoice('bnpl');
        } else {
          setError('Bike not found');
        }
      } catch (err) {
        setError('Network error loading bike details');
      } finally {
        setLoading(false);
      }
    }
    fetchBike();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar backHref="/bikes" backLabel="Marketplace" />
        <div className="max-w-lg mx-auto text-center py-20 px-6">
          <h2 className="text-2xl font-bold text-primary mb-2">{error || 'Bike not found'}</h2>
          <p className="text-sm text-slate-500 mb-6">
            The electric bike you are looking for may have been moved or retired.
          </p>
          <Link href="/bikes" className="btn btn-primary btn-sm">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images: string[] =
    Array.isArray(bike.images) && bike.images.length > 0
      ? bike.images
      : ['/bikes/DandoEV_X6.jpg'];

  const selectedAccessoriesPrice = Object.keys(selectedAccessories)
    .filter((accId) => selectedAccessories[accId])
    .reduce((sum, accId) => {
      const accObj = accessoriesList.find((a) => a.id === accId);
      return sum + Number(accObj?.price || 0);
    }, 0);

  const grossAssetPrice = Number(bike.price) + selectedAccessoriesPrice;
  const downPaymentAmount = Math.round((grossAssetPrice * downPaymentPercent) / 100);
  const financedPrincipal = grossAssetPrice - downPaymentAmount;

  const {
    installmentAmount,
    numberOfInstallments,
    totalInterest,
    totalRepayable,
    healthInsuranceFee,
    processingFee,
    totalSavings,
  } = calculateInstallment(financedPrincipal, BNPL_CONFIG.interestRate, selectedTenure);

  const displayInstallment = Math.round(totalRepayable / (selectedTenure * 4));
  const cadenceLabel = '/ week';

  const toggleAccessory = (accId: string) => {
    setSelectedAccessories((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  const handleProceedToBnpl = () => {
    const existing = JSON.parse(sessionStorage.getItem('bnpl_data') || '{}');
    const selectedAccs = Object.keys(selectedAccessories)
      .filter((accId) => selectedAccessories[accId])
      .map((accId) => {
        const accObj = accessoriesList.find((a) => a.id === accId);
        return {
          id: accId,
          quantity: 1,
          price: Number(accObj?.price || 0),
          name: accObj?.name,
        };
      });

    sessionStorage.setItem(
      'bnpl_data',
      JSON.stringify({
        ...existing,
        bikeId: bike.id,
        bikeDetails: {
          id: bike.id,
          name: bike.name,
          brand: bike.brand || 'DandoEv',
          price: Number(bike.price),
          image: images[0],
          range: `${bike.rangeKm || bike.range || 80} km / charge`,
          topSpeed: `${bike.topSpeed || 45} km/h`,
        },
        selectedColor: selectedColor || bike.colors?.[0] || 'Matte Black',
        tenure: selectedTenure,
        downPaymentPercent,
        repaymentCadence: 'weekly',
        accessories: selectedAccs,
      })
    );
    router.push(`/checkout/bnpl?bikeId=${bike.id}`);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28 md:pb-16">
      <Navbar backHref="/bikes" backLabel="Marketplace" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT COLUMN: Gallery, Colors, Features & Specs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Image Viewer */}
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="relative h-[340px] sm:h-[420px] bg-surface-container-low flex items-center justify-center p-8">
                <img
                  src={images[activeImage] || images[0]}
                  alt={bike.name}
                  className="w-full h-full object-contain transition-all duration-300"
                />
                {bike.bnplEligible !== false && (
                  <div className="absolute top-4 right-4 bg-accent text-primary-dark px-4 py-1.5 rounded-full font-extrabold text-xs uppercase tracking-wider shadow-sm">
                    ⚡ 3-Min BNPL Available
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-primary uppercase">
                  {bike.category} · {bike.brand || 'DandoEv'}
                </div>
              </div>

              {/* Thumbnail Strip & Color Swatches */}
              <div className="p-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                {images.length > 1 ? (
                  <div className="flex items-center gap-2.5">
                    {images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`w-16 h-16 rounded-xl border-2 p-1.5 bg-slate-50 transition-all ${
                          activeImage === idx
                            ? 'border-primary ring-2 ring-primary/15'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-medium">
                    High-durability Nigerian spec chassis
                  </div>
                )}

                {bike.colors?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 mr-1">Color:</span>
                    {bike.colors.map((c: string) => {
                      const hex = COLOR_HEX_MAP[c.toLowerCase()] || '#021064';
                      const isSelected = selectedColor === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-primary mb-1">
                  Performance & Engineering Specs
                </h2>
                <p className="text-xs text-slate-500">
                  Built for daily commercial dispatch and urban commuting across Nigeria.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {[
                  { icon: <Zap size={18} />, label: 'Hub Motor Power', value: `${bike.motorPower}W` },
                  {
                    icon: <Battery size={18} />,
                    label: 'Battery Capacity',
                    value: `${bike.batteryCapacity || 2880}Wh`,
                  },
                  {
                    icon: <Activity size={18} />,
                    label: 'Range / Charge',
                    value: `${bike.rangeKm || bike.range} km`,
                  },
                  { icon: <Gauge size={18} />, label: 'Top Speed', value: `${bike.topSpeed} km/h` },
                  {
                    icon: <Clock size={18} />,
                    label: '0–100% Charge',
                    value: `${bike.chargingTime || 4} hrs`,
                  },
                  { icon: <Scale size={18} />, label: 'Curb Weight', value: `${bike.weight || 85} kg` },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {s.icon}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Included Features */}
              {bike.features?.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Standard Equipment & Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {bike.features.map((f: string) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1.5 bg-teal-50 text-secondary border border-teal-200/70 px-3 py-1.5 rounded-xl text-xs font-bold"
                      >
                        <CheckCircle2 size={13} />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Fuel Savings Callout Banner */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                  <Flame size={20} />
                </div>
                <div className="text-xs leading-relaxed text-amber-950">
                  <strong>Saves ~₦145,000/month vs. Petrol:</strong> Commercial riders using the{' '}
                  <strong>{bike.name}</strong> eliminate daily fuel queues while converting their daily operating expense into 100% bike ownership.
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Financing & Purchase Configurator */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm sticky top-24 space-y-6">
              {/* Title & Rating */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {bike.rating || '4.9'} ({bike.reviewCount || 42} Verified Riders)
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    In Stock · Lagos Hub
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                  {bike.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {bike.description}
                </p>
              </div>

              {/* Payment Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setPaymentChoice('bnpl')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    paymentChoice === 'bnpl'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-primary'
                  }`}
                >
                  <span>📅 Pay-As-You-Ride (BNPL)</span>
                </button>
                <button
                  onClick={() => setPaymentChoice('buy')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    paymentChoice === 'buy'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-primary'
                  }`}
                >
                  <span>💳 Outright Cash Purchase</span>
                </button>
              </div>

              {/* Optional Accessories Bundle */}
              {accessoriesList.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                    🔋 Bundle Extra 60V Batteries & Chargers
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {accessoriesList.map((acc) => {
                      const isSelected = !!selectedAccessories[acc.id];
                      return (
                        <div
                          key={acc.id}
                          onClick={() => toggleAccessory(acc.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 accent-primary rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {acc.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {acc.description}
                            </div>
                          </div>
                          <div className="font-extrabold text-xs text-primary tabular-nums shrink-0">
                            +{formatNaira(acc.price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {paymentChoice === 'buy' ? (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">
                      Total Outright Cash Price
                    </div>
                    <div className="text-3xl font-black text-primary tabular-nums mt-0.5">
                      {formatNaira(grossAssetPrice + Math.round(grossAssetPrice * 0.10))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Includes 10% compulsory insurance + 1-year motor & battery warranty + free Lagos delivery.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const accQuery = Object.keys(selectedAccessories)
                        .filter((accId) => selectedAccessories[accId])
                        .join(',');
                      router.push(
                        `/checkout?bikeId=${bike.id}${accQuery ? `&accessories=${accQuery}` : ''}`
                      );
                    }}
                    className="w-full py-4 rounded-xl bg-primary hover:bg-primary-light text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>Proceed to Instant Cash Checkout</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Dynamic Installment Display Card */}
                  <div className="p-5 rounded-2xl bg-primary text-white space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                        Repayment Schedule
                      </span>
                      <div className="inline-flex bg-accent text-primary-dark px-2.5 py-1 rounded-md text-[10px] font-bold">
                        Weekly Deduction
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                        {formatNaira(displayInstallment)}
                      </span>
                      <span className="text-xs text-slate-300 font-semibold">{cadenceLabel}</span>
                    </div>

                    <div className="text-[11px] text-slate-300 flex items-center justify-between pt-2 border-t border-white/10">
                      <span>{selectedTenure * 4} weekly installments</span>
                      <span className="text-accent font-bold">{selectedTenure} Months Tenure</span>
                    </div>
                  </div>

                  {/* Tenure Selector */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-700">Select Loan Tenure:</span>
                      <span className="text-xs font-bold text-secondary">{selectedTenure} Months</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {BNPL_CONFIG.tenureOptions.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTenure(t)}
                          className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                            selectedTenure === t
                              ? 'bg-primary text-white border-primary shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {t} mo
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Down Payment Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-700">Optional Down Payment:</span>
                      <span className="font-extrabold text-primary tabular-nums">
                        {downPaymentPercent}% ({formatNaira(downPaymentAmount)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={5}
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer h-2 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>0% (₦0 Today)</span>
                      <span>20% Down</span>
                      <span>40% Down (Lower EMI)</span>
                    </div>
                  </div>

                  {/* Transparent Breakdown with Returnable Escrow Tooltip */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">E-Bike Cash Price</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {formatNaira(bike.price)}
                      </span>
                    </div>
                    {selectedAccessoriesPrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bundled Accessories</span>
                        <span className="font-bold text-slate-800 tabular-nums">
                          +{formatNaira(selectedAccessoriesPrice)}
                        </span>
                      </div>
                    )}
                    {downPaymentAmount > 0 && (
                      <div className="flex justify-between text-secondary">
                        <span className="font-semibold">Down Payment ({downPaymentPercent}%)</span>
                        <span className="font-bold tabular-nums">-{formatNaira(downPaymentAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Financed Principal</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatNaira(financedPrincipal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Processing & Onboarding</span>
                      <span className="font-semibold text-slate-700 tabular-nums">
                        {formatNaira(processingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rider Health & Asset Insurance</span>
                      <span className="font-semibold text-slate-700 tabular-nums">
                        {formatNaira(healthInsuranceFee)}
                      </span>
                    </div>

                    {/* Compulsory Savings Highlight */}
                    <div className="p-2.5 rounded-xl bg-teal-50/90 border border-teal-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowEscrowInfo(!showEscrowInfo)}
                          className="inline-flex items-center gap-1 font-bold text-secondary text-left"
                        >
                          <PiggyBank size={14} />
                          <span>Save-As-You-Ride Escrow</span>
                          <Info size={12} className="text-slate-400" />
                        </button>
                        <span className="font-extrabold text-secondary tabular-nums">
                          {formatNaira(totalSavings)}
                        </span>
                      </div>
                      <div className="text-[10px] text-teal-800 font-medium">
                        ✨ <strong>100% Returnable Cash:</strong> Unlocked to your bank wallet upon loan completion!
                      </div>
                      {showEscrowInfo && (
                        <p className="text-[10px] text-slate-600 pt-1 border-t border-teal-200/60">
                          ₦1,000/day is automatically saved in your locked escrow wallet while you ride. Once your bike is paid off, the entire {formatNaira(totalSavings)} is yours to withdraw or buy a new battery.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Financing Interest</span>
                      <span className="font-semibold text-slate-700 tabular-nums">
                        {formatNaira(totalInterest)}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="font-extrabold text-slate-900 text-sm">
                        Total Repayable + Savings
                      </span>
                      <span className="font-black text-primary text-base tabular-nums">
                        {formatNaira(totalRepayable)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleProceedToBnpl}
                    className="w-full py-4 rounded-xl bg-accent hover:brightness-95 text-primary-dark font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Start 3-Minute BNPL Checkout</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-secondary" />
                  {bike.warranty || '1-Year'} Warranty
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck size={15} className="text-primary" />
                  Free Lagos Delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom CTA Bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="text-[10px] font-bold uppercase text-secondary">
            {paymentChoice === 'bnpl' ? 'BNPL Installment' : 'Cash Price'}
          </div>
          <div className="text-lg font-black text-primary tabular-nums">
            {paymentChoice === 'bnpl' ? (
              <>
                {formatNaira(displayInstallment)}
                <span className="text-xs font-medium text-slate-500">{cadenceLabel}</span>
              </>
            ) : (
              formatNaira(grossAssetPrice + Math.round(grossAssetPrice * 0.10))
            )}
          </div>
        </div>
        <button
          onClick={
            paymentChoice === 'bnpl'
              ? handleProceedToBnpl
              : () => router.push(`/checkout?bikeId=${bike.id}`)
          }
          className="px-5 py-3 rounded-xl bg-primary text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
        >
          <span>{paymentChoice === 'bnpl' ? '3-Min BNPL →' : 'Buy Now →'}</span>
        </button>
      </div>
    </div>
  );
}

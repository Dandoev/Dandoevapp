'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { formatNaira, calculateInstallment, capitalize } from '@/lib/utils';
import { BNPL_CONFIG, BIKE_CATEGORIES } from '@/lib/constants';
import {
  Zap,
  Battery,
  Gauge,
  Star,
  Search,
  ArrowRight,
  X,
  Sparkles,
  Scale,
  Check,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import type { BikeFilters } from '@/lib/types';

export default function BikeCatalogPage() {
  const [filters, setFilters] = useState<BikeFilters>({});
  const [cadenceView, setCadenceView] = useState<'daily' | 'bidaily' | 'monthly'>('bidaily');
  const [bikes, setBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    async function fetchBikes() {
      try {
        const res = await fetch('/api/bikes');
        const data = await res.json();
        if (data.success) {
          setBikes(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch bikes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBikes();
  }, []);

  const toggleCompare = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const comparedBikes = useMemo(
    () => bikes.filter((b) => compareIds.includes(b.id)),
    [bikes, compareIds]
  );

  const filteredBikes = useMemo(() => {
    let filtered = [...bikes];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(s) ||
          b.brand?.toLowerCase().includes(s) ||
          b.category?.toLowerCase().includes(s)
      );
    }
    if (filters.category) {
      filtered = filtered.filter(
        (b) => b.category?.toLowerCase() === filters.category?.toLowerCase()
      );
    }
    if (filters.priceMin) filtered = filtered.filter((b) => Number(b.price) >= filters.priceMin!);
    if (filters.priceMax) filtered = filtered.filter((b) => Number(b.price) <= filters.priceMax!);
    if (filters.sortBy === 'price_asc') filtered.sort((a, b) => Number(b.price) - Number(b.price));
    else if (filters.sortBy === 'price_desc')
      filtered.sort((a, b) => Number(b.price) - Number(a.price));
    else if (filters.sortBy === 'rating')
      filtered.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    return filtered;
  }, [filters, bikes]);

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.priceMin || filters.sortBy
  );

  const getCadenceInstallment = (price: number) => {
    const { installmentAmount } = calculateInstallment(
      Number(price),
      BNPL_CONFIG.interestRate,
      BNPL_CONFIG.defaultTenure
    );
    const amount =
      cadenceView === 'daily'
        ? Math.round(installmentAmount / 2)
        : cadenceView === 'bidaily'
        ? installmentAmount
        : Math.round(installmentAmount * 15);
    const suffix =
      cadenceView === 'daily' ? '/day' : cadenceView === 'bidaily' ? '/2 days' : '/mo';
    return { amount, suffix };
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-24">
      <Navbar />

      {/* Top Marketplace Banner */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-secondary text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>All Models Eligible for 3-Minute BNPL Financing</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
                Electric Bike Marketplace
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-1">
                Showing <strong className="text-slate-900">{filteredBikes.length}</strong> Nigerian-road-tested electric bikes with instant BNPL options. Select up to 3 models to compare side-by-side.
              </p>
            </div>

            {/* Cadence Toggle */}
            <div className="flex flex-col sm:items-end gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Display BNPL Installments As:
              </span>
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[
                  { id: 'daily', label: 'Daily' },
                  { id: 'bidaily', label: 'Every 2 Days' },
                  { id: 'monthly', label: 'Monthly' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCadenceView(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      cadenceView === tab.id
                        ? 'bg-primary text-white shadow-2xs'
                        : 'text-slate-600 hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Always-Visible Search, Category Pills & Sort Bar */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilters((f) => ({ ...f, category: undefined }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  !filters.category
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All E-Bikes ({bikes.length})
              </button>
              {BIKE_CATEGORIES.map((c) => {
                const isSelected = filters.category?.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        category: isSelected ? undefined : c,
                      }))
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search model, brand, spec..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
                {filters.search && (
                  <button
                    onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={filters.sortBy || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sortBy: (e.target.value as BikeFilters['sortBy']) || undefined,
                  }))
                }
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Sort: Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={() => setFilters({})}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bike Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-6 space-y-4 animate-pulse"
              >
                <div className="h-52 bg-slate-100 rounded-xl" />
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-12 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : filteredBikes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No matching e-bikes found</h3>
            <p className="text-xs text-slate-500 mb-6">
              Try clearing your search filter or selecting another category.
            </p>
            <button
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-all"
              onClick={() => setFilters({})}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBikes.map((bike) => {
              const { amount: displayInstallment, suffix: cadenceSuffix } = getCadenceInstallment(
                Number(bike.price)
              );
              const isSelectedForCompare = compareIds.includes(bike.id);

              return (
                <Link
                  href={`/bikes/${bike.id}`}
                  key={bike.id}
                  className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${
                    isSelectedForCompare
                      ? 'border-secondary ring-2 ring-secondary/20 shadow-lg'
                      : 'border-slate-200/90 hover:border-primary/40 hover:shadow-xl'
                  }`}
                >
                  <div className="h-56 bg-surface-container-low relative flex items-center justify-center overflow-hidden p-6">
                    <img
                      src={bike.images?.[0] || '/bikes/DandoEV_X6.jpg'}
                      alt={bike.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                      <span
                        className={`badge ${
                          bike.availability === 'in_stock'
                            ? 'badge-success'
                            : bike.availability === 'pre_order'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {capitalize(bike.availability || 'in_stock')}
                      </span>
                    </div>

                    {/* Compare Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleCompare(e, bike.id)}
                      className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-xs ${
                        isSelectedForCompare
                          ? 'bg-secondary text-white'
                          : 'bg-white/95 hover:bg-primary hover:text-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isSelectedForCompare ? <Check size={13} /> : <Scale size={13} />}
                      <span>{isSelectedForCompare ? 'Comparing' : 'Compare'}</span>
                    </button>

                    {bike.bnplEligible !== false && (
                      <div className="absolute top-3.5 right-3.5 bg-accent text-primary-dark px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                        BNPL Eligible
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                          {bike.category} · {bike.brand || 'DandoEv'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Star size={13} className="fill-amber-400 text-amber-400" />
                          {bike.rating || '4.8'}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-secondary transition-colors">
                        {bike.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                        {bike.description}
                      </p>

                      {/* Specs */}
                      <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                          <div className="flex items-center justify-center text-primary mb-0.5">
                            <Zap size={13} />
                          </div>
                          <div className="text-[11px] font-bold text-slate-800">{bike.motorPower}W</div>
                          <div className="text-[9px] text-slate-400 uppercase font-semibold">Motor</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                          <div className="flex items-center justify-center text-primary mb-0.5">
                            <Battery size={13} />
                          </div>
                          <div className="text-[11px] font-bold text-slate-800">
                            {bike.rangeKm || bike.range}km
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase font-semibold">Range</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                          <div className="flex items-center justify-center text-primary mb-0.5">
                            <Gauge size={13} />
                          </div>
                          <div className="text-[11px] font-bold text-slate-800">
                            {bike.topSpeed}km/h
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase font-semibold">Top Speed</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Cash Price
                          </div>
                          <div className="text-base font-extrabold text-slate-800 tabular-nums">
                            {formatNaira(Number(bike.price))}
                          </div>
                        </div>
                        {bike.bnplEligible !== false && (
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase text-secondary">
                              Pay-As-You-Ride
                            </div>
                            <div className="text-xl font-black text-primary tabular-nums">
                              {formatNaira(displayInstallment)}
                              <span className="text-xs font-semibold text-slate-500">
                                {cadenceSuffix}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="w-full py-3 px-4 rounded-xl bg-primary group-hover:bg-secondary text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors">
                        <span>Configure & Check Eligibility</span>
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Comparison Bar */}
      {comparedBikes.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-3xl bg-primary text-white rounded-2xl p-3.5 sm:px-5 shadow-2xl border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#26fedc] shrink-0">
              <Scale className="w-4 h-4" />
              <span>Compare ({comparedBikes.length}/3):</span>
            </div>
            <div className="flex items-center gap-2">
              {comparedBikes.map((b) => (
                <div
                  key={b.id}
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1 text-xs font-semibold shrink-0"
                >
                  <span className="truncate max-w-[110px]">{b.name}</span>
                  <button
                    onClick={(e) => toggleCompare(e, b.id)}
                    className="text-white/70 hover:text-white"
                    title="Remove"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setCompareIds([])}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-2 rounded-xl bg-[#26fedc] text-[#021064] font-black text-xs hover:opacity-95 transition-all inline-flex items-center gap-1.5 shadow-sm"
            >
              <span>Compare Side-by-Side</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && comparedBikes.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  DandoEv Technical & Financing Matrix
                </span>
                <h2 className="text-xl font-black text-primary">
                  Side-by-Side E-Bike Comparison
                </h2>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comparison Table */}
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="w-44 py-4 pr-4 align-bottom text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Model & Specs
                    </th>
                    {comparedBikes.map((bike) => (
                      <th key={bike.id} className="pb-4 px-3 align-top">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 relative">
                          <button
                            onClick={(e) => toggleCompare(e, bike.id)}
                            className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600"
                            title="Remove from comparison"
                          >
                            <X size={13} />
                          </button>
                          <div className="h-28 flex items-center justify-center mb-3">
                            <img
                              src={bike.images?.[0] || '/bikes/DandoEV_X6.jpg'}
                              alt={bike.name}
                              className="max-h-full object-contain"
                            />
                          </div>
                          <div className="text-[10px] font-bold uppercase text-secondary">
                            {bike.category}
                          </div>
                          <div className="text-base font-black text-primary">{bike.name}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">
                      Pay-As-You-Ride ({cadenceView})
                    </td>
                    {comparedBikes.map((bike) => {
                      const { amount, suffix } = getCadenceInstallment(Number(bike.price));
                      return (
                        <td key={bike.id} className="py-3.5 px-3">
                          <span className="text-base font-black text-primary tabular-nums">
                            {formatNaira(amount)}
                          </span>
                          <span className="text-slate-500 font-semibold">{suffix}</span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">Cash Price</td>
                    {comparedBikes.map((bike) => (
                      <td
                        key={bike.id}
                        className="py-3.5 px-3 font-extrabold text-slate-900 tabular-nums"
                      >
                        {formatNaira(Number(bike.price))}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">
                      Returnable Escrow Deposit (10%)
                    </td>
                    {comparedBikes.map((bike) => (
                      <td key={bike.id} className="py-3.5 px-3">
                        <span className="font-bold text-emerald-700 tabular-nums">
                          {formatNaira(Math.round(Number(bike.price) * 0.1))}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          100% Refunded on Completion
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">Motor Power</td>
                    {comparedBikes.map((bike) => (
                      <td key={bike.id} className="py-3.5 px-3 font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Zap size={13} className="text-primary" /> {bike.motorPower}W Brushless Hub
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">Range per Charge</td>
                    {comparedBikes.map((bike) => (
                      <td key={bike.id} className="py-3.5 px-3 font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Battery size={13} className="text-secondary" />{' '}
                          {bike.rangeKm || bike.range} km
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">Top Speed</td>
                    {comparedBikes.map((bike) => (
                      <td key={bike.id} className="py-3.5 px-3 font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Gauge size={13} className="text-primary" /> {bike.topSpeed} km/h
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">Charging Time & Weight</td>
                    {comparedBikes.map((bike) => (
                      <td key={bike.id} className="py-3.5 px-3 text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" />{' '}
                          {bike.chargingTimeHours || bike.chargingTime || 5} hrs ·{' '}
                          {bike.weightKg || bike.weight || 42} kg
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-600">GPS & Insurance</td>
                    {comparedBikes.map((bike) => (
                      <td key={bike.id} className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <ShieldCheck size={14} /> Included Free
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="pt-5 pr-4" />
                    {comparedBikes.map((bike) => (
                      <td key={bike.id} className="pt-5 px-3">
                        <Link
                          href={`/bikes/${bike.id}`}
                          className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-secondary text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Configure & Finance</span>
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

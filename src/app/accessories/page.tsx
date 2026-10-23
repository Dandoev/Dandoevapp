'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { formatNaira, capitalize } from '@/lib/utils';
import {
  Battery,
  Zap,
  Loader2,
  ShoppingBag,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function AccessoriesCatalogPage() {
  const router = useRouter();
  const [accessories, setAccessories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchAccessories() {
      try {
        const res = await fetch('/api/accessories');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAccessories(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch accessories:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAccessories();
  }, []);

  const filteredAccessories = useMemo(() => {
    if (categoryFilter === 'all') return accessories;
    return accessories.filter((a) => a.category === categoryFilter);
  }, [categoryFilter, accessories]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedItems = accessories.filter((a) => selectedIds[a.id]);
  const bundleTotal = selectedItems.reduce((sum, a) => sum + Number(a.price || 0), 0);

  return (
    <div className="min-h-screen bg-background text-on-surface pb-28">
      <Navbar />

      {/* Top Header Banner */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-secondary text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Genuine 60V Lithium Packs & Rapid Chargers</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
              Batteries, Chargers & Upgrades
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1">
              Double your daily dispatch range with swappable 60V lithium batteries—buy outright or bundle into your BNPL plan.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
            {[
              { id: 'all', label: `All Add-ons (${accessories.length})` },
              { id: 'battery', label: '60V Batteries' },
              { id: 'charger', label: 'Fast Chargers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === tab.id
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={48} className="animate-spin text-primary" />
          </div>
        ) : filteredAccessories.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <Battery size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-primary mb-1">No accessories found</h3>
            <p className="text-xs text-slate-500 mb-4">
              Try switching to another category filter.
            </p>
            <button
              onClick={() => setCategoryFilter('all')}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Show All Add-ons
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccessories.map((acc) => {
              const isSelected = Boolean(selectedIds[acc.id]);
              return (
                <div
                  key={acc.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/15 shadow-xl'
                      : 'border-slate-200/90 hover:border-primary/40 hover:shadow-lg'
                  }`}
                >
                  <div>
                    <div className="h-52 bg-surface-container-low relative flex items-center justify-center p-6">
                      {acc.images?.[0] ? (
                        <img
                          src={acc.images[0]}
                          alt={acc.name}
                          className="w-full h-full object-contain"
                        />
                      ) : acc.category === 'battery' ? (
                        <Battery size={64} className="text-primary opacity-80" />
                      ) : (
                        <Zap size={64} className="text-amber-500 opacity-80" />
                      )}

                      <div className="absolute top-3.5 left-3.5">
                        <span
                          className={`badge ${
                            acc.availability === 'in_stock'
                              ? 'badge-success'
                              : acc.availability === 'pre_order'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {capitalize(acc.availability || 'in_stock')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSelect(acc.id)}
                        className={`absolute top-3.5 right-3.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white/90 text-slate-700 border border-slate-200 hover:border-primary'
                        }`}
                      >
                        {isSelected ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isSelected ? 'Added to Bundle' : 'Bundle'}</span>
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-1">
                        {acc.category} · {acc.brand || 'DandoEv'}
                      </div>
                      <h3 className="text-lg font-extrabold text-primary mb-2">{acc.name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        {acc.description}
                      </p>

                      {acc.specifications && (
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl grid grid-cols-2 gap-2.5">
                          {Object.entries(acc.specifications).map(([key, val]) => (
                            <div key={key}>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">
                                {key}
                              </div>
                              <div className="text-xs font-extrabold text-slate-800">
                                {String(val)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          Unit Price
                        </div>
                        <div className="text-xl font-black text-primary tabular-nums">
                          {formatNaira(acc.price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelect(acc.id)}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-teal-50 border-teal-200 text-secondary'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-primary'
                          }`}
                        >
                          {isSelected ? 'Selected ✓' : '+ Bundle'}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/checkout?accessories=${acc.id}`)}
                          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <ShoppingBag size={14} />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bundle Checkout Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-3xl bg-primary text-white rounded-2xl p-4 shadow-2xl border border-accent/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent text-primary-dark font-black text-sm flex items-center justify-center shrink-0">
              {selectedItems.length}
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {selectedItems.map((i) => i.name).join(' + ')}
              </div>
              <div className="text-xs text-accent font-extrabold tabular-nums">
                Bundle Total: {formatNaira(bundleTotal)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setSelectedIds({})}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const ids = selectedItems.map((i) => i.id).join(',');
                router.push(`/checkout?accessories=${ids}`);
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-accent text-primary-dark font-black text-xs inline-flex items-center justify-center gap-1.5 hover:brightness-95 transition-all"
            >
              <span>Checkout Bundle</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

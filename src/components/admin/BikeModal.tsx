'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Bike, CheckCircle2 } from 'lucide-react';

interface BikeModalProps {
  bike?: any; // If present, we are editing
  onClose: () => void;
  onSave: (savedBike?: any) => void;
}

export default function BikeModal({ bike, onClose, onSave }: BikeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    brand: 'DandoEv',
    model: '2026',
    description: '',
    price: '',
    category: 'Commercial Delivery',
    stockQuantity: '10',
    availability: 'in_stock',
    bnplEligible: true,
    bnplMinDownPayment: '15',
  });

  useEffect(() => {
    if (bike) {
      setForm({
        name: bike.name || '',
        brand: bike.brand || 'DandoEv',
        model: bike.model || '2026',
        description: bike.description || '',
        price: bike.price ? bike.price.toString() : '',
        category: bike.category || 'Commercial Delivery',
        stockQuantity: bike.stockQuantity !== undefined ? bike.stockQuantity.toString() : '10',
        availability: bike.availability || 'in_stock',
        bnplEligible: bike.bnplEligible !== undefined ? bike.bnplEligible : true,
        bnplMinDownPayment: bike.bnplMinDownPayment ? bike.bnplMinDownPayment.toString() : '15',
      });
    }
  }, [bike]);

  const u = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...(bike || {}),
      ...form,
      price: parseFloat(form.price) || 0,
      stockQuantity: parseInt(form.stockQuantity, 10) || 0,
      bnplMinDownPayment: parseInt(form.bnplMinDownPayment, 10) || 0,
    };

    try {
      const url = bike ? `/api/admin/bikes/${bike.id}` : '/api/admin/bikes';
      const method = bike ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onSave(data.data || data);
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'The bike could not be saved.');
      }
    } catch {
      setError('Network error. The fleet record was not changed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006b5b]/10 text-[#006b5b] flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {bike ? `Edit Fleet Asset: ${bike.name}` : 'Register New E-Bike Model'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure retail Naira pricing, warehouse stock, and BNPL down-payment rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Model Name <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#006b5b]"
                required
                value={form.name}
                onChange={(e) => u('name', e.target.value)}
                placeholder="e.g. Dando S-Cargo Dual-Battery"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Manufacturer Brand <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#006b5b]"
                required
                value={form.brand}
                onChange={(e) => u('brand', e.target.value)}
                placeholder="e.g. DandoEv"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model Year / Code</label>
              <input
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#006b5b]"
                value={form.model}
                onChange={(e) => u('model', e.target.value)}
                placeholder="e.g. 2026-GEN3"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fleet Category</label>
              <select
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#006b5b]"
                value={form.category}
                onChange={(e) => u('category', e.target.value)}
              >
                <option value="Commercial Delivery">Commercial Delivery</option>
                <option value="Executive Commuter">Executive Commuter</option>
                <option value="Heavy-Duty Cargo">Heavy-Duty Cargo</option>
                <option value="All-Terrain Utility">All-Terrain Utility</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cash Price (₦) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#006b5b]"
                value={form.price}
                onChange={(e) => u('price', e.target.value)}
                placeholder="1350000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hub Stock Qty <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#006b5b]"
                value={form.stockQuantity}
                onChange={(e) => u('stockQuantity', e.target.value)}
                placeholder="15"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Availability</label>
              <select
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#006b5b]"
                value={form.availability}
                onChange={(e) => u('availability', e.target.value)}
              >
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="pre_order">Pre-Order</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Technical Specifications & Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006b5b]"
              value={form.description}
              onChange={(e) => u('description', e.target.value)}
              placeholder="Dual 60V LiFePO4 swappable battery architecture, 140km urban range, integrated GPS immobilizer..."
            />
          </div>

          <div className="p-4 rounded-2xl bg-[#006b5b]/5 border border-[#006b5b]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-900">
              <input
                type="checkbox"
                checked={form.bnplEligible}
                onChange={(e) => u('bnplEligible', e.target.checked)}
                className="w-4 h-4 accent-[#006b5b] rounded"
              />
              <span>Eligible for BNPL Installment Financing</span>
            </label>
            {form.bnplEligible && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-600">Min Down Payment (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.bnplMinDownPayment}
                  onChange={(e) => u('bnplMinDownPayment', e.target.value)}
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/3 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-2.5 px-4 rounded-xl bg-[#006b5b] hover:bg-[#005a4c] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Fleet Asset...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> {bike ? 'Save Asset Changes' : 'Add E-Bike to Fleet'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Battery, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

interface LoanApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any | null;
  onApproveSuccess: (allocatedSerials?: {
    bikeSerialNumber: string;
    chassisNumber: string;
    batteryNumber1: string;
    batteryNumber2?: string;
    chargerNumber?: string;
    adminNotes?: string;
  }) => void;
}

export default function LoanApprovalModal({
  isOpen,
  onClose,
  loan,
  onApproveSuccess,
}: LoanApprovalModalProps) {
  const [bikeSerialNumber, setBikeSerialNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [batteryNumber1, setBatteryNumber1] = useState('');
  const [batteryNumber2, setBatteryNumber2] = useState('');
  const [chargerNumber, setChargerNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('Application approved after credit review & KYC validation.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !loan) return null;

  const applicantName = loan.user
    ? `${loan.user.firstName} ${loan.user.lastName}`
    : loan.personalInfo
    ? `${loan.personalInfo.firstName} ${loan.personalInfo.lastName}`
    : loan.userName || 'Applicant';

  const handleAutoAssignSerials = () => {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    setBikeSerialNumber(`DAN-2026-X5-${suffix}`);
    setChassisNumber(`CH-NG-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setBatteryNumber1(`BATT-60V45AH-${suffix}A`);
    setBatteryNumber2(`BATT-60V45AH-${suffix}B`);
    setChargerNumber(`CHG-60V10A-${Math.floor(100 + Math.random() * 899)}`);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!bikeSerialNumber.trim()) {
      setError('Bike Serial Number is required for physical asset allocation.');
      return;
    }
    if (!chassisNumber.trim()) {
      setError('Chassis Number is required for physical asset allocation.');
      return;
    }
    if (!batteryNumber1.trim()) {
      setError('Primary Battery Serial Number is required.');
      return;
    }

    const allocated = {
      bikeSerialNumber: bikeSerialNumber.trim(),
      chassisNumber: chassisNumber.trim(),
      batteryNumber1: batteryNumber1.trim(),
      batteryNumber2: batteryNumber2.trim() || undefined,
      chargerNumber: chargerNumber.trim() || undefined,
      adminNotes,
    };

    setLoading(true);
    try {
      const payload = {
        action: 'approve',
        ...allocated,
      };

      const res = await fetch(`/api/admin/loans/${loan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onApproveSuccess(allocated);
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        const blockerText = Array.isArray(data.blockers) ? `: ${data.blockers.join('; ')}` : '';
        setError(`${data.error || 'The loan could not be approved'}${blockerText}`);
      }
    } catch {
      setError('Network error. The loan was not changed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-neutral-150 dark:border-neutral-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Approve BNPL Financing & Allocate Assets
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Application #{String(loan.id).slice(0, 8)} • {applicantName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Summary Pill */}
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-neutral-400">Financed Bike:</span>
              <div className="font-semibold text-neutral-900 dark:text-white truncate">
                {loan.bikeName || loan.bike?.name || 'Dando E-Bike'}
              </div>
            </div>
            <div>
              <span className="text-neutral-400">Total Financed:</span>
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatNaira(loan.totalRepayable || loan.totalAmount || loan.loanAmount || 0)}
              </div>
            </div>
            <div>
              <span className="text-neutral-400">Tenure:</span>
              <div className="font-semibold text-neutral-900 dark:text-white">
                {loan.tenure} Months
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Physical Hardware Identification
              </div>
              <button
                type="button"
                onClick={handleAutoAssignSerials}
                className="px-2.5 py-1 rounded-lg bg-[#006b5b]/10 hover:bg-[#006b5b]/20 text-[#006b5b] text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Zap className="w-3 h-3" /> Auto-Assign Available Hub Serials
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Bike Serial Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. DAN-2026-X5-0041"
                  value={bikeSerialNumber}
                  onChange={(e) => setBikeSerialNumber(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Chassis / Frame Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CH-884920419"
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-500" /> Primary Battery Serial <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BATT-48V25AH-0192"
                  value={batteryNumber1}
                  onChange={(e) => setBatteryNumber1(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-neutral-400" /> Secondary Battery (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BATT-48V25AH-0193"
                  value={batteryNumber2}
                  onChange={(e) => setBatteryNumber2(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Fast Charger Serial (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. CHG-54V2A-994"
                value={chargerNumber}
                onChange={(e) => setChargerNumber(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Operational Notes / Dispatch Instructions
              </label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
            <strong>⚠️ Dispatch Impact:</strong> Approving will generate the legal repayment schedule, lock the assigned inventory, and notify the customer via SMS &amp; Email that their bike is ready for delivery.
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/3 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Allocating &amp; Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirm Allocation &amp; Approve
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

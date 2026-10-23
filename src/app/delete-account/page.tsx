'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft, Trash2, Mail, Lock } from 'lucide-react';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      setErrorMessage('Please provide your registered email address or phone number.');
      return;
    }
    if (!confirmed) {
      setErrorMessage('Please confirm that you understand the permanent nature of this request.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setStatus('submitted');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please email privacy@dandoev.com directly.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 py-4">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-white tracking-tight flex items-center gap-1">
            Dando<span className="text-emerald-400">Ev</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Back to DandoEv Home
        </Link>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm space-y-8">
          {/* Header Banner */}
          <div className="border-b border-white/10 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold tracking-wider uppercase mb-3">
              <Trash2 size={12} /> Google Play Data Safety Compliance
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
              Request Account &amp; Data Deletion
            </h1>
            <p className="text-slate-400 text-sm">
              App: <strong className="text-white">DandoEv Commercial E-Bike Platform</strong> • Package:{' '}
              <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-xs">
                com.dandoev.mobile
              </code>
            </p>
          </div>

          {/* Policy Disclosure Box */}
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-5 rounded-xl border border-white/5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-400" /> What happens when you delete your account?
            </h2>
            <div className="space-y-2 text-xs sm:text-sm">
              <p>
                Under the Nigeria Data Protection Act (NDPA) and Google Play User Data policies, you have the right to request the permanent deletion of your DandoEv account and associated data.
              </p>
              <div className="pt-2 grid sm:grid-cols-2 gap-3">
                <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg">
                  <h3 className="font-semibold text-rose-300 mb-1">Data that WILL be deleted:</h3>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                    <li>Account profile &amp; login credentials</li>
                    <li>Uploaded identity documents (KYC slips, photos)</li>
                    <li>Device push tokens &amp; telemetry logs</li>
                    <li>Marketing subscriptions &amp; preferences</li>
                  </ul>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg">
                  <h3 className="font-semibold text-amber-300 mb-1">Data retained for regulatory compliance:</h3>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                    <li>Active BNPL lease contracts &amp; repayment records</li>
                    <li>CBN Anti-Money Laundering (AML) audit ledgers</li>
                    <li>Asset tracking records for unliquidated e-bikes</li>
                  </ul>
                </div>
              </div>

              <p className="text-xs text-slate-400 pt-2">
                * Note: If you have an active financing lease with an outstanding balance, full account closure cannot be completed until the asset balance is liquidated or settled.
              </p>
            </div>
          </div>

          {/* Form State or Success Message */}
          {status === 'submitted' ? (
            <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Deletion Request Received</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                We have logged your request. A confirmation email and SMS will be sent to verify your identity. All eligible personal data will be purged within <strong>30 days</strong>.
              </p>
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-base font-bold text-white">Submit Deletion Request</h2>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. solomon.dunu@example.com"
                    className="w-full bg-slate-800/80 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Phone Number (optional if email provided)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +2348012345678"
                  className="w-full bg-slate-800/80 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for leaving (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Tell us why you would like to delete your account..."
                  className="w-full bg-slate-800/80 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 transition-colors"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 rounded bg-slate-800 border-white/20 text-rose-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 leading-normal">
                    I understand that deleting my account is irreversible and removes my saved wallet, KYC records, and credit history from the DandoEv mobile app.
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  {status === 'submitting' ? 'Submitting Request...' : 'Submit Permanent Deletion Request'}
                </button>
              </div>

              <p className="text-center text-xs text-slate-500 pt-2">
                Need immediate help? Contact our Data Protection Officer directly at{' '}
                <a href="mailto:privacy@dandoev.com" className="text-emerald-400 underline">
                  privacy@dandoev.com
                </a>{' '}
                or{' '}
                <a href="mailto:contactdandoev@gmail.com" className="text-emerald-400 underline">
                  contactdandoev@gmail.com
                </a>.
              </p>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <p>© 2026 DandoEv Limited. All rights reserved. • Package: com.dandoev.mobile</p>
      </footer>
    </div>
  );
}

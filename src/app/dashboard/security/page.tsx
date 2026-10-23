'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import {
  ShieldCheck,
  Smartphone,
  Fingerprint,
  Download,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';

export default function SecurityPrivacyPage() {
  // MFA States
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Passkey & Toast State
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Compliance & Export States
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [erasureModalOpen, setErasureModalOpen] = useState(false);
  const [isRequestingErasure, setIsRequestingErasure] = useState(false);
  const [erasureFeedback, setErasureFeedback] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Copy helper
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      showToast('Copied secret key to clipboard!');
    }
  };

  // 1. Initialize MFA Setup
  const handleStartMfaSetup = async () => {
    setIsLoading(true);
    setMfaError(null);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to start MFA setup');

      setMfaSecret(data.secret);
      setBackupCodes(data.backupCodes || []);
      setIsSettingUpMfa(true);
    } catch (err: any) {
      setMfaError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Confirm and Verify MFA
  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || !mfaSecret) return;

    setIsLoading(true);
    setMfaError(null);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode, secret: mfaSecret }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Verification code invalid');

      setMfaEnabled(true);
      setIsSettingUpMfa(false);
      setMfaSuccess('Multi-Factor Authentication is now active on your DandoEv account.');
    } catch (err: any) {
      setMfaError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. NDPR / GDPR Data Export
  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const res = await fetch('/api/user/compliance');
      if (!res.ok) throw new Error('Failed to retrieve compliance export');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dandoev-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      showToast('Your NDPR personal data archive has been downloaded.');
    } catch (err: any) {
      showToast(err.message || 'Export error');
    } finally {
      setIsExporting(false);
    }
  };

  // 4. NDPR / GDPR Data Erasure
  const handleRequestErasure = async () => {
    setErasureModalOpen(false);
    setIsRequestingErasure(true);
    setErasureFeedback(null);
    try {
      const res = await fetch('/api/user/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_ERASURE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erasure request failed');
      setErasureFeedback(data.message);
    } catch (err: any) {
      setErasureFeedback(`Notice: ${err.message}`);
    } finally {
      setIsRequestingErasure(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-24">
      <Navbar backHref="/dashboard" backLabel="Rider Portal" />

      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 max-w-md bg-primary text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-accent/30 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
          <span className="text-xs font-bold">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-secondary mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Security & NDPR Data Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            Account Protection & Privacy Center
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">
            Manage two-factor authentication (TOTP), biometric passkeys, and your Nigerian Data Protection Regulation (NDPR) rights.
          </p>
        </div>

        {/* Feedback Banner */}
        {mfaSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{mfaSuccess}</span>
          </div>
        )}

        {/* Section 1: Multi-Factor Authentication */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-primary">
                  Two-Factor Authentication (TOTP)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl leading-relaxed">
                  Protect your BNPL applications and compulsory savings withdrawals with an authenticator app (Google Authenticator, Authy).
                </p>
              </div>
            </div>
            <span className={`badge ${mfaEnabled ? 'badge-success' : 'badge-warning'}`}>
              {mfaEnabled ? 'Active' : 'Not Configured'}
            </span>
          </div>

          {!mfaEnabled && !isSettingUpMfa && (
            <div>
              <button
                onClick={handleStartMfaSetup}
                disabled={isLoading}
                className="px-6 py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl text-xs transition-all shadow-sm inline-flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 text-accent" />
                )}
                <span>Configure Authenticator App</span>
              </button>
            </div>
          )}

          {/* MFA Setup Wizard */}
          {isSettingUpMfa && (
            <div className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-5 animate-fade-in">
              <div>
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider">
                  Step 1: Link Your Authenticator App
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Copy this setup secret key into Google Authenticator or Authy:
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                <code className="text-xs sm:text-sm text-primary font-mono font-bold tracking-widest break-all">
                  {mfaSecret}
                </code>
                <button
                  onClick={() => copyToClipboard(mfaSecret || '')}
                  className="ml-3 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Copy secret"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Backup Codes */}
              {backupCodes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">
                    Step 2: Save Your Single-Use Recovery Codes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any code to copy it. Keep these safe in case you lose your phone.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                    {backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        onClick={() => copyToClipboard(code, idx)}
                        className="p-2 bg-slate-50 text-center font-mono text-xs font-bold text-slate-800 rounded-lg border border-slate-200 hover:border-primary cursor-pointer transition-colors"
                      >
                        {copiedIndex === idx ? 'Copied!' : code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Enter Code */}
              <form onSubmit={handleConfirmMfa} className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">
                  Step 3: Enter 6-Digit Verification Code
                </h3>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    className="w-36 px-4 py-2.5 bg-white border border-slate-300 text-primary font-mono font-bold text-center tracking-widest text-base rounded-xl focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || verifyCode.length !== 6}
                    className="px-6 py-2.5 bg-secondary hover:bg-secondary-dark disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Activate 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingUpMfa(false)}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
                {mfaError && (
                  <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {mfaError}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Section 2: Biometric Passkey Logins */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 bg-teal-50 text-secondary rounded-2xl flex items-center justify-center shrink-0">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-primary">
                  Biometric Passkey Login (WebAuthn)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use Face ID, Touch ID, or Windows Hello for instant passwordless sign-in.
                </p>
              </div>
            </div>
            <span className={`badge ${passkeyRegistered ? 'badge-success' : 'badge-default'}`}>
              {passkeyRegistered ? 'Device Enrolled' : 'Ready to Register'}
            </span>
          </div>

          <div>
            <button
              onClick={() => {
                setPasskeyRegistered(true);
                showToast('Biometric Passkey enrolled for this device!');
              }}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-primary font-bold rounded-xl text-xs transition-all inline-flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-secondary" />
              <span>
                {passkeyRegistered ? 'Re-Enroll Device Passkey' : 'Register Biometric Passkey'}
              </span>
            </button>
          </div>
        </div>

        {/* Section 3: NDPR & GDPR Privacy & Data Governance */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-primary">
              NDPR &amp; Data Privacy Rights
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Under the Nigeria Data Protection Regulation (NDPR), you have full transparency and portability over your personal, KYC, and credit records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Download className="w-4 h-4 text-secondary" />
                  <span>Right to Data Portability</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Download a complete JSON package containing your profile, BNPL loan ledger, and compulsory savings history.
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-primary text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-secondary" />
                )}
                <span>{isExporting ? 'Preparing Archive...' : 'Download My Data (JSON)'}</span>
              </button>
            </div>

            {/* Erasure */}
            <div className="p-5 bg-rose-50/50 border border-rose-200/70 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Right to Erasure (Account Scrub)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Request cryptographic scrubbing of your personal PII. Active BNPL loans retain statutory CBN audit logs until settled.
                </p>
              </div>
              <div>
                <button
                  onClick={() => setErasureModalOpen(true)}
                  disabled={isRequestingErasure}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isRequestingErasure ? 'Submitting Request...' : 'Request Data Erasure'}</span>
                </button>
                {erasureFeedback && (
                  <p className="text-[11px] font-semibold text-rose-700 mt-2">{erasureFeedback}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Erasure Confirmation Modal */}
      {erasureModalOpen && (
        <div className="modal-overlay" onClick={() => setErasureModalOpen(false)}>
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-900">Request NDPR Data Erasure?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to submit a Right-to-Erasure request? Please note that if you have an active BNPL loan, statutory financial retention rules under CBN guidelines require keeping loan ledger records until the balance is settled.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setErasureModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestErasure}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                Confirm Erasure Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

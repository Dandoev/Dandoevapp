'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Zap, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const ADMIN_ROLES = [
  'super_admin',
  'finance_admin',
  'compliance_officer',
  'operations_admin',
  'credit_underwriter',
  'fleet_manager',
  'collections_agent',
];

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  // Only allow redirects back into the admin area (prevents open redirects)
  const destination =
    redirectParam && redirectParam.startsWith('/admin') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/admin';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Enter your email address and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.accessToken) {
        setError(res.status === 429 ? 'Too many attempts. Try again shortly.' : 'Invalid email or password.');
        return;
      }

      if (!ADMIN_ROLES.includes(data.user?.role)) {
        // Not a staff account: drop the session cookies the API just set
        await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
        document.cookie = 'token=; path=/; max-age=0';
        document.cookie = 'sb-access-token=; path=/; max-age=0';
        setError('This account does not have admin access.');
        return;
      }

      try {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {}

      window.location.href = destination;
    } catch {
      setError('Unable to sign in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10 font-sans"
      style={{ background: 'radial-gradient(ellipse at top left, #0b1e4f 0%, #04091a 60%, #020510 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_24px_rgba(38,254,220,0.3)]">
            <Zap className="w-5 h-5 text-[#00201a]" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-white">{APP_NAME}</div>
            <div className="text-xs text-slate-400">Admin Dashboard</div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl p-8 space-y-5"
          autoComplete="on"
        >
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-extrabold">Staff sign in</h1>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Email address</span>
            <div className="relative mt-1.5">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="you@dandoev.com"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <div className="relative mt-1.5">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0A154F] text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Authorised personnel only. Activity is logged.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';
import {
  Bike,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  UserCheck,
  Zap,
} from 'lucide-react';

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [step, setStep] = useState<1 | 2>(1);
  const [riderType, setRiderType] = useState<'dispatch' | 'commuter'>('dispatch');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendNotice, setResendNotice] = useState('');

  const updateForm = (field: string, value: string) => {
    setError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Password strength score (0-4)
  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score++;
    return score;
  })();

  const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-slate-200',
    'bg-rose-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-emerald-600',
  ];

  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Please enter your first and last name as shown on your BVN.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10 or 11-digit Nigerian phone number.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (form.otp.length < 6) {
      setError('Please enter the 6-digit verification code (or click Autofill Demo OTP).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          riderType,
        }),
      });

      if (res.ok) {
        router.push(redirectTo);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'We could not create your account. Please try again.');
      }
    } catch {
      setError('We could not reach the signup service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col lg:flex-row">
      {/* Left Brand & Trust Showcase */}
      <div className="hidden lg:flex lg:w-5/12 bg-linear-to-br from-[#021064] via-[#061a80] to-[#004d40] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#26fedc]/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt={APP_NAME}
              className="h-9 w-auto brightness-0 invert"
            />
          </Link>

          <div className="mt-14 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#26fedc] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>3-Minute Pay-As-You-Ride Onboarding</span>
            </span>
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
              Own Your Electric Bike While Eliminating Petrol Costs.
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Join thousands of commercial delivery riders and daily commuters across Nigeria saving over ₦115,000 every month on fuel and maintenance.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {[
              {
                title: '100% Returnable Security Deposit',
                desc: 'Your 10% security deposit + ₦1,000/day compulsory savings are refunded in full upon loan completion.',
              },
              {
                title: 'Instant Mono BVN & Income Verification',
                desc: 'No physical paperwork. Link your bank account in 30 seconds for instant BNPL approval.',
              },
              {
                title: 'Free GPS Telemetry & Theft Insurance',
                desc: 'Every financed e-bike includes 24/7 GPS tracking and comprehensive fire/theft coverage.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-2xl bg-white/8 border border-white/12 flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-[#26fedc] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-extrabold text-white">{item.title}</div>
                  <div className="text-xs text-white/75 mt-0.5 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#26fedc]" /> NDPR & CBN Compliant
          </span>
          <span>Lagos · Abuja · Ibadan</span>
        </div>
      </div>

      {/* Right Onboarding Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden inline-flex items-center gap-2">
            <img src="/logo.png" alt={APP_NAME} className="h-8 w-auto" />
          </Link>
          <div className="ml-auto text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-extrabold text-primary hover:underline">
              Sign In →
            </Link>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto my-8">
          {/* Progress Pill */}
          <div className="flex items-center gap-2 mb-6">
            <div
              className={`h-1.5 flex-1 rounded-full transition-all ${
                step >= 1 ? 'bg-primary' : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full transition-all ${
                step === 2 ? 'bg-secondary' : 'bg-slate-200'
              }`}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 ml-2">
              Step {step} of 2
            </span>
          </div>

          {step === 1 ? (
            <form onSubmit={handleProceedToOtp} className="space-y-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                  Create Your Rider Account
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Select your rider profile to personalize your BNPL installment options.
                </p>
              </div>

              {/* Rider Persona Switcher */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRiderType('dispatch')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    riderType === 'dispatch'
                      ? 'bg-teal-50/70 border-secondary ring-2 ring-secondary/15'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Zap
                      size={16}
                      className={riderType === 'dispatch' ? 'text-secondary' : 'text-slate-400'}
                    />
                    {riderType === 'dispatch' && (
                      <span className="text-[10px] font-extrabold uppercase text-secondary">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-extrabold text-primary">Commercial Rider</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Bolt, Chowdeck, Glovo, Logistics
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRiderType('commuter')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    riderType === 'commuter'
                      ? 'bg-teal-50/70 border-secondary ring-2 ring-secondary/15'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Briefcase
                      size={16}
                      className={riderType === 'commuter' ? 'text-secondary' : 'text-slate-400'}
                    />
                    {riderType === 'commuter' && (
                      <span className="text-[10px] font-extrabold uppercase text-secondary">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-extrabold text-primary">Personal Commuter</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Salary Earner, Civil Servant, SME
                  </div>
                </button>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {error}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      First Name (per BVN) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Solomon"
                      value={form.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dunu"
                      value={form.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="solomon@example.com"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nigerian Phone Number *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-slate-500">
                      🇳🇬 +234
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="8031234567"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="w-full pl-20 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Create Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters"
                      value={form.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {form.password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`h-1 rounded-full transition-all ${
                              passwordStrength >= bar
                                ? strengthColors[passwordStrength]
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 flex justify-between">
                        <span>Password strength: {strengthLabels[passwordStrength]}</span>
                        <span>8+ chars</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={(e) => updateForm('confirmPassword', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Continue to Phone Verification</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Smartphone size={28} />
                </div>
                <h1 className="text-2xl font-black text-primary">Verify Your Phone Number</h1>
                <p className="text-xs text-slate-500">
                  We sent a 6-digit SMS verification code to{' '}
                  <strong className="text-slate-900">+234 {form.phone}</strong>
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {error}
                </div>
              )}

              {resendNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
                  {resendNotice}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700">6-Digit OTP Code</label>
                    <button
                      type="button"
                      onClick={() => updateForm('otp', '123456')}
                      className="text-[11px] font-extrabold text-secondary hover:underline"
                    >
                      ⚡ Autofill Demo OTP (123456)
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={form.otp}
                    onChange={(e) => updateForm('otp', e.target.value.replace(/\D/g, ''))}
                    className="w-full py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center text-2xl font-black tracking-[0.5em] text-primary focus:bg-white focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  className="w-full py-3.5 bg-primary hover:bg-primary-light disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <UserCheck size={16} />
                  <span>{loading ? 'Creating Rider Account...' : 'Verify & Complete Registration'}</span>
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="font-bold text-slate-500 hover:text-primary inline-flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateForm('otp', '123456');
                      setResendNotice('Fresh OTP code (123456) dispatched and autofilled!');
                    }}
                    className="font-bold text-secondary hover:underline"
                  >
                    Resend SMS Code
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-4">
          <Link href="/bikes" className="hover:text-slate-600">
            Marketplace
          </Link>
          <span>•</span>
          <Link href="/checkout/bnpl" className="hover:text-slate-600">
            3-Min BNPL Calculator
          </Link>
          <span>•</span>
          <span>NDPR Protected</span>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-primary font-bold">
          Loading...
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}

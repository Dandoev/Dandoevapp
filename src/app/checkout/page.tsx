'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { formatNaira, calculateInstallment } from '@/lib/utils';
import { PAYMENT_METHODS, NIGERIAN_STATES, BNPL_CONFIG } from '@/lib/constants';
import {
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Truck,
  Building2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Battery,
} from 'lucide-react';

interface CheckoutBike {
  id: string;
  name: string;
  category: string;
  price: number | string;
  images?: string[];
}

interface CheckoutAccessory {
  id: string;
  name: string;
  price: number | string;
  quantity: number;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bikeId = searchParams.get('bikeId');

  const [bike, setBike] = useState<CheckoutBike | null>(null);
  const [checkoutAccessories, setCheckoutAccessories] = useState<CheckoutAccessory[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'home'>('home');
  const [buyer, setBuyer] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [delivery, setDelivery] = useState({ address: '', city: 'Ikeja', state: 'Lagos' });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const accessoriesParam = searchParams.get('accessories');
    const accessoryIds = accessoriesParam ? accessoriesParam.split(',').filter(Boolean) : [];

    if (!bikeId && accessoryIds.length === 0) {
      setPageError('No items selected for checkout.');
      setPageLoading(false);
      return;
    }

    async function fetchData() {
      try {
        if (bikeId) {
          const res = await fetch(`/api/bikes/${bikeId}`);
          const data = await res.json();
          if (data.success) {
            setBike(data.data);
          } else {
            setPageError('Bike not found');
            return;
          }
        }

        if (accessoryIds.length > 0) {
          const res = await fetch('/api/accessories');
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const allAccs = data.data as CheckoutAccessory[];
            const matchedAccs = accessoryIds
              .map((id) => {
                const found = allAccs.find((a) => a.id === id);
                return found ? { ...found, quantity: 1 } : null;
              })
              .filter((accessory): accessory is CheckoutAccessory => accessory !== null);
            setCheckoutAccessories(matchedAccs);
          }
        }
      } catch {
        setPageError('Network error loading checkout items');
      } finally {
        setPageLoading(false);
      }
    }
    fetchData();
  }, [bikeId, searchParams]);

  const uB = (field: string, value: string) => setBuyer((prev) => ({ ...prev, [field]: value }));
  const uD = (field: string, value: string) => setDelivery((prev) => ({ ...prev, [field]: value }));

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (pageError || (!bike && checkoutAccessories.length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar backHref="/bikes" backLabel="Marketplace" />
        <div className="max-w-md mx-auto text-center py-20 px-6">
          <h2 className="text-xl font-bold text-primary mb-2">
            {pageError || 'No items selected'}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Select an electric bike or genuine 60V accessory to proceed to checkout.
          </p>
          <Link href="/bikes" className="btn btn-primary btn-sm">
            Browse E-Bikes
          </Link>
        </div>
      </div>
    );
  }

  const bikePrice = bike ? Number(bike.price) : 0;
  const accessoriesPrice = checkoutAccessories.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
  const subtotal = bikePrice + accessoriesPrice;

  const deliveryFee =
    deliveryType === 'pickup'
      ? 0
      : delivery.state === 'Lagos'
      ? 20000
      : delivery.state
      ? 50000
      : 0;
  const total = subtotal + deliveryFee;

  const step1Valid = Boolean(
    buyer.firstName.trim() &&
      buyer.lastName.trim() &&
      buyer.email.trim() &&
      buyer.phone.trim() &&
      (deliveryType === 'pickup' || (delivery.address.trim() && delivery.city.trim() && delivery.state))
  );

  const bnplPreview = bike
    ? calculateInstallment(subtotal, BNPL_CONFIG.interestRate, BNPL_CONFIG.defaultTenure)
    : null;

  const handlePayNow = async () => {
    setLoading(true);
    setSubmitError('');
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      let currentOrderId = orderId;
      if (!currentOrderId) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            bikeId: bike ? bike.id : undefined,
            quantity: 1,
            paymentMethod,
            deliveryType: deliveryType === 'pickup' ? 'pickup' :
              delivery.state === 'Lagos' ? 'delivery_lagos' : 'delivery_outside',
            deliveryAddress: deliveryType === 'home' ? delivery.address : 'Pickup Hub (Ikeja)',
            deliveryCity: deliveryType === 'home' ? delivery.city : 'Ikeja',
            deliveryState: deliveryType === 'home' ? delivery.state : 'Lagos',
            deliveryPhone: buyer.phone,
            accessories: checkoutAccessories.map((a) => ({ id: a.id, quantity: a.quantity })),
            notes: `Direct purchase. Total items: ${checkoutAccessories.length + (bike ? 1 : 0)}`,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.orderId) {
          throw new Error(data.error || 'Could not create your order');
        }
        currentOrderId = data.orderId;
        setOrderId(currentOrderId);
      }

      const payload = {
        email: buyer.email,
        amount: total,
        orderId: currentOrderId,
        provider: 'mono',
        reference: `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        metadata: {
          orderId: currentOrderId,
          bikeId: bike ? bike.id : undefined,
          buyer,
          delivery,
          provider: 'mono',
        },
      };
      const payRes = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const payData = await payRes.json();
      if (!payRes.ok || !(payData.data?.authorizationUrl || payData.authorizationUrl)) {
        throw new Error(payData.error || 'Could not start payment');
      }
      window.location.href = payData.data?.authorizationUrl || payData.authorizationUrl;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not start payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-24">
      <Navbar
        backHref={bike ? `/bikes/${bike.id}` : '/accessories'}
        backLabel={bike ? 'Back to Bike' : 'Accessories'}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Checkout Form Steps */}
          <div className="lg:col-span-7">
            {step === 1 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-secondary">
                    Step 1 of 2 · Outright Cash Purchase
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-primary mt-0.5">
                    Buyer &amp; Delivery Information
                  </h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">First Name *</label>
                    <input
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                      placeholder="Solomon"
                      value={buyer.firstName}
                      onChange={(e) => uB('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Last Name *</label>
                    <input
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                      placeholder="Dunu"
                      value={buyer.lastName}
                      onChange={(e) => uB('lastName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Email Address *</label>
                    <input
                      type="email"
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                      placeholder="you@example.com"
                      value={buyer.email}
                      onChange={(e) => uB('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Phone Number *</label>
                    <input
                      type="tel"
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                      placeholder="0803 123 4567"
                      value={buyer.phone}
                      onChange={(e) => uB('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                    Fulfillment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('home')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        deliveryType === 'home'
                          ? 'border-primary bg-primary/5 shadow-2xs'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-slate-900">Doorstep Delivery</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Dispatched directly to your address
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        deliveryType === 'pickup'
                          ? 'border-primary bg-primary/5 shadow-2xs'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          Lagos Hub Pickup (Free)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Collect ready-to-ride from Ikeja Hub
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {deliveryType === 'home' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Street Address *</label>
                      <input
                        className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                        placeholder="12 Admiralty Way, Lekki Phase 1"
                        value={delivery.address}
                        onChange={(e) => uD('address', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700">City *</label>
                        <input
                          className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                          placeholder="Ikeja"
                          value={delivery.city}
                          onChange={(e) => uD('city', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">State *</label>
                        <select
                          className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none cursor-pointer"
                          value={delivery.state}
                          onChange={(e) => uD('state', e.target.value)}
                        >
                          <option value="">Select State</option>
                          {NIGERIAN_STATES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="w-full py-4 rounded-xl bg-primary hover:bg-primary-light disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Continue to Payment Method</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : step === 2 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-secondary">
                      Step 2 of 2
                    </span>
                    <h2 className="text-xl font-black text-primary mt-0.5">
                      Select Payment Channel
                    </h2>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    ← Edit Delivery
                  </button>
                </div>

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {PAYMENT_METHODS.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                        paymentMethod === m.id
                          ? 'border-primary bg-primary/5 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="w-4 h-4 accent-primary"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.description}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handlePayNow}
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-accent hover:brightness-95 text-primary-dark font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initializing Secure Mono DirectPay...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Payment ({formatNaira(total)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center shadow-xl space-y-5 animate-scale-in">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-secondary">
                    Order #{orderId || 'ORD-10294'}
                  </span>
                  <h2 className="text-2xl font-black text-primary mt-1">
                    Order Confirmed &amp; Queued for Dispatch!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">
                    Your receipt and Lagos Hub collection/dispatch code have been sent to{' '}
                    <strong>{buyer.email}</strong>.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <Link
                    href="/dashboard"
                    className="px-6 py-3.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md"
                  >
                    Open Rider Dashboard →
                  </Link>
                  <Link
                    href="/bikes"
                    className="px-5 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    Back to Marketplace
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Order Summary & BNPL Switcher */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs sticky top-24 space-y-5">
              <h3 className="font-extrabold text-primary text-base border-b border-slate-100 pb-3">
                Order Summary
              </h3>

              {bike && (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-surface-container-low border border-slate-200 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={bike.images?.[0] || '/bikes/DandoEV_X6.jpg'}
                      alt={bike.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm text-primary">{bike.name}</div>
                    <div className="text-xs text-slate-500">{bike.category}</div>
                    <div className="font-black text-sm text-secondary mt-1 tabular-nums">
                      {formatNaira(Number(bike.price))}
                    </div>
                  </div>
                </div>
              )}

              {checkoutAccessories.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Bundled Accessories ({checkoutAccessories.length})
                  </div>
                  {checkoutAccessories.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary">
                          <Battery size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{acc.name}</div>
                          <div className="text-[10px] text-slate-400">Qty: {acc.quantity}</div>
                        </div>
                      </div>
                      <div className="font-extrabold text-primary tabular-nums">
                        {formatNaira(Number(acc.price))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatNaira(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Delivery ({deliveryType === 'pickup' ? 'Ikeja Hub Pickup' : delivery.state})
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-900 text-sm">Total Due Today</span>
                  <span className="font-black text-primary text-xl tabular-nums">
                    {formatNaira(total)}
                  </span>
                </div>
              </div>

              {/* Switch to BNPL Upsell Banner */}
              {bike && bnplPreview && (
                <div className="p-4 rounded-2xl bg-teal-50/90 border border-teal-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-secondary">
                    <Sparkles size={14} />
                    <span>Prefer to Keep Your Cash?</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Finance this order with <strong>0% down payment</strong> and pay just{' '}
                    <strong className="text-primary">
                      {formatNaira(bnplPreview.installmentAmount)} / every 2 days
                    </strong>{' '}
                    while building compulsory savings.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/checkout/bnpl?bikeId=${bike.id}`)}
                    className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-light transition-all"
                  >
                    Switch to 3-Min BNPL Financing →
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-secondary shrink-0 mt-0.5" />
                <span>
                  256-bit encrypted checkout via Paystack. Includes 1-year DandoEv motor &amp; battery warranty.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 size={48} className="animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

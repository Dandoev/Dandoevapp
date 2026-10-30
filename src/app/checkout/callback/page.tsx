'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, ReceiptText } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { formatNaira } from '@/lib/utils';

type VerifyState = 'verifying' | 'success' | 'failed';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const [state, setState] = useState<VerifyState>('verifying');
  const [txData, setTxData] = useState<{
    amount?: number;
    reference?: string;
    paidAt?: string;
    channel?: string;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reference) {
      setError('No payment reference found in the callback URL.');
      setState('failed');
      return;
    }


    async function verifyPayment() {
      try {
        const token =
          document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.split('=')[1] ||
          document.cookie
            .split('; ')
            .find(row => row.startsWith('sb-access-token='))
            ?.split('=')[1];

        const res = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference!)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await res.json();

        if (res.ok && data.data?.status === 'success') {
          setTxData(data.data);
          setState('success');
          // Auto-redirect to dashboard after 5 seconds
          setTimeout(() => router.push('/dashboard'), 5000);
        } else {
          setError(data.error || `Payment status: ${data.data?.status || 'unknown'}`);
          setState('failed');
        }
      } catch (err: any) {
        setError('Network error while verifying payment. Please check your dashboard.');
        setState('failed');
      }
    }

    verifyPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {/* Brand */}
      <div style={{ marginBottom: '2rem' }}>
        <img src="/logo.png" alt={APP_NAME} style={{ height: '40px', width: 'auto' }} />
      </div>

      <div className="card card-elevated animate-scale-in" style={{ maxWidth: '480px', width: '100%', padding: 'var(--space-8)', borderRadius: 'var(--radius-2xl)', textAlign: 'center' }}>
        {/* ---- Verifying ---- */}
        {state === 'verifying' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
              <Loader2 size={56} className="animate-spin" />
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '0.5rem' }}>Verifying Payment</h1>
            <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>
              Please wait while we confirm your payment with Mono DirectPay…
            </p>
            {reference && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                Ref: <strong>{reference}</strong>
              </div>
            )}
          </>
        )}

        {/* ---- Success ---- */}
        {state === 'success' && (
          <>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 1.5rem',
              background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 12px rgba(46,204,113,0.08)',
            }}>
              <CheckCircle2 size={52} color="var(--success)" strokeWidth={2.5} />
            </div>

            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: '0.5rem' }}>Payment Successful!</h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: 'var(--text-sm)' }}>
              Your payment has been confirmed. Your order is now being processed.
            </p>

            {txData && (
              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  <ReceiptText size={16} color="var(--primary)" /> Payment Receipt
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--text-sm)' }}>
                  {txData.amount !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Amount Paid</span>
                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatNaira(txData.amount)}</span>
                    </div>
                  )}
                  {txData.channel && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Payment Method</span>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{txData.channel}</span>
                    </div>
                  )}
                  {txData.reference && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Reference</span>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)', fontFamily: 'monospace' }}>{txData.reference}</span>
                    </div>
                  )}
                  {txData.paidAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Date</span>
                      <span style={{ fontWeight: 600 }}>{new Date(txData.paidAt).toLocaleString('en-NG')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginBottom: '1.5rem' }}>
              Redirecting to your dashboard in 5 seconds…
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/dashboard" className="btn btn-primary btn-full">Go to Dashboard</Link>
              <Link href="/bikes" className="btn btn-outline btn-full">Continue Browsing</Link>
            </div>
          </>
        )}

        {/* ---- Failed ---- */}
        {state === 'failed' && (
          <>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 1.5rem',
              background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 12px rgba(239,68,68,0.06)',
            }}>
              <XCircle size={52} color="#B91C1C" strokeWidth={2.5} />
            </div>

            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '0.5rem', color: '#B91C1C' }}>Payment Failed</h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: '1rem', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              We could not confirm your payment. No money has been charged.<br />Please try again or use a different payment method.
            </p>

            {error && (
              <div style={{ padding: '0.75rem', background: '#FEE2E2', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-xs)', color: '#B91C1C', marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            {reference && (
              <div style={{ padding: '0.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginBottom: '1.5rem' }}>
                Reference: <strong>{reference}</strong>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/checkout" className="btn btn-primary btn-full">Try Again</Link>
              <Link href="/dashboard" className="btn btn-outline btn-full">Go to Dashboard</Link>
            </div>
          </>
        )}
      </div>

      {/* Help text */}
      <p style={{ marginTop: '1.5rem', fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
        Need help? Contact support at <a href="mailto:support@dandoev.com" style={{ color: 'var(--primary)' }}>support@dandoev.com</a>
      </p>
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}

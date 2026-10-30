'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function ReturnToApp() {
  const search = useSearchParams();
  const reference = search.get('reference');
  const status = search.get('status');
  const params = new URLSearchParams();
  if (reference) params.set('reference', reference);
  if (status) params.set('status', status);
  const appUrl = `dandoev://payment-callback?${params.toString()}`;
  useEffect(() => { if (reference) window.location.href = appUrl; }, [appUrl, reference]);
  return <main style={{ minHeight: '100vh', background: '#F5F9FB', color: '#102152', display: 'grid', placeItems: 'center', padding: 24 }}><div style={{ maxWidth: 380, textAlign: 'center' }}><h1>Return to DandoEv</h1><p>Your payment is being checked in the app. The order is confirmed only after verification.</p>{reference ? <a href={appUrl} style={{ color: '#117F78', fontWeight: 700 }}>Open DandoEv app</a> : <p>Payment reference is missing. Open the app and check your order status.</p>}</div></main>;
}

export default function MobileReturnPage() {
  return <Suspense fallback={<main style={{ padding: 24 }}>Returning to DandoEv…</main>}><ReturnToApp /></Suspense>;
}

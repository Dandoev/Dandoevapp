"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function ReturnToApp() {
  const search = useSearchParams();
  const params = new URLSearchParams();
  for (const key of ["code", "status", "reference", "ref", "error", "message"]) {
    const value = search.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  const appUrl = `dandoev://mono-connect-callback${query ? `?${query}` : ""}`;
  useEffect(() => { window.location.href = appUrl; }, [appUrl]);
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "#0A154F" }}>
    <div style={{ maxWidth: 380, textAlign: "center" }}>
      <h1>Return to DandoEv</h1>
      <p>We are confirming your bank connection and preparing your statement.</p>
      <a href={appUrl}>Open DandoEv app</a>
    </div>
  </main>;
}

export default function MonoConnectMobileReturn() {
  return <Suspense fallback={<main>Returning to DandoEv…</main>}><ReturnToApp /></Suspense>;
}

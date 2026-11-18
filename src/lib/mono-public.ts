// ============================================================
// DandoEv — Mono Connect public key (client-safe)
// Sandbox is disabled: only live_pk_ keys are ever handed to the
// Mono Connect widget. A test_pk_ value is rejected so a misconfigured
// build fails loudly instead of linking riders to sandbox banks.
// ============================================================

export function getMonoConnectPublicKey(): string | null {
  const key = (process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY || "").trim();
  if (/^live_pk_/.test(key)) return key;
  if (key && typeof console !== "undefined") {
    console.error(
      "[Mono] NEXT_PUBLIC_MONO_PUBLIC_KEY is not a live_pk_ key. Sandbox is disabled; Mono Connect will not open.",
    );
  }
  return null;
}

// ============================================================
// DandoEv — Environment & Runtime Utilities
// Ensures strict separation between production and development/demo modes.
// ============================================================

/**
 * Returns true only when demo tokens and simulated accounts are allowed.
 * Demo mode is opt-in. A development environment must not silently show
 * seeded users or fake dashboard figures when the real database is empty or
 * unavailable.
 */
export function isDemoAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Helper to ensure a feature is only active in non-production.
 */
export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

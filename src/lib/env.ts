// ============================================================
// DandoEv — Environment & Runtime Utilities
// Ensures strict separation between production and development/demo modes.
// ============================================================

/**
 * Returns true only when demo tokens and simulated accounts are allowed.
 * Hard-disabled in production unless explicitly opted in with both
 * NODE_ENV !== 'production' OR an explicit DEMO_MODE="true" override in non-prod.
 */
export function isDemoAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    // In production, demo credentials and token bypasses are strictly forbidden
    return false;
  }

  return (
    process.env.DEMO_MODE === 'true' ||
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Helper to ensure a feature is only active in non-production.
 */
export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

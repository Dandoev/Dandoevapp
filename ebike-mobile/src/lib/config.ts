// ============================================================
// DandoEv Mobile — Centralized Dynamic Configuration
// Single source of truth: All URLs & keys are read dynamically
// from environment variables (EXPO_PUBLIC_*) with NO hardcoded domains.
// ============================================================

export const APP_CONFIG = {
  /**
   * Base Backend URL without trailing slash or /api suffix.
   * Dynamically resolved from EXPO_PUBLIC_API_URL (set in .env or eas.json).
   */
  get apiBaseUrl(): string {
    const raw = process.env.EXPO_PUBLIC_API_URL || '';
    return raw.replace(/\/+$/, '').replace(/\/api$/, '');
  },

  /**
   * Complete API prefix URL (e.g. https://.../api).
   */
  get apiEndpoint(): string {
    const base = this.apiBaseUrl;
    return base ? `${base}/api` : '/api';
  },

  /**
   * Privacy Policy URL dynamically resolved from backend base.
   */
  get privacyPolicyUrl(): string {
    const base = this.apiBaseUrl;
    return base ? `${base}/privacy` : '/privacy';
  },

  /**
   * Terms of Service URL dynamically resolved from backend base.
   */
  get termsUrl(): string {
    const base = this.apiBaseUrl;
    return base ? `${base}/terms` : '/terms';
  },

  /**
   * Supabase Credentials resolved from EXPO_PUBLIC_* variables.
   */
  supabase: {
    get url(): string {
      return process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    },
    get anonKey(): string {
      return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    },
  },
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-dandoev.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
// Supabase's newer secret key replaces the legacy service_role key. Prefer it
// when present, but keep the legacy variable for existing deployments.
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

/**
 * Shared Supabase client for Client components and lightweight Server usage.
 * Restricted by RLS (Row Level Security) policies defined in your dashboard.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service Role client for bypass RLS in secure server-side routes (Admin/Workers).
 * USE WITH CAUTION: This client has full admin access to your DB.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServerKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

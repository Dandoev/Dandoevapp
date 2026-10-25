import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { APP_CONFIG } from './config';

const supabaseUrl = APP_CONFIG.supabase.url;
const supabaseAnonKey = APP_CONFIG.supabase.anonKey;

/**
 * Mobile Supabase Client.
 * Handles persistence via AsyncStorage automatically.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

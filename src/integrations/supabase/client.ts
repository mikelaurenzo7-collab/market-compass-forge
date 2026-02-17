import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Listen for auth state changes and dispatch session-expired event
supabase.auth.onAuthStateChange((event) => {
  if (event === "TOKEN_REFRESHED") return;
  if (event === "SIGNED_OUT") {
    window.dispatchEvent(new CustomEvent("supabase:session-expired"));
  }
});

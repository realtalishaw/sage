import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../packages/db/src/types';

/*
  The marketing site uses the same generated Supabase schema types as the shared
  DB package so browser queries stay type-safe after flattening the app to the
  marketing-site root.
*/

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Export config for direct access if needed
export const config = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};

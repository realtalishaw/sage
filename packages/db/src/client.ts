import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Get environment variable from either Node.js or browser environment
 * This helper works in both Vite (import.meta.env) and Node.js (process.env)
 */
function getEnvVar(name: string): string {
  // Try process.env first (Node.js, server-side)
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return process.env[name] as string;
  }

  // Try with VITE_ prefix for browser/Vite apps
  const viteName = `VITE_${name}`;
  if (typeof process !== 'undefined' && process.env?.[viteName]) {
    return process.env[viteName] as string;
  }

  return '';
}

// Supabase client configuration
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

let defaultClient: SupabaseClient<Database> | null = null;

/**
 * Get the default Supabase client instance
 * Lazy-initializes the client on first access
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!defaultClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase URL or Anon Key is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for Vite apps) in your environment variables.'
      );
    }

    defaultClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return defaultClient;
}

/**
 * Standard Supabase client for client-side usage
 * This client uses the anon key and respects Row Level Security (RLS)
 */
export const supabase = getSupabaseClient();

/**
 * Create a Supabase client with custom configuration
 * Useful for server-side operations or custom auth handling
 */
export function createSupabaseClient(options?: {
  url?: string;
  anonKey?: string;
  serviceRole?: boolean;
  accessToken?: string;
}) {
  const url = options?.url || supabaseUrl;
  const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  let key: string;
  if (options?.serviceRole) {
    key = serviceRoleKey;
  } else if (options?.anonKey) {
    key = options.anonKey;
  } else {
    key = supabaseAnonKey;
  }

  if (!url || !key) {
    throw new Error('Supabase URL or API Key is missing');
  }

  const client = createClient<Database>(url, key, {
    auth: {
      persistSession: !options?.serviceRole,
      autoRefreshToken: !options?.serviceRole,
    },
  });

  // If access token is provided, set it
  if (options?.accessToken) {
    client.auth.setSession({
      access_token: options.accessToken,
      refresh_token: '',
    });
  }

  return client;
}

/**
 * Export Supabase configuration for direct access if needed
 */
export const config = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};

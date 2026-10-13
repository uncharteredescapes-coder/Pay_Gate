import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable resolution supporting Vite, Next.js, and Node.js environments
export const SUPABASE_URL =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://oqzjsixkcvalnxjtexcz.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xempzaXhrY3ZhbG54anRleGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MzAzNjQsImV4cCI6MjEwNzQwNjM2NH0.dYxMspub90vP1zCMtELHrwH27LYQPLiYVWoZui6e0O0';

export const SUPABASE_SERVICE_ROLE_KEY =
  (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_KEY)) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xempzaXhrY3ZhbG54anRleGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTgzMDM2NCwiZXhwIjoyMTA3NDA2MzY0fQ.bdJJy0kw6mdaPf3bL11tsYjyUYW9z110g5-Sn0R8944';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY));
};

/**
 * Public client for client-side / browser or standard user interactions
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
});

/**
 * Service role client for server-side trusted execution (Node/Express backend, claim verifications, audit records)
 */
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Health check & diagnostic function
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  merchantsCount: number;
  devicesCount: number;
  error?: string;
}> {
  try {
    const { count: mCount, error: mError } = await supabaseAdmin
      .from('merchants')
      .select('*', { count: 'exact', head: true });

    if (mError) throw mError;

    const { count: dCount } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true });

    return {
      connected: true,
      url: SUPABASE_URL,
      merchantsCount: mCount ?? 0,
      devicesCount: dCount ?? 0,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: SUPABASE_URL,
      merchantsCount: 0,
      devicesCount: 0,
      error: err?.message || String(err),
    };
  }
}

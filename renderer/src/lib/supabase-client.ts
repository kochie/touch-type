// Browser-side Supabase client
// Note: Using createClient from @supabase/supabase-js instead of @supabase/ssr
// because @supabase/ssr uses cookies which don't work properly in Electron apps.
// The standard client uses localStorage for session persistence.
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createClient(): TypedSupabaseClient {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use localStorage for session persistence (works in Electron)
        persistSession: true,
        storageKey: 'touch-typer-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Auto-refresh tokens
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

// Singleton instance for client-side usage
let supabaseInstance: TypedSupabaseClient | null = null;

export function getSupabaseClient(): TypedSupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

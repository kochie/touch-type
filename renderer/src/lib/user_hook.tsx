"use client";

// Re-export from supabase-provider for backward compatibility
// This file is kept to maintain imports in existing components
export { useUser, useSupabase as useAuth } from "./supabase-provider";
export type { User } from "@supabase/supabase-js";

// Re-export the provider as UserProvider for backward compatibility
export { SupabaseProvider as UserProvider } from "./supabase-provider";

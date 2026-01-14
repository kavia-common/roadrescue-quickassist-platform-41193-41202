import { createClient } from "@supabase/supabase-js";
import { appConfig } from "../config/appConfig";

function assertSupabaseConfigured() {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
    );
  }
}

// Create the client once (module singleton) to preserve auth session across imports.
assertSupabaseConfigured();

/**
 * PUBLIC_INTERFACE
 */
export function isSupabaseConfigured() {
  /** Returns true when required Supabase env vars are present and non-empty. */
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
}

export const supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);

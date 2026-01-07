import { createClient } from "@supabase/supabase-js";

function getSupabaseEnv() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_KEY;
  return { url, key };
}

// PUBLIC_INTERFACE
export function isSupabaseConfigured() {
  /** Returns true when required Supabase env vars are present and non-empty. */
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}

// Create the client once (module singleton) to preserve auth session across imports.
// If env vars are missing, we return null and the app falls back to mock mode.
const { url, key } = getSupabaseEnv();
export const supabase = url && key ? createClient(url, key) : null;

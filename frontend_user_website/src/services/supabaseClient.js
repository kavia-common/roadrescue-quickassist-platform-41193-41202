import { createClient } from "@supabase/supabase-js";
import { appConfig } from "../config/appConfig";

/**
 * IMPORTANT DESIGN GOAL
 * ---------------------
 * This app must never crash at import time due to missing env vars.
 * Instead, Supabase initialization is deferred until first use.
 *
 * If configuration is missing, we:
 * - log clear errors to console
 * - expose config state via getSupabaseInitState()
 * - throw a friendly error from getSupabase() so callers can handle it
 */

let _supabase = null;

/**
 * Returns an object describing whether Supabase is configured and any config errors.
 * This is safe to call during render.
 */
function getSupabaseConfigStatus() {
  const missing = [];
  if (!appConfig.supabaseUrl) missing.push("REACT_APP_SUPABASE_URL");

  // We allow a legacy fallback in appConfig, but we still message clearly.
  if (!appConfig.supabaseAnonKey) {
    missing.push("REACT_APP_SUPABASE_ANON_KEY (or REACT_APP_SUPABASE_KEY)");
  }

  if (missing.length) {
    const message = `Supabase is not configured. Missing: ${missing.join(
      ", "
    )}. Please set these environment variables and rebuild the app.`;
    return { configured: false, missing, message };
  }

  // Lightweight sanity checks to prevent the most common “Invalid API key” confusion.
  const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(appConfig.supabaseUrl);
  const keyLooksJwt = appConfig.supabaseAnonKey.startsWith("eyJ"); // JWTs typically start with "eyJ"

  if (!urlOk || !keyLooksJwt) {
    const message =
      "Supabase configuration looks incorrect. Please verify REACT_APP_SUPABASE_URL is your project URL (https://<ref>.supabase.co) and REACT_APP_SUPABASE_ANON_KEY is your project anon/public key (a JWT string). After updating env vars, restart/rebuild the app.";
    return { configured: false, missing: [], message };
  }

  // Extra helpful validation: anon/public keys usually include payload.role === "anon".
  // If the JWT is malformed (e.g., wrong/typo claim), Supabase will reject it as an invalid API key.
  try {
    const parts = appConfig.supabaseAnonKey.split(".");
    if (parts.length >= 2) {
      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = payloadB64.padEnd(Math.ceil(payloadB64.length / 4) * 4, "=");
      const payload = JSON.parse(atob(padded));
      const role = payload?.role;

      if (role !== "anon") {
        const message =
          "Supabase configuration error: the provided key does not look like an anon/public key. " +
          "Please ensure REACT_APP_SUPABASE_ANON_KEY is the anon/public API key from Supabase (Project Settings → API → anon/public). " +
          "If you set both REACT_APP_SUPABASE_ANON_KEY and REACT_APP_SUPABASE_KEY, ensure they match (a typo/corrupted value in ANON_KEY will override KEY). " +
          "After updating env vars, restart/rebuild the app.";
        return { configured: false, missing: [], message };
      }
    }
  } catch {
    // If we can't decode, Supabase will likely reject it anyway; provide a friendly message.
    const message =
      "Supabase configuration error: the provided anon key could not be decoded as a valid JWT. " +
      "Please re-copy the anon/public key from Supabase and restart/rebuild the app.";
    return { configured: false, missing: [], message };
  }

  return { configured: true, missing: [], message: "" };
}

/**
 * Log config errors once to keep console readable.
 */
let _didLogConfigError = false;
function logSupabaseConfigErrorOnce(status) {
  if (_didLogConfigError) return;
  _didLogConfigError = true;

  // eslint-disable-next-line no-console
  console.error(
    "[Supabase Config Error]",
    status.message,
    "\nResolved values:",
    {
      REACT_APP_SUPABASE_URL: appConfig.supabaseUrl ? "(set)" : "(missing)",
      REACT_APP_SUPABASE_ANON_KEY: appConfig.supabaseAnonKey ? "(set)" : "(missing)",
    }
  );
}

/**
 * PUBLIC_INTERFACE
 */
export function getSupabaseInitState() {
  /**
   * Returns:
   * - configured: boolean
   * - missing: string[]
   * - message: string
   *
   * Does not throw. Intended for UI fallback rendering.
   */
  const status = getSupabaseConfigStatus();
  if (!status.configured) logSupabaseConfigErrorOnce(status);
  return status;
}

/**
 * PUBLIC_INTERFACE
 */
export function isSupabaseConfigured() {
  /** Returns true when required Supabase env vars are present and non-empty. */
  return getSupabaseConfigStatus().configured;
}

/**
 * PUBLIC_INTERFACE
 */
export function getSupabase() {
  /**
   * Lazily initializes and returns the Supabase client singleton.
   *
   * Throws a friendly error if config is missing so callers can display UI.
   */
  if (_supabase) return _supabase;

  const status = getSupabaseConfigStatus();
  if (!status.configured) {
    logSupabaseConfigErrorOnce(status);
    throw new Error(status.message);
  }

  _supabase = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);
  return _supabase;
}

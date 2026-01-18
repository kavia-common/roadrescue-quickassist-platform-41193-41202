/**
 * Central application configuration (build-time env).
 *
 * CRA exposes env vars prefixed with REACT_APP_.
 */

function getRequiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  return value;
}

function getFirstNonEmptyEnv(names) {
  for (const name of names) {
    const value = String(process.env[name] ?? "").trim();
    if (value) return value;
  }
  return "";
}

/**
 * PUBLIC_INTERFACE
 */
export const appConfig = {
  /**
   * Supabase URL (required).
   */
  supabaseUrl: getRequiredEnv("REACT_APP_SUPABASE_URL"),

  /**
   * Supabase anon key (required).
   *
   * Env var precedence:
   * - REACT_APP_SUPABASE_ANON_KEY (preferred)
   * - REACT_APP_SUPABASE_KEY (legacy fallback; some environments use this name for the anon key)
   *
   * NOTE: The service_role key must NEVER be used in the browser. Only anon/public key.
   */
  supabaseAnonKey: getFirstNonEmptyEnv(["REACT_APP_SUPABASE_ANON_KEY", "REACT_APP_SUPABASE_KEY"]),

  /**
   * Boot timeout in milliseconds. Prevents infinite loading if auth/session hangs.
   */
  bootTimeoutMs: (() => {
    const raw = String(process.env.REACT_APP_BOOT_TIMEOUT_MS ?? "").trim();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 15000;
  })(),
};

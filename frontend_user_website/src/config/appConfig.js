/**
 * Central application configuration (build-time env).
 *
 * CRA exposes env vars prefixed with REACT_APP_.
 */

function getRequiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  return value;
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
   */
  supabaseAnonKey: getRequiredEnv("REACT_APP_SUPABASE_KEY"),

  /**
   * Boot timeout in milliseconds. Prevents infinite loading if auth/session hangs.
   */
  bootTimeoutMs: (() => {
    const raw = String(process.env.REACT_APP_BOOT_TIMEOUT_MS ?? "").trim();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 8000;
  })(),
};

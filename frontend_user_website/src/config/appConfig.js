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

function safeDecodeJwtPayload(jwt) {
  try {
    if (!jwt || typeof jwt !== "string") return null;
    const parts = jwt.split(".");
    if (parts.length < 2) return null;

    // JWT payload is base64url encoded JSON
    const payloadB64 = parts[1];
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function isLikelySupabaseAnonKey(key) {
  // Supabase anon/public key is a JWT. We validate minimal structure + role claim.
  if (!key || typeof key !== "string") return false;
  if (!key.startsWith("eyJ")) return false;

  const payload = safeDecodeJwtPayload(key);
  // Supabase typically uses `role: "anon"` in the payload.
  return payload?.role === "anon";
}

function pickSupabaseAnonKey() {
  // Prefer REACT_APP_SUPABASE_ANON_KEY if it looks valid; otherwise fallback to REACT_APP_SUPABASE_KEY.
  const anonKey = String(process.env.REACT_APP_SUPABASE_ANON_KEY ?? "").trim();
  const legacyKey = String(process.env.REACT_APP_SUPABASE_KEY ?? "").trim();

  if (isLikelySupabaseAnonKey(anonKey)) return anonKey;
  if (isLikelySupabaseAnonKey(legacyKey)) return legacyKey;

  // If neither passes the stronger check, fallback to first non-empty to preserve existing behavior,
  // and let the UI show a clear config error.
  return anonKey || legacyKey || "";
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
  supabaseAnonKey: pickSupabaseAnonKey(),

  /**
   * Boot timeout in milliseconds. Prevents infinite loading if auth/session hangs.
   */
  bootTimeoutMs: (() => {
    const raw = String(process.env.REACT_APP_BOOT_TIMEOUT_MS ?? "").trim();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 15000;
  })(),
};

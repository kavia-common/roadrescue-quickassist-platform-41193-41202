/**
 * Central application configuration (build-time env).
 *
 * CRA exposes env vars prefixed with REACT_APP_.
 */

function parseBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/**
 * PUBLIC_INTERFACE
 */
export const appConfig = {
  /**
   * Explicit MOCK MODE switch.
   * When true, the app must not perform any network calls (Supabase, fetch, Twilio, etc.).
   */
  isMockMode: parseBool(process.env.REACT_APP_USE_MOCKS),

  /**
   * Optional label for banner/logging.
   */
  mockModeLabel: process.env.REACT_APP_USE_MOCKS ? "MOCK MODE" : "",
};

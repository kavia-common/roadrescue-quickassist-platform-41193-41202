import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "rrq_auth_state";

/**
 * AuthContext provides a tiny auth surface for the MVP.
 * It intentionally mirrors a future Supabase integration:
 * - login(email, password) -> would map to supabase.auth.signInWithPassword(...)
 * - register(email, password) -> would map to supabase.auth.signUp(...)
 * - logout() -> would map to supabase.auth.signOut(...)
 */
const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const isAuthenticated = Boolean(parsed.isAuthenticated);
    const role = parsed.role === "user" ? "user" : "public";
    const email = typeof parsed.email === "string" ? parsed.email : "";

    return { isAuthenticated, role, email };
  } catch {
    return null;
  }
}

function writeStoredAuth(state) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures (private mode etc.)
  }
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides authentication state + actions (mock mode). */
  const [auth, setAuth] = useState(() => {
    const stored = readStoredAuth();
    return stored || { isAuthenticated: false, role: "public", email: "" };
  });

  useEffect(() => {
    writeStoredAuth(auth);
  }, [auth]);

  const api = useMemo(() => {
    return {
      ...auth,

      // PUBLIC_INTERFACE
      async login(email, _password) {
        /**
         * Mock login. For now, any non-empty email/password logs the user in.
         *
         * Supabase hook point:
         *   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
         *   ...
         */
        const safeEmail = String(email || "").trim();
        if (!safeEmail) throw new Error("Email is required.");
        setAuth({ isAuthenticated: true, role: "user", email: safeEmail });
        return true;
      },

      // PUBLIC_INTERFACE
      async register(email, _password) {
        /**
         * Mock register. For MVP we directly log the user in after "registration".
         *
         * Supabase hook point:
         *   await supabase.auth.signUp({ email, password, options: { emailRedirectTo: process.env.REACT_APP_SITE_URL }})
         */
        const safeEmail = String(email || "").trim();
        if (!safeEmail) throw new Error("Email is required.");
        setAuth({ isAuthenticated: true, role: "user", email: safeEmail });
        return true;
      },

      // PUBLIC_INTERFACE
      async logout() {
        /** Mock logout. Supabase hook: await supabase.auth.signOut() */
        setAuth({ isAuthenticated: false, role: "public", email: "" });
        return true;
      },
    };
  }, [auth]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Access the current auth context; throws if missing provider. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}

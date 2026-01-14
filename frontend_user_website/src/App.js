import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./App.css";

import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { RequireAuth } from "./routes/RequireAuth";
import { dataService } from "./services/dataService";
import { appConfig } from "./config/appConfig";
import { withTimeout } from "./utils/withTimeout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { getSupabaseInitState } from "./services/supabaseClient";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SubmitRequestPage } from "./pages/SubmitRequestPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { AboutPage } from "./pages/AboutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TwilioSmsDemoCard } from "./components/demo/TwilioSmsDemoCard";

function getRouteStateMessage(location) {
  const raw = location?.state?.message;
  return typeof raw === "string" ? raw : "";
}

function LoadingScreen({ message = "Loading…" }) {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Starting QuickAssist</h2>
            <p className="card-subtitle">Connecting to Supabase and checking your session…</p>
          </div>
        </div>
        <div className="card-body">
          <div className="skeleton" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 800 }}>{message}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>This should only take a moment.</div>
          </div>
          <div className="note">
            If this persists, verify <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> are set and correct.
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <a className="link" href="/login">
              Go to Login
            </a>
            <a className="link" href="/">
              Reload
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Internal component that performs auth boot and handles redirects.
 * This is nested under BrowserRouter so we can use navigation hooks.
 */
function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * 3-state auth flow:
   * - loading: session check in progress
   * - authenticated: session exists and we have a user
   * - unauthenticated: no session
   */
  const [authState, setAuthState] = useState("loading"); // "loading" | "authenticated" | "unauthenticated"
  const [user, setUser] = useState(null);
  const [bootError, setBootError] = useState("");
  const [bootResolved, setBootResolved] = useState(false);

  const routeMessage = useMemo(() => getRouteStateMessage(location), [location]);
  const effectiveBootError = routeMessage || bootError;

  useEffect(() => {
    let mounted = true;

    // Subscribe once; do not add polling/duplicate listeners.
    const unsubscribe = dataService.subscribeToAuthChanges((nextUser) => {
      if (!mounted) return;
      setUser(nextUser);
      setAuthState(nextUser ? "authenticated" : "unauthenticated");
    });

    (async () => {
      try {
        // Use Supabase getSession for boot. This avoids the occasional getUser hang and is the recommended boot primitive.
        const appUser = await withTimeout(dataService.getUserFromSession(), appConfig.bootTimeoutMs, "Auth boot");
        if (!mounted) return;

        setUser(appUser);
        setAuthState(appUser ? "authenticated" : "unauthenticated");
        setBootResolved(true);

        // If boot determined we are unauthenticated and we are currently on a protected route,
        // we can send them to login. Keep /login and /register accessible.
        if (!appUser) {
          const path = location.pathname || "/";
          const isAuthRoute = path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/about");
          if (!isAuthRoute) navigate("/login", { replace: true });
        }
      } catch (e) {
        if (!mounted) return;

        const msg = e?.message || "We couldn’t initialize your session. Please log in again.";
        setUser(null);
        setBootError(msg);
        setAuthState("unauthenticated");
        setBootResolved(true);

        navigate("/login", { replace: true, state: { message: msg } });
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
    // We intentionally run this once; listener handles future auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show a visible loading UI while auth boot is running.
  if (authState === "loading") {
    return (
      <div className="app-shell">
        <Navbar user={null} />
        <main className="main">
          <LoadingScreen message="Checking session…" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar user={user} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/submit" replace />
              ) : (
                <LoginPage onAuthed={setUser} bootError={effectiveBootError} bootResolved={bootResolved} />
              )
            }
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/submit" replace /> : <RegisterPage onAuthed={setUser} />}
          />

          <Route
            path="/submit"
            element={
              <RequireAuth user={user}>
                <SubmitRequestPage user={user} />
              </RequireAuth>
            }
          />
          <Route
            path="/requests"
            element={
              <RequireAuth user={user}>
                <MyRequestsPage user={user} />
              </RequireAuth>
            }
          />
          <Route
            path="/requests/:requestId"
            element={
              <RequireAuth user={user}>
                <RequestDetailPage user={user} />
              </RequireAuth>
            }
          />

          <Route
            path="/demo-sms"
            element={
              <RequireAuth user={user}>
                <div className="container">
                  <div className="hero">
                    <h1 className="h1">SMS Demo</h1>
                    <p className="lead">Simulate the “Mechanic accepts job” event.</p>
                  </div>
                  <TwilioSmsDemoCard title="Mechanic accepts job (Demo)" />
                </div>
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function SupabaseConfigErrorScreen({ message, missing }) {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Configuration required</h2>
            <p className="card-subtitle">This app is Supabase-only. It can’t start until required environment variables are set.</p>
          </div>
        </div>
        <div className="card-body">
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            {message}
          </div>

          <div style={{ fontWeight: 800, marginBottom: 6 }}>Missing variables</div>
          <ul className="list" style={{ marginTop: 0 }}>
            {(missing || []).map((k) => (
              <li key={k}>
                <code>{k}</code>
              </li>
            ))}
          </ul>

          <div className="note">After setting env vars, you must restart/rebuild the app (Create React App reads env at build time).</div>

          <div className="divider" />
          <div className="row">
            <a className="link" href="/about">
              About data & auth
            </a>
            <a className="link" href="/">
              Reload
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** User website entry: Supabase auth + request submission + status tracking. */

  // Validate Supabase env vars *before* the rest of the app boots.
  // This must never throw or return null: always render a visible UI.
  const init = getSupabaseInitState();

  return (
    <BrowserRouter>
      <ErrorBoundary>
        {!init.configured ? <SupabaseConfigErrorScreen message={init.message} missing={init.missing} /> : <AppShell />}
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;

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

/**
 * Internal component that performs auth boot and handles redirects.
 * This is nested under BrowserRouter so we can use navigation hooks.
 */
function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);

  // Boot should NEVER freeze UI. We render immediately and just show login/protected routes accordingly.
  const [bootResolved, setBootResolved] = useState(false);
  const [bootError, setBootError] = useState("");

  const routeMessage = useMemo(() => getRouteStateMessage(location), [location]);

  useEffect(() => {
    let mounted = true;

    // Always subscribe immediately so even if getUser hangs, auth events can still update UI.
    const unsubscribe = dataService.subscribeToAuthChanges((nextUser) => {
      if (!mounted) return;
      setUser(nextUser);
      // If an auth event arrived, consider boot resolved.
      setBootResolved(true);
    });

    (async () => {
      try {
        const u = await withTimeout(dataService.getCurrentUser(), appConfig.bootTimeoutMs, "Auth boot");
        if (!mounted) return;
        setUser(u);
      } catch (e) {
        if (!mounted) return;

        const msg = e?.message || "We couldn’t initialize your session. Please log in again.";
        setUser(null);
        setBootError(msg);

        // Redirect to login with a friendly message.
        // Do not trap the app on a loading screen.
        navigate("/login", { replace: true, state: { message: msg } });
      } finally {
        if (mounted) setBootResolved(true);
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefer route-provided message (redirect), else boot error.
  const effectiveBootError = routeMessage || bootError;

  /**
   * TEMPORARY DEBUG MODE:
   * - Render Dashboard unconditionally and bypass auth guards so we can confirm UI renders
   *   even when Supabase/auth is failing or timing out in preview environments.
   *
   * Once verified, revert RequireAuth usage for protected routes and switch "/" redirect logic back.
   */
  const bypassAuthForDebug = true;

  // Non-blocking UI: no full-screen loading gate.
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
                <Navigate to={bypassAuthForDebug ? "/dashboard" : "/submit"} replace />
              ) : (
                <LoginPage onAuthed={setUser} bootError={effectiveBootError} bootResolved={bootResolved} />
              )
            }
          />
          <Route
            path="/register"
            element={user ? <Navigate to={bypassAuthForDebug ? "/dashboard" : "/submit"} replace /> : <RegisterPage onAuthed={setUser} />}
          />

          <Route
            path="/submit"
            element={
              bypassAuthForDebug ? (
                <SubmitRequestPage user={user || { id: "debug", email: "debug@local", role: "user", approved: true }} />
              ) : (
                <RequireAuth user={user}>
                  <SubmitRequestPage user={user} />
                </RequireAuth>
              )
            }
          />
          <Route
            path="/requests"
            element={
              bypassAuthForDebug ? (
                <MyRequestsPage user={user || { id: "debug", email: "debug@local", role: "user", approved: true }} />
              ) : (
                <RequireAuth user={user}>
                  <MyRequestsPage user={user} />
                </RequireAuth>
              )
            }
          />
          <Route
            path="/requests/:requestId"
            element={
              bypassAuthForDebug ? (
                <RequestDetailPage user={user || { id: "debug", email: "debug@local", role: "user", approved: true }} />
              ) : (
                <RequireAuth user={user}>
                  <RequestDetailPage user={user} />
                </RequireAuth>
              )
            }
          />

          <Route
            path="/demo-sms"
            element={
              bypassAuthForDebug ? (
                <div className="container">
                  <div className="hero">
                    <h1 className="h1">SMS Demo</h1>
                    <p className="lead">Simulate the “Mechanic accepts job” event.</p>
                  </div>
                  <TwilioSmsDemoCard title="Mechanic accepts job (Demo)" />
                </div>
              ) : (
                <RequireAuth user={user}>
                  <div className="container">
                    <div className="hero">
                      <h1 className="h1">SMS Demo</h1>
                      <p className="lead">Simulate the “Mechanic accepts job” event.</p>
                    </div>
                    <TwilioSmsDemoCard title="Mechanic accepts job (Demo)" />
                  </div>
                </RequireAuth>
              )
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
            <p className="card-subtitle">
              This app is Supabase-only. It can’t start until required environment variables are set.
            </p>
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

          <div className="note">
            After setting env vars, you must restart/rebuild the app (Create React App reads env at build time).
          </div>

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
        {!init.configured ? (
          <SupabaseConfigErrorScreen message={init.message} missing={init.missing} />
        ) : (
          <AppShell />
        )}
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;

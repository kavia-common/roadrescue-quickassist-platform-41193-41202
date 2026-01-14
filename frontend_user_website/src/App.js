import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { RequireAuth } from "./routes/RequireAuth";
import { dataService } from "./services/dataService";
import { appConfig } from "./config/appConfig";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SubmitRequestPage } from "./pages/SubmitRequestPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { AboutPage } from "./pages/AboutPage";
import { TwilioSmsDemoCard } from "./components/demo/TwilioSmsDemoCard";

// PUBLIC_INTERFACE
function App() {
  /** User website entry: auth, request submission, status tracking. */
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (appConfig.isMockMode) {
      // eslint-disable-next-line no-console
      console.info("[RoadRescue QuickAssist] MOCK MODE active: all network calls are disabled.");
    }

    // 1) Initial boot: load current user (handles Supabase persisted session after OAuth redirect)
    (async () => {
      const u = await dataService.getCurrentUser();
      if (mounted) {
        setUser(u);
        setBooted(true);
      }
    })();

    // 2) Keep UI in sync with Supabase auth state (no-op in mock mode)
    const unsubscribe = dataService.subscribeToAuthChanges((nextUser) => {
      if (!mounted) return;
      setUser(nextUser);
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  if (!booted) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="skeleton">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        {appConfig.isMockMode ? (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "rgba(245, 158, 11, 0.18)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.35)",
              color: "var(--text)",
              fontWeight: 800,
              padding: "8px 12px",
              textAlign: "center",
            }}
            role="status"
            aria-label="Mock mode banner"
          >
            MOCK MODE: running offline (network disabled)
          </div>
        ) : null}
        <Navbar user={user} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to={user ? "/submit" : "/login"} replace />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={user ? <Navigate to="/submit" replace /> : <LoginPage onAuthed={setUser} />} />
            <Route path="/register" element={user ? <Navigate to="/submit" replace /> : <RegisterPage onAuthed={setUser} />} />

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
                      <p className="lead">Simulate the mocked “Mechanic accepts job” event.</p>
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
    </BrowserRouter>
  );
}

export default App;

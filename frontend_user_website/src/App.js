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

function withTimeout(promise, ms, label = "operation") {
  let timerId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timerId) window.clearTimeout(timerId);
  });
}

// PUBLIC_INTERFACE
function App() {
  /** User website entry: Supabase auth + request submission + status tracking. */
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const u = await withTimeout(dataService.getCurrentUser(), appConfig.bootTimeoutMs, "Auth boot");
        if (!mounted) return;
        setUser(u);
      } catch (e) {
        if (!mounted) return;
        setUser(null);
        setBootError(e?.message || "Unable to initialize authentication.");
      } finally {
        if (mounted) setBooted(true);
      }
    })();

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
        <Navbar user={user} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to={user ? "/submit" : "/login"} replace />} />
            <Route path="/about" element={<AboutPage />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/submit" replace /> : <LoginPage onAuthed={setUser} bootError={bootError} />}
            />
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
    </BrowserRouter>
  );
}

export default App;

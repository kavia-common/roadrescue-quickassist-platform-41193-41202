import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { RequireAuth } from "./routes/RequireAuth";
import { dataService } from "./services/dataService";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SubmitRequestPage } from "./pages/SubmitRequestPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { AboutPage } from "./pages/AboutPage";

// PUBLIC_INTERFACE
function App() {
  /** User website entry: auth, request submission, status tracking. */
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await dataService.getCurrentUser();
      if (mounted) {
        setUser(u);
        setBooted(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!booted) return <div className="app-shell"><div className="container"><div className="skeleton">Loading…</div></div></div>;

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar user={user} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to={user ? "/submit" : "/login"} replace />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage onAuthed={setUser} />} />
            <Route path="/register" element={<RegisterPage onAuthed={setUser} />} />

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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;

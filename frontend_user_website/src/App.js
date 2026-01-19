import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";

import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./routes/RequireAuth";

// Pages (public)
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { WhyChooseUsPage } from "./pages/WhyChooseUsPage";
import { AboutPage } from "./pages/AboutPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

// Pages (authed user)
import { SubmitRequestPage } from "./pages/SubmitRequestPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";

/**
 * App root for RoadRescue QuickAssist (User Website).
 *
 * This build runs in mock mode:
 * - Auth is stubbed via AuthContext (localStorage-backed).
 * - Requests are stored in localStorage (rrq_user_requests).
 *
 * Supabase can be integrated later by replacing AuthContext/login/logout/register
 * implementations with `supabase.auth.*` calls and persisting requests to a table.
 */
// PUBLIC_INTERFACE
function App() {
  /** React SPA entrypoint: layout + routing. */
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <div className="app-shell">
            <Navbar />
            <main className="main">
              <Routes>
                {/* Public */}
                <Route path="/" element={<HomePage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/why-choose-us" element={<WhyChooseUsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Authenticated user */}
                <Route
                  path="/submit"
                  element={
                    <RequireAuth>
                      <SubmitRequestPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <RequireAuth>
                      <MyRequestsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/requests/:requestId"
                  element={
                    <RequireAuth>
                      <RequestDetailPage />
                    </RequireAuth>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;

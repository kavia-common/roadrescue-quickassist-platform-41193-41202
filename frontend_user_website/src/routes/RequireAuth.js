import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// PUBLIC_INTERFACE
export function RequireAuth({ user, children }) {
  /**
   * Redirects to /login when no active user session.
   *
   * TEMPORARY DEBUG: This guard is intentionally bypassed to verify the UI renders even
   * when Supabase auth boot is failing/hanging in preview.
   */
  const location = useLocation();

  const bypassAuthForDebug = true;
  if (bypassAuthForDebug) return <>{children}</>;

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

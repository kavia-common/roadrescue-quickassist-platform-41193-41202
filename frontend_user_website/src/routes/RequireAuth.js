import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// PUBLIC_INTERFACE
export function RequireAuth({ user, children }) {
  /**
   * Redirects to /login when no active user session.
   *
   * This component expects the app's auth boot to resolve to a stable user/null value.
   */
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

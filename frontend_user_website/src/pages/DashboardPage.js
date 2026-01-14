import React from "react";
import { Card } from "../components/ui/Card";

/**
 * PUBLIC_INTERFACE
 */
export function DashboardPage() {
  /**
   * Temporary unconditional dashboard to verify the UI renders even when auth boot fails/hangs.
   *
   * NOTE: This is intentionally auth-independent per the debugging task request.
   */
  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Dashboard</h1>
        <p className="lead">
          Temporary debug view: this page should always render to confirm the app UI is healthy.
        </p>
      </div>

      <div className="grid2">
        <Card title="UI Render Check" subtitle="If you can see this, routing + layout are working.">
          <ul className="list">
            <li>Navbar + Footer should be visible</li>
            <li>Cards, typography, and spacing should match theme</li>
            <li>Navigation should work even if auth is broken</li>
          </ul>
        </Card>

        <Card title="Next step" subtitle="Once UI render is confirmed">
          <ul className="list">
            <li>Re-enable auth guard for protected routes</li>
            <li>Verify Supabase env vars are set correctly</li>
            <li>Test login + requests flows</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

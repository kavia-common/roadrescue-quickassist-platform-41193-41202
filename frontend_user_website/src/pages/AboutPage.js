import React from "react";
import { Card } from "../components/ui/Card";

// PUBLIC_INTERFACE
export function AboutPage() {
  /** About/auth/data notes. */

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">About QuickAssist MVP</h1>
        <p className="lead">Manual dashboards and forms—no maps, AI, or external location APIs.</p>
      </div>

      <Card title="Auth & data" subtitle="Supabase-only mode">
        <ul className="list">
          <li>
            Authentication uses <code>supabase.auth</code> from <code>@supabase/supabase-js</code>.
          </li>
          <li>
            Requests are read/written directly via Supabase tables (<code>profiles</code>, <code>requests</code>).
          </li>
          <li>No demo users or offline/localStorage mock mode is included.</li>
        </ul>
        <div className="note">
          Required env vars: <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_KEY</code>.
        </div>
      </Card>
    </div>
  );
}

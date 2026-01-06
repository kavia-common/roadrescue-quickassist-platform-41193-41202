import React from "react";
import { Card } from "../components/ui/Card";
import { isSupabaseConfigured } from "../theme";

// PUBLIC_INTERFACE
export function AboutPage() {
  /** About/auth/data notes. */
  const supa = isSupabaseConfigured();

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">About QuickAssist MVP</h1>
        <p className="lead">Manual dashboards and forms—no maps, AI, or external location APIs.</p>
      </div>

      <Card title="Auth & data mode" subtitle={supa ? "Supabase mode detected." : "Mock mode detected (localStorage)."}>
        <ul className="list">
          <li>
            <strong>Supabase configured:</strong> uses <code>supabase.auth</code> and reads/writes tables (<code>profiles</code>, <code>requests</code>) when available.
          </li>
          <li>
            <strong>Supabase not configured:</strong> uses <code>localStorage</code> with seeded demo users and requests.
          </li>
          <li>
            Demo accounts (mock): <code>user@example.com</code>, <code>mech@example.com</code>, <code>admin@example.com</code> (password: <code>password123</code>).
          </li>
        </ul>
        <div className="note">
          Configure <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_KEY</code> in the environment to enable Supabase.
        </div>
      </Card>
    </div>
  );
}

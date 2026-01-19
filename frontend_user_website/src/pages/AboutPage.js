import React from "react";
import { Card } from "../components/ui/Card";

// PUBLIC_INTERFACE
export function AboutPage() {
  /** About RoadRescue QuickAssist. */
  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">About RoadRescue QuickAssist</h1>
        <p className="lead">
          A focused MVP to help drivers submit roadside breakdown requests and track progress with a clean, professional UI.
        </p>
      </div>

      <div className="grid2">
        <Card title="Mission" subtitle="Get help to drivers faster">
          <p className="p">
            QuickAssist is designed to streamline the first mile of roadside support—capturing what happened, where you are, and how to reach you.
            The goal is a clear flow that works great on mobile and desktop.
          </p>
        </Card>

        <Card title="MVP scope" subtitle="Simple flows, no heavy dependencies">
          <ul className="list">
            <li>Login / Register (mock auth in this build)</li>
            <li>Submit Request (stores locally for the MVP)</li>
            <li>My Requests (status badges and history)</li>
          </ul>
          <div className="note">
            Future: plug in Supabase auth + persistence without changing page layouts (see AuthContext placeholders).
          </div>
        </Card>
      </div>
    </div>
  );
}

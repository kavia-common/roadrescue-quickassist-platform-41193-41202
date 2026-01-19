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
        <Card title="Mission" subtitle="Get help to drivers faster, with less friction.">
          <p className="p">
            QuickAssist streamlines the first mile of roadside support—capturing what happened, where you are, and how to reach you.
            The result is a simple flow that works great on mobile and desktop.
          </p>
          <div className="note">
            We prioritize clarity: modern cards, responsive layouts, and accessible interactions.
          </div>
        </Card>

        <Card title="Contact" subtitle="Questions or feedback?">
          <div className="kv">
            <div>
              <span className="k">Email</span>
              <span className="v">support@roadrescue.example</span>
            </div>
            <div>
              <span className="k">Hours</span>
              <span className="v">24/7 (MVP support)</span>
            </div>
            <div>
              <span className="k">Location</span>
              <span className="v">Remote</span>
            </div>
          </div>
          <div className="note">MVP note: this is a demo contact block (UI-only).</div>
        </Card>
      </div>
    </div>
  );
}

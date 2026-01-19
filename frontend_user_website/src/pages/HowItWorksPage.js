import React from "react";
import { Card } from "../components/ui/Card";

const steps = [
  { icon: "📝", title: "Request", text: "Describe your vehicle issue, location, and contact phone." },
  { icon: "🔎", title: "Match", text: "In the full product, we match you to an available mechanic." },
  { icon: "📣", title: "Notify", text: "You receive updates as your request progresses through statuses." },
  { icon: "🛠️", title: "Assist", text: "A mechanic arrives and helps get you back on the road." },
];

// PUBLIC_INTERFACE
export function HowItWorksPage() {
  /** Public “How it works” marketing page. */
  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">How it works</h1>
        <p className="lead">A simple 4-step flow designed for a clean MVP experience.</p>
      </div>

      <div className="grid4">
        {steps.map((s) => (
          <Card key={s.title} title={s.title} subtitle={s.text}>
            <div className="icon-tile" aria-hidden="true">
              <span className="icon">{s.icon}</span>
            </div>
            <div className="note">Step: {s.title}</div>
          </Card>
        ))}
      </div>

      <div className="note" style={{ marginTop: 12 }}>
        MVP note: matching and notifications are simulated in this front-end demo.
      </div>
    </div>
  );
}

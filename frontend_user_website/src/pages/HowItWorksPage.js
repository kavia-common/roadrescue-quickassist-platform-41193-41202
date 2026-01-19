import React from "react";
import { Card } from "../components/ui/Card";

const steps = [
  { icon: "📝", title: "Submit", text: "Describe the issue, your location, and a contact phone number." },
  { icon: "🔎", title: "Review", text: "In the full product, we verify details and match you to an available mechanic." },
  { icon: "📣", title: "Updates", text: "You’ll see status changes as your request progresses." },
  { icon: "🛠️", title: "Resolution", text: "A mechanic arrives and helps get you back on the road." },
];

// PUBLIC_INTERFACE
export function HowItWorksPage() {
  /** Public “How it works” marketing page. */
  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">How it works</h1>
        <p className="lead">A simple 4-step flow designed for a clean, mobile-friendly MVP experience.</p>
      </div>

      <div className="grid4">
        {steps.map((s, idx) => (
          <Card key={s.title} title={`${idx + 1}. ${s.title}`} subtitle={s.text}>
            <div className="icon-tile" aria-hidden="true">
              <span className="icon">{s.icon}</span>
            </div>
            <div className="note">Step {idx + 1} of 4</div>
          </Card>
        ))}
      </div>

      <div className="note" style={{ marginTop: 12 }}>
        MVP note: matching and notifications are simulated in this front-end demo.
      </div>
    </div>
  );
}

import React from "react";
import { Card } from "../components/ui/Card";

const propsList = [
  { icon: "⚡", title: "Fast response", text: "Quick, clean request intake with instant confirmation." },
  { icon: "✅", title: "Vetted mechanics", text: "In the full product, mechanics are reviewed and approved." },
  { icon: "🧭", title: "Clear flow", text: "Submit → track → resolve, with minimal steps and modern UI patterns." },
  { icon: "📱", title: "Mobile-first", text: "Designed to feel great on phones with polished navigation and spacing." },
  { icon: "🔒", title: "Secure-ready", text: "Built to plug into Supabase auth & data without reworking the layout." },
  { icon: "💬", title: "Transparent status", text: "Status badges keep you informed at a glance (MVP simulation)." },
];

// PUBLIC_INTERFACE
export function WhyChooseUsPage() {
  /** Public “Why choose us” marketing page. */
  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Why choose RoadRescue</h1>
        <p className="lead">A modern, lightweight experience built for clarity and trust.</p>
      </div>

      <div className="grid3">
        {propsList.map((p) => (
          <Card key={p.title} title={p.title} subtitle={p.text}>
            <div className="icon-tile" aria-hidden="true">
              <span className="icon">{p.icon}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

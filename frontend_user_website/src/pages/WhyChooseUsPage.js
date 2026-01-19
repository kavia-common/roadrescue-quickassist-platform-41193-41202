import React from "react";
import { Card } from "../components/ui/Card";

const propsList = [
  { icon: "⚡", title: "Fast response", text: "Quick, clean request intake with instant confirmation." },
  { icon: "✅", title: "Vetted mechanics", text: "In the full product, mechanics are reviewed and approved." },
  { icon: "💬", title: "Transparent pricing (MVP note)", text: "Pricing is planned for later iterations; MVP focuses on workflow." },
  { icon: "🔒", title: "Secure & simple", text: "Designed to plug into Supabase auth later without reworking UI." },
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

      <div className="grid2">
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

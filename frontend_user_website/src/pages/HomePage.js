import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

// PUBLIC_INTERFACE
export function HomePage() {
  /** Public landing page with CTA. */
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const onGetHelp = () => {
    navigate(isAuthenticated ? "/submit" : "/login");
  };

  return (
    <div className="container">
      <section className="hero hero-split" aria-label="Hero">
        <div className="hero-copy">
          <h1 className="h1">Roadside help, simplified.</h1>
          <p className="lead">
            RoadRescue QuickAssist helps you submit a breakdown request fast and track updates as it moves from pending to
            completion. Built as a focused MVP—clean, professional, and easy to use.
          </p>

          <div className="row" style={{ marginTop: 14 }}>
            <Button onClick={onGetHelp} size="lg" style={{ minWidth: 180 }}>
              Get Help Now
            </Button>
            <Button variant="secondary-outline" size="lg" onClick={() => navigate("/how-it-works")}>
              Learn How It Works
            </Button>
          </div>

          <ul className="list" aria-label="Highlights">
            <li>Fast request submission with clear fields</li>
            <li>Track request status in a simple dashboard</li>
            <li>Professional, mobile-friendly UI</li>
          </ul>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <Card title="QuickAssist Snapshot" subtitle="Modern MVP experience with Ocean Professional styling.">
            <div className="illustration">
              <div className="illustration-row">
                <div className="illustration-dot dot-blue" />
                <div className="illustration-line" />
              </div>
              <div className="illustration-row">
                <div className="illustration-dot dot-amber" />
                <div className="illustration-line" />
              </div>
              <div className="illustration-row">
                <div className="illustration-dot dot-green" />
                <div className="illustration-line" />
              </div>

              <div className="note">
                Tip: {isAuthenticated ? "Go to Submit Request to add a new request." : "Log in to submit your first request."}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section aria-label="Primary value props" className="section">
        <div className="grid3">
          <Card title="Fast" subtitle="Submit in under a minute.">
            <p className="p">Minimal fields, clear validation, and instant confirmation.</p>
          </Card>
          <Card title="Reliable" subtitle="Built for clarity.">
            <p className="p">Focused flows: request → status → follow-up. No clutter.</p>
          </Card>
          <Card title="Professional" subtitle="Ocean Professional theme.">
            <p className="p">Clean typography, subtle shadows, and responsive navigation.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}

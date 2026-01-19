import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

// PUBLIC_INTERFACE
export function HomePage() {
  /** Public long-form landing page with professional sections and CTA (UI-only). */
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const onGetHelp = () => {
    navigate(isAuthenticated ? "/submit" : "/login");
  };

  return (
    <div className="home">
      {/* HERO */}
      <section className="home-hero" aria-label="Hero">
        <div className="container">
          <div className="home-hero__inner">
            <p className="home-eyebrow">RoadRescue QuickAssist</p>

            <h1 className="home-title">Roadside Assistance at Your Fingertips</h1>
            <p className="home-subtitle">
              Simplified so you can request help quickly, track status updates in minutes, and stay informed.
            </p>

            <div className="home-hero__actions">
              <Button onClick={onGetHelp} size="lg" style={{ minWidth: 180 }}>
                Get Started
              </Button>
              <Button variant="secondary-outline" size="lg" onClick={() => navigate("/how-it-works")}>
                Learn More
              </Button>
            </div>

            <div className="home-trust">
              <span className="home-trust__dot" aria-hidden="true" />
              <span>Clean, mobile-friendly experience • UI-only MVP</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="home-section" aria-label="Why choose RoadRescue">
        <div className="container">
          <div className="home-section__head">
            <h2 className="home-h2">Why Choose RoadRescue?</h2>
          </div>

          <div className="home-grid3">
            <Card
              title="Quick Response"
              subtitle="Submit a request in seconds with a simple form and clear fields."
              className="home-featureCard"
            >
              <p className="p">
                Designed for speed: enter your vehicle and issue details, then track updates without confusion.
              </p>
            </Card>

            <Card
              title="Verified Mechanics"
              subtitle="Reliable support experience with a vetted network (product-ready)."
              className="home-featureCard"
            >
              <p className="p">
                Built with a structure that supports mechanic approvals and professional workflows as the platform grows.
              </p>
            </Card>

            <Card
              title="Real-Time Tracking"
              subtitle="Stay informed with clean status updates across the request lifecycle."
              className="home-featureCard"
            >
              <p className="p">
                A simple dashboard view keeps you updated at-a-glance from open to completion (simulated in MVP).
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="home-section home-section--tight" aria-label="How it works">
        <div className="container">
          <div className="home-section__head">
            <h2 className="home-h2">How It Works</h2>
          </div>

          <div className="home-steps" role="list" aria-label="How it works steps">
            <div className="home-step" role="listitem">
              <div className="home-step__icon" aria-hidden="true">
                📝
              </div>
              <div className="home-step__title">Submit Request</div>
              <div className="home-step__desc">Provide vehicle info, issue details, and your location.</div>
            </div>

            <div className="home-step" role="listitem">
              <div className="home-step__icon" aria-hidden="true">
                🔎
              </div>
              <div className="home-step__title">Review Details</div>
              <div className="home-step__desc">We validate details for a smooth service handoff.</div>
            </div>

            <div className="home-step" role="listitem">
              <div className="home-step__icon" aria-hidden="true">
                🛠️
              </div>
              <div className="home-step__title">Get Assistance</div>
              <div className="home-step__desc">A mechanic is assigned and reaches out with next steps.</div>
            </div>

            <div className="home-step" role="listitem">
              <div className="home-step__icon" aria-hidden="true">
                ✅
              </div>
              <div className="home-step__title">Track Progress</div>
              <div className="home-step__desc">Watch status updates from open → completed.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="home-ctaBand" aria-label="Call to action">
        <div className="container">
          <div className="home-ctaBand__inner">
            <div>
              <h3 className="home-h3">Ready to Get Started?</h3>
              <p className="home-ctaBand__subtitle">
                Get immediate help on the road by submitting your request now and tracking updates with ease.
              </p>
            </div>
            <div className="home-ctaBand__actions">
              <Button onClick={onGetHelp} size="lg" style={{ minWidth: 180 }}>
                Get Started
              </Button>
            </div>
          </div>

          <div className="home-ctaBand__note">
            {isAuthenticated ? (
              <span>
                You’re signed in — go straight to <strong>Submit Request</strong>.
              </span>
            ) : (
              <span>
                Not signed in yet? We’ll take you to <strong>Login</strong> first.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* BOTTOM SPACING SECTION (matches long-form feel) */}
      <section className="home-section home-section--footerGap" aria-hidden="true">
        <div className="container">
          <div className="home-divider" />
        </div>
      </section>
    </div>
  );
}

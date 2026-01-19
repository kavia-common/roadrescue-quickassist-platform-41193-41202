import React from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Container } from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";

function StatPill({ icon, label }) {
  return (
    <div className="mk-pill" role="listitem">
      <span className="mk-pill__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="mk-pill__label">{label}</span>
    </div>
  );
}

function StepCard({ icon, title, text }) {
  return (
    <div className="mk-stepCard" role="listitem">
      <div className="mk-stepCard__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="mk-stepCard__title">{title}</div>
      <div className="mk-stepCard__text">{text}</div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function HomePage() {
  /** Public long-form landing page for RoadRescue QuickAssist (UI-only). */
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useScrollReveal();

  const onGetHelpNow = () => {
    navigate(isAuthenticated ? "/submit" : "/login");
  };

  return (
    <div className="mk-page">
      {/* HERO */}
      <section className="mk-hero" aria-label="RoadRescue QuickAssist hero" data-reveal data-reveal-variant="up">
        <Container>
          <div className="mk-hero__inner">
            <p className="mk-eyebrow">RoadRescue QuickAssist • Roadside Assistance MVP</p>

            <h1 className="mk-title">
              Get roadside help fast—submit a breakdown request in under a minute.
            </h1>

            <p className="mk-subtitle">
              QuickAssist is a streamlined, mobile-friendly experience for drivers: request help, see clear status updates,
              and stay informed until you’re safely back on the road.
            </p>

            <div className="mk-hero__actions" aria-label="Primary actions">
              <Button onClick={onGetHelpNow} size="lg" style={{ minWidth: 180 }}>
                Get Help Now
              </Button>
              <Button variant="secondary-outline" size="lg" onClick={() => navigate("/how-it-works")}>
                Learn How It Works
              </Button>
            </div>

            <div className="mk-socialProof" aria-label="Social proof highlights" role="list">
              <StatPill icon="⭐" label="4.8 average driver satisfaction (pilot)" />
              <StatPill icon="⏱️" label="Quick intake: clear form, fewer steps" />
              <StatPill icon="🔒" label="Secure sign-in ready (Supabase auth)" />
              <StatPill icon="💬" label="SMS updates capable (Twilio integration)" />
            </div>
          </div>
        </Container>
      </section>

      {/* VALUE GRID */}
      <section className="mk-section" aria-label="Features and value" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">A calm, professional experience—when you need it most</h2>
            <p className="mk-lead">
              Roadside breakdowns are stressful. QuickAssist keeps the experience simple: tell us what happened, how to
              reach you, and where you are—then track progress in a clean dashboard.
            </p>
          </div>

          <div className="mk-grid3" data-reveal-stagger>
            <Card
              title="Simple Request Flow"
              subtitle="Vehicle + issue + contact details, captured cleanly."
              className="mk-card"
            >
              <p className="p">
                Designed to reduce confusion on mobile—large tap targets, clear labels, and straightforward fields that
                help mechanics prepare before they arrive.
              </p>
              <ul className="mk-list">
                <li>Fast intake UX</li>
                <li>Readable typography and spacing</li>
                <li>Accessible interactions (focus states, headings)</li>
              </ul>
            </Card>

            <Card title="Transparent Status" subtitle="At-a-glance updates across the lifecycle." className="mk-card">
              <p className="p">
                See progress without calling a hotline repeatedly. Status badges and request history keep you informed at
                every step.
              </p>
              <ul className="mk-list">
                <li>Open → Assigned → En Route → Working → Completed (future-ready)</li>
                <li>Request history view</li>
                <li>Detail view friendly on mobile</li>
              </ul>
            </Card>

            <Card title="Built for MVP → Product" subtitle="Structured to expand safely." className="mk-card">
              <p className="p">
                QuickAssist is a focused MVP, but it’s designed to scale: Supabase authentication and data storage, plus
                Twilio SMS capability for notifications.
              </p>
              <ul className="mk-list">
                <li>Supabase auth & persistence</li>
                <li>Twilio SMS updates (capability)</li>
                <li>Clean component patterns</li>
              </ul>
            </Card>
          </div>
        </Container>
      </section>

      {/* BENEFITS */}
      <section className="mk-section mk-section--subtle" aria-label="Benefits" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">Benefits for drivers</h2>
            <p className="mk-lead">
              QuickAssist focuses on the essentials: clarity, speed, and trust—without unnecessary complexity.
            </p>
          </div>

          <div className="mk-grid2" data-reveal-stagger>
            <Card title="Less waiting, more clarity" subtitle="Know what’s happening next." className="mk-card">
              <ul className="mk-list">
                <li>Clear confirmation after submitting a request</li>
                <li>Professional UI for tracking status updates</li>
                <li>Simple request detail view for reference</li>
              </ul>
            </Card>

            <Card title="Trust by design" subtitle="Built with security and privacy in mind." className="mk-card">
              <ul className="mk-list">
                <li>Secure authentication architecture (Supabase)</li>
                <li>Data stored with clear separation of user requests</li>
                <li>Privacy-respecting MVP approach (no real-time tracking)</li>
              </ul>
            </Card>
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS PREVIEW */}
      <section className="mk-section" aria-label="How it works preview" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">How it works (preview)</h2>
            <p className="mk-lead">
              A streamlined four-step flow: request help, get matched, receive updates, and get back on the road.
            </p>
          </div>

          <div className="mk-steps" role="list" aria-label="How it works steps preview" data-reveal-stagger>
            <StepCard
              icon="📝"
              title="Request"
              text="Tell us your vehicle, what happened, and how to reach you."
            />
            <StepCard
              icon="🤝"
              title="Match"
              text="We connect your request to an available mechanic (MVP-ready flow)."
            />
            <StepCard
              icon="📣"
              title="Notify"
              text="Receive status updates as your job moves forward (SMS capable)."
            />
            <StepCard
              icon="🛠️"
              title="Assist"
              text="A mechanic helps you safely resolve the issue—then you’re back moving."
            />
          </div>

          <div className="mk-inlineCtas" aria-label="How it works actions">
            <Button variant="secondary-outline" size="md" onClick={() => navigate("/how-it-works")}>
              See the full process →
            </Button>
          </div>
        </Container>
      </section>

      {/* TESTIMONIALS TEASER */}
      <section className="mk-section mk-section--subtle" aria-label="Testimonials" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">What drivers say</h2>
            <p className="mk-lead">UI-only placeholders to illustrate a professional marketing experience.</p>
          </div>

          <div className="mk-grid3" data-reveal-stagger>
            <Card title="“Finally, a clean flow.”" subtitle="Priya • Flat tire" className="mk-card">
              <p className="p">
                “Submitting the request was quick, and the status updates were easy to understand. No back-and-forth.”
              </p>
            </Card>
            <Card title="“Fewer steps when stressed.”" subtitle="Jordan • Battery issue" className="mk-card">
              <p className="p">
                “The form didn’t feel overwhelming on my phone. I got the basics in and could track progress.”
              </p>
            </Card>
            <Card title="“Clear and professional.”" subtitle="Sam • Engine warning light" className="mk-card">
              <p className="p">
                “Everything looked organized—exactly what I want when I’m stuck and trying to get help quickly.”
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* CTA BAND */}
      <section className="mk-ctaBand" aria-label="Call to action" data-reveal data-reveal-variant="up">
        <Container>
          <div className="mk-ctaBand__inner">
            <div>
              <h2 className="mk-ctaBand__title">Need help right now?</h2>
              <p className="mk-ctaBand__subtitle">
                Submit a request and track progress with a clean, driver-first experience. No real-time tracking—just the
                essentials that move you forward.
              </p>
              <div className="mk-ctaBand__note">
                {isAuthenticated ? (
                  <span>
                    You’re signed in—go straight to <strong>Submit Request</strong>.
                  </span>
                ) : (
                  <span>
                    Not signed in yet? We’ll take you to <strong>Login</strong> first.
                  </span>
                )}
              </div>
            </div>

            <div className="mk-ctaBand__actions" aria-label="CTA actions">
              <Button onClick={onGetHelpNow} size="lg" style={{ minWidth: 180 }}>
                Get Help Now
              </Button>
              <Button variant="secondary-solid" size="lg" onClick={() => navigate("/how-it-works")}>
                Learn How It Works
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <div className="mk-bottomSpacer" aria-hidden="true" />
    </div>
  );
}

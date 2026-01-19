import React, { useMemo, useState } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";

function TeamMember({ name, role, blurb }) {
  return (
    <div className="mk-teamMember">
      <div className="mk-avatar" aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </div>
      <div>
        <div className="mk-teamMember__name">{name}</div>
        <div className="mk-teamMember__role">{role}</div>
        <div className="mk-teamMember__blurb">{blurb}</div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function AboutPage() {
  /** Long-form “About” marketing page for RoadRescue QuickAssist (UI-only). */
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useScrollReveal();

  const onPrimary = () => {
    navigate(isAuthenticated ? "/submit" : "/login");
  };

  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const team = useMemo(
    () => [
      {
        name: "Operations Lead",
        role: "Driver experience & coordination",
        blurb: "Focused on reducing friction during roadside incidents and making status updates easy to follow.",
      },
      {
        name: "Platform Engineer",
        role: "Frontend & product foundations",
        blurb: "Builds the component system and responsive layout patterns that keep the UI clean and consistent.",
      },
      {
        name: "Safety & Trust",
        role: "Policy, vetting, and data handling",
        blurb: "Ensures the product direction supports mechanic vetting and privacy-respecting data practices.",
      },
    ],
    []
  );

  return (
    <div className="mk-page">
      {/* HERO */}
      <section className="mk-hero mk-hero--compact" aria-label="About hero" data-reveal data-reveal-variant="up">
        <Container>
          <div className="mk-hero__inner">
            <p className="mk-eyebrow">About RoadRescue QuickAssist</p>
            <h1 className="mk-title">Roadside help should feel modern, clear, and trustworthy.</h1>
            <p className="mk-subtitle">
              QuickAssist is a focused MVP that improves the first mile of roadside assistance: quick request intake,
              consistent updates, and a driver-first experience designed to work smoothly on mobile.
            </p>

            <div className="mk-hero__actions">
              <Button onClick={onPrimary} size="lg" style={{ minWidth: 180 }}>
                Get Help Now
              </Button>
              <Button variant="secondary-outline" size="lg" onClick={() => navigate("/how-it-works")}>
                Learn How It Works
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* OUR MISSION */}
      <section className="mk-section" aria-label="Our mission" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">Our Mission</h2>
            <p className="mk-lead">
              Create a calm, reliable flow for drivers to request help—then stay informed with professional updates until
              they’re safely moving again.
            </p>
          </div>

          <div className="mk-grid2" data-reveal-stagger>
            <Card className="mk-card" title="Driver-first design" subtitle="Built for roadside stress and mobile use.">
              <p className="p">
                We focus on what drivers actually need at the roadside: a quick way to submit the essentials and a simple
                dashboard view that answers “what’s happening?” at a glance.
              </p>
              <ul className="mk-list">
                <li>Clear headings, spacing, and card layouts</li>
                <li>High-contrast CTAs and readable typography</li>
                <li>Accessible UI basics (semantic structure, focus states)</li>
              </ul>
            </Card>

            <Card className="mk-card" title="MVP scope, product-ready foundations" subtitle="Focused now, scalable later.">
              <p className="p">
                The MVP avoids complexity like maps and real-time tracking. Instead, it demonstrates a strong marketing
                and request-tracking UI with a foundation ready for secure auth and notifications.
              </p>
              <ul className="mk-list">
                <li>No maps / no real-time tracking in MVP</li>
                <li>Clean routing and consistent layout patterns</li>
                <li>Prepared for mechanic vetting workflows</li>
              </ul>
            </Card>
          </div>
        </Container>
      </section>

      {/* HOW WE OPERATE */}
      <section className="mk-section mk-section--subtle" aria-label="How we operate" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">How We Operate</h2>
            <p className="mk-lead">
              QuickAssist is designed to reduce ambiguity: capture the right details once, keep updates consistent, and
              support a professional service handoff.
            </p>
          </div>

          <div className="mk-grid3" data-reveal-stagger>
            <Card className="mk-card" title="Request intake" subtitle="Collect the essentials with minimal friction.">
              <p className="p">
                Drivers submit vehicle information, issue description, and contact details in a clean form. This makes it
                easier to coordinate assistance without repeated calls.
              </p>
            </Card>
            <Card className="mk-card" title="Matching workflow" subtitle="Built for a vetted mechanic network.">
              <p className="p">
                The architecture supports approvals and role-based access in the broader platform, helping ensure drivers
                get assistance from trusted mechanics.
              </p>
            </Card>
            <Card className="mk-card" title="Communication" subtitle="Clear updates with notification capability.">
              <p className="p">
                Status updates are presented cleanly in the UI, with the ability to add SMS notifications via Twilio as
                needed.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* TECHNOLOGY */}
      <section className="mk-section" aria-label="Technology" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">Technology</h2>
            <p className="mk-lead">
              Built with a modern web stack to support secure authentication, persistence, and notification capabilities.
            </p>
          </div>

          <div className="mk-grid2" data-reveal-stagger>
            <Card className="mk-card" title="Frontend" subtitle="React single-page experience">
              <ul className="mk-list">
                <li>React-based UI with reusable components</li>
                <li>Ocean Professional theme (primary #2563EB, accent #F59E0B)</li>
                <li>Responsive layout optimized for mobile and desktop</li>
              </ul>
            </Card>

            <Card className="mk-card" title="Backend services (capabilities)" subtitle="Supabase + Twilio">
              <ul className="mk-list">
                <li>Supabase for authentication and data storage</li>
                <li>Structured for role-based profiles (user/mechanic/admin)</li>
                <li>Twilio SMS notification capability for updates</li>
              </ul>
            </Card>
          </div>
        </Container>
      </section>

      {/* SAFETY & TRUST */}
      <section className="mk-section mk-section--subtle" aria-label="Safety and trust" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">Safety & Trust</h2>
            <p className="mk-lead">
              We take trust seriously. The MVP emphasizes clarity and privacy-respecting scope while supporting a path to
              vetted service and secure data handling.
            </p>
          </div>

          <div className="mk-grid3" data-reveal-stagger>
            <Card className="mk-card" title="Vetted mechanics" subtitle="Support for approvals and workflows">
              <p className="p">
                The platform is structured to support reviewing and approving mechanics, creating a more reliable service
                experience over time.
              </p>
            </Card>
            <Card className="mk-card" title="Privacy-first MVP scope" subtitle="No real-time tracking">
              <p className="p">
                We avoid real-time maps and tracking in the MVP. Requests focus on essential details to coordinate help
                without excessive data collection.
              </p>
            </Card>
            <Card className="mk-card" title="Secure identity" subtitle="Supabase authentication foundation">
              <p className="p">
                Authentication is designed around Supabase so drivers can securely submit and review their requests.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* CONTACT */}
      <section className="mk-section" aria-label="Contact" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">Contact</h2>
            <p className="mk-lead">UI-only contact form for MVP presentation (no backend submission).</p>
          </div>

          <div className="mk-grid2" data-reveal-stagger>
            <Card
              className="mk-card"
              title="Send a message"
              subtitle="We’ll respond as soon as possible (demo UI)."
              actions={
                <a className="link" href="mailto:support@roadrescue.example">
                  Or email us →
                </a>
              }
            >
              {sent ? (
                <div className="alert alert-success" style={{ marginBottom: 12 }}>
                  Message saved locally (UI-only). Thanks for reaching out!
                </div>
              ) : null}

              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  // UI-only: simulate send
                  setSent(true);
                }}
              >
                <div className="grid2">
                  <div className="field">
                    <label className="label" htmlFor="contactName">
                      Name
                    </label>
                    <input
                      id="contactName"
                      className="input"
                      value={contact.name}
                      onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="contactEmail">
                      Email
                    </label>
                    <input
                      id="contactEmail"
                      className="input"
                      type="email"
                      value={contact.email}
                      onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="contactMsg">
                    Message
                  </label>
                  <textarea
                    id="contactMsg"
                    className="textarea"
                    value={contact.message}
                    onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))}
                    placeholder="How can we help?"
                    rows={4}
                  />
                </div>

                <div className="row">
                  <Button type="submit" size="lg">
                    Send message
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setContact({ name: "", email: "", message: "" });
                      setSent(false);
                    }}
                  >
                    Reset
                  </Button>
                </div>

                <div className="note">
                  MVP note: This form does not send data to a server; it’s included for a professional marketing-page
                  layout.
                </div>
              </form>
            </Card>

            <Card className="mk-card" title="Support details" subtitle="UI-only placeholders for MVP">
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
                  <span className="k">Service scope</span>
                  <span className="v">Breakdowns, towing, jump-start, flats (MVP)</span>
                </div>
              </div>
              <div className="note">This is a demo contact block for UI presentation.</div>
            </Card>
          </div>
        </Container>
      </section>

      {/* TEAM */}
      <section className="mk-section mk-section--subtle" aria-label="Team" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">Small team, strong focus</h2>
            <p className="mk-lead">
              QuickAssist is built as a focused MVP. The team section uses placeholder members for a professional
              marketing feel.
            </p>
          </div>

          <Card className="mk-card" title="Team" subtitle="Placeholder roles for MVP marketing presentation.">
            <div className="mk-teamGrid" role="list" aria-label="Team members" data-reveal-stagger>
              {team.map((t) => (
                <div key={t.name} role="listitem">
                  <TeamMember name={t.name} role={t.role} blurb={t.blurb} />
                </div>
              ))}
            </div>
          </Card>
        </Container>
      </section>

      {/* CTA BAND */}
      <section className="mk-ctaBand" aria-label="Call to action" data-reveal data-reveal-variant="up">
        <Container>
          <div className="mk-ctaBand__inner">
            <div>
              <h2 className="mk-ctaBand__title">Ready to try QuickAssist?</h2>
              <p className="mk-ctaBand__subtitle">
                Submit a request and track progress with a clean, modern interface designed for roadside situations.
              </p>
              <div className="mk-ctaBand__note">
                <span>
                  Prefer to learn first? Visit <strong>How It Works</strong> for the full flow.
                </span>
              </div>
            </div>

            <div className="mk-ctaBand__actions">
              <Button onClick={onPrimary} size="lg" style={{ minWidth: 180 }}>
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

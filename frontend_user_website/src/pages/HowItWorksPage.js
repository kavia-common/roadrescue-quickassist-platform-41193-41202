import React, { useMemo, useState } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";

function FlowStep({ n, icon, title, subtitle, bullets }) {
  return (
    <Card
      className="mk-card mk-flowCard"
      title={`${n}. ${title}`}
      subtitle={subtitle}
      actions={
        <span className="mk-flowBadge" aria-label={`Step ${n}`}>
          Step {n} of 4
        </span>
      }
    >
      <div className="mk-flowCard__icon" aria-hidden="true">
        {icon}
      </div>
      <ul className="mk-list" style={{ marginTop: 10 }}>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </Card>
  );
}

function FaqItem({ q, a, open, onToggle, id }) {
  return (
    <div className="mk-faqItem">
      <button type="button" className="mk-faqBtn" onClick={onToggle} aria-expanded={open ? "true" : "false"} aria-controls={id}>
        <span className="mk-faqQ">{q}</span>
        <span className="mk-faqChevron" aria-hidden="true">
          {open ? "–" : "+"}
        </span>
      </button>
      <div id={id} className={open ? "mk-faqA mk-faqA--open" : "mk-faqA"}>
        <div className="mk-faqA__inner">{a}</div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function HowItWorksPage() {
  /** Long-form “How it works” marketing page for RoadRescue QuickAssist (UI-only). */
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useScrollReveal();

  const onPrimary = () => {
    navigate(isAuthenticated ? "/submit" : "/login");
  };

  const faq = useMemo(
    () => [
      {
        q: "How fast is the response time?",
        a:
          "Response time depends on availability and location. In this MVP, we focus on a clear request and status experience. In the full product, mechanics are matched based on availability and proximity.",
      },
      {
        q: "What areas do you cover?",
        a:
          "Coverage is flexible and can expand over time. For the MVP, we’re demonstrating the user experience for request intake and tracking—without maps or real-time location tracking.",
      },
      {
        q: "Is pricing transparent?",
        a:
          "The product is designed for transparent pricing and clear communication. In later iterations, you can see estimated fees and service details before work begins.",
      },
      {
        q: "Do I need an account to request help?",
        a:
          "For the MVP experience, signing in is required to submit and track requests. This supports a secure, consistent flow (Supabase-ready authentication).",
      },
      {
        q: "Will I get SMS updates?",
        a:
          "The platform supports SMS updates via Twilio integration. In the MVP UI, the flow is shown and the capability is demonstrated where available.",
      },
    ],
    []
  );

  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="mk-page">
      {/* HERO */}
      <section className="mk-hero mk-hero--compact" aria-label="How it works hero" data-reveal data-reveal-variant="up">
        <Container>
          <div className="mk-hero__inner">
            <p className="mk-eyebrow">How It Works</p>
            <h1 className="mk-title">A simple 4-step flow for roadside breakdown help.</h1>
            <p className="mk-subtitle">
              QuickAssist is designed to feel calm and clear—even when you’re stressed. Submit a request, get matched to
              help, receive updates, and resolve the issue.
            </p>

            <div className="mk-hero__actions">
              <Button onClick={onPrimary} size="lg" style={{ minWidth: 180 }}>
                Get Help Now
              </Button>
              <Button variant="secondary-outline" size="lg" onClick={() => navigate("/why-choose-us")}>
                Why Choose Us
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* FLOW */}
      <section className="mk-section" aria-label="Detailed process" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">The QuickAssist flow</h2>
            <p className="mk-lead">
              Each step is intentionally lightweight. We capture only what’s needed to route help efficiently and keep
              you informed with professional status updates.
            </p>
          </div>

          <div className="mk-grid2">
            <FlowStep
              n={1}
              icon="📝"
              title="Request"
              subtitle="Tell us what happened and how to reach you."
              bullets={[
                "Add vehicle details and the issue description (flat tire, battery, warning lights, etc.).",
                "Share your contact phone number for coordination.",
                "Provide an address or descriptive location (MVP: no maps, no GPS permissions).",
              ]}
            />

            <FlowStep
              n={2}
              icon="🤝"
              title="Match"
              subtitle="Connect to an available mechanic (MVP-ready structure)."
              bullets={[
                "In the full product, requests are matched by availability and service capability.",
                "Mechanic approvals and profiles support a vetted network.",
                "The UI is built to scale without introducing complexity for drivers.",
              ]}
            />

            <FlowStep
              n={3}
              icon="📣"
              title="Notify"
              subtitle="Stay informed with consistent, readable updates."
              bullets={[
                "Status badges and request history keep you informed without repeated calls.",
                "SMS updates are supported via Twilio integration (capability).",
                "Your request page provides a single source of truth for progress.",
              ]}
            />

            <FlowStep
              n={4}
              icon="🛠️"
              title="Assist"
              subtitle="Resolve the issue and get back on the road."
              bullets={[
                "Mechanic arrives and coordinates next steps using the request details.",
                "Completion updates close the loop in your dashboard.",
                "The experience is optimized for mobile-first use on the roadside.",
              ]}
            />
          </div>

          <div className="mk-inlineCtas" aria-label="Flow actions">
            <Button variant="secondary-outline" onClick={() => navigate("/")}>
              ← Back to Home
            </Button>
            <Button variant="secondary-solid" onClick={() => navigate("/why-choose-us")}>
              Explore benefits →
            </Button>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="mk-section mk-section--subtle" aria-label="FAQ" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">FAQ</h2>
            <p className="mk-lead">Answers to common questions about QuickAssist (UI-only).</p>
          </div>

          <div className="mk-faq" role="region" aria-label="Frequently asked questions">
            {faq.map((item, idx) => (
              <FaqItem
                key={item.q}
                q={item.q}
                a={item.a}
                id={`faq-${idx}`}
                open={openIndex === idx}
                onToggle={() => setOpenIndex((cur) => (cur === idx ? -1 : idx))}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* CTA BAND */}
      <section className="mk-ctaBand" aria-label="Get help call to action" data-reveal data-reveal-variant="up">
        <Container>
          <div className="mk-ctaBand__inner">
            <div>
              <h2 className="mk-ctaBand__title">Ready to request help?</h2>
              <p className="mk-ctaBand__subtitle">
                Submit your breakdown details and track progress in a clean, professional UI built for roadside
                situations.
              </p>
              <div className="mk-ctaBand__note">
                <span>
                  Primary flow: <strong>Request → Match → Notify → Assist</strong>
                </span>
              </div>
            </div>

            <div className="mk-ctaBand__actions">
              <Button onClick={onPrimary} size="lg" style={{ minWidth: 180 }}>
                Get Help Now
              </Button>
              <Button variant="secondary-solid" size="lg" onClick={() => navigate("/about")}>
                About RoadRescue
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <div className="mk-bottomSpacer" aria-hidden="true" />
    </div>
  );
}

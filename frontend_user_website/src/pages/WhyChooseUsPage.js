import React from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";

function Reason({ icon, title, text }) {
  return (
    <Card className="mk-card" title={title} subtitle={text}>
      <div className="mk-reasonIcon" aria-hidden="true">
        {icon}
      </div>
    </Card>
  );
}

function CompareCard({ title, items, tone = "neutral" }) {
  return (
    <div className={tone === "good" ? "mk-compare mk-compare--good" : tone === "bad" ? "mk-compare mk-compare--bad" : "mk-compare"}>
      <div className="mk-compare__title">{title}</div>
      <ul className="mk-list mk-compare__list">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

// PUBLIC_INTERFACE
export function WhyChooseUsPage() {
  /** Long-form “Why choose us” marketing page for RoadRescue QuickAssist (UI-only). */
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useScrollReveal();

  const onPrimary = () => {
    navigate(isAuthenticated ? "/submit" : "/login");
  };

  return (
    <div className="mk-page">
      {/* HERO */}
      <section className="mk-hero mk-hero--compact" aria-label="Why choose us hero" data-reveal data-reveal-variant="up">
        <Container>
          <div className="mk-hero__inner">
            <p className="mk-eyebrow">Why Choose RoadRescue QuickAssist</p>
            <h1 className="mk-title">A roadside assistance experience built for speed, trust, and clarity.</h1>
            <p className="mk-subtitle">
              Most breakdown experiences are fragmented—calls, repeated questions, unclear updates. QuickAssist focuses on
              a modern, secure, and transparent flow that keeps drivers informed.
            </p>

            <div className="mk-hero__actions">
              <Button onClick={onPrimary} size="lg" style={{ minWidth: 180 }}>
                Get Help Now
              </Button>
              <Button variant="secondary-outline" size="lg" onClick={() => navigate("/how-it-works")}>
                Learn the process
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* REASONS GRID */}
      <section className="mk-section" aria-label="Reasons grid" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">What makes QuickAssist different</h2>
            <p className="mk-lead">
              Built to be an MVP that feels like a product: professional UI, strong foundations, and a clear driver-first
              flow.
            </p>
          </div>

          <div className="mk-grid3" data-reveal-stagger>
            <Reason
              icon="⚡"
              title="Fast Response Intake"
              text="A clean form that helps you submit a breakdown request quickly—optimized for mobile and roadside stress."
            />
            <Reason
              icon="✅"
              title="Vetted Mechanics"
              text="Designed for a vetted mechanic network with approvals and structured profiles (product-ready architecture)."
            />
            <Reason
              icon="💵"
              title="Transparent Pricing"
              text="Built for clarity and pricing transparency in later iterations—no surprise charges, clear breakdowns."
            />
            <Reason
              icon="🕒"
              title="24/7 Availability"
              text="Roadside issues don’t follow business hours. The platform experience is designed to be available anytime."
            />
            <Reason
              icon="🔒"
              title="Secure Auth via Supabase"
              text="Authentication and user identity are designed with Supabase, supporting secure access and consistent tracking."
            />
            <Reason
              icon="📩"
              title="SMS Updates via Twilio"
              text="Capability for driver notifications by SMS, helping you stay informed when you’re away from your phone."
            />
            <Reason
              icon="🧭"
              title="Simple Request Flow"
              text="No clutter: request, updates, and request history—organized into a calm interface with modern UI patterns."
            />
            <Reason
              icon="🛡️"
              title="Privacy & Data Security"
              text="MVP avoids real-time tracking; data handling is structured for secure storage and least-surprise UX."
            />
          </div>
        </Container>
      </section>

      {/* COMPARISON */}
      <section className="mk-section mk-section--subtle" aria-label="Comparison" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">QuickAssist vs. typical call centers</h2>
            <p className="mk-lead">
              A modern experience that reduces repeated questions and keeps everything in one place.
            </p>
          </div>

          <div className="mk-grid2">
            <CompareCard
              tone="good"
              title="RoadRescue QuickAssist"
              items={[
                "Fast digital request intake with clear fields",
                "Status updates in a clean dashboard",
                "Secure authentication architecture (Supabase)",
                "SMS notification capability (Twilio)",
                "Designed for mobile-first use",
              ]}
            />
            <CompareCard
              tone="bad"
              title="Typical call center flow"
              items={[
                "Multiple calls and repeated questions",
                "Unclear progress updates",
                "Hard to reference details later",
                "Long hold times during peak periods",
                "Inconsistent driver experience across agents",
              ]}
            />
          </div>
        </Container>
      </section>

      {/* TRUST INDICATORS */}
      <section className="mk-section" aria-label="Trust indicators" data-reveal>
        <Container>
          <div className="mk-section__head">
            <h2 className="mk-h2">Trust indicators</h2>
            <p className="mk-lead">UI-only placeholders for a professional marketing presentation.</p>
          </div>

          <div className="mk-trustRow" role="list" aria-label="Trust badges">
            <div className="mk-trustBadge" role="listitem">
              <span aria-hidden="true">🧾</span>
              <span>Pricing transparency</span>
            </div>
            <div className="mk-trustBadge" role="listitem">
              <span aria-hidden="true">🔐</span>
              <span>Security-first foundations</span>
            </div>
            <div className="mk-trustBadge" role="listitem">
              <span aria-hidden="true">🛠️</span>
              <span>Mechanic vetting workflow</span>
            </div>
            <div className="mk-trustBadge" role="listitem">
              <span aria-hidden="true">📱</span>
              <span>Mobile-first UX</span>
            </div>
          </div>

          <div className="mk-grid3" style={{ marginTop: 14 }} data-reveal-stagger>
            <Card className="mk-card" title="“Clear updates”" subtitle="Taylor • Towing needed">
              <p className="p">
                “Having everything in one place helped me stay calm. I didn’t have to keep calling for an update.”
              </p>
            </Card>
            <Card className="mk-card" title="“Felt trustworthy”" subtitle="Asha • Battery jump-start">
              <p className="p">
                “The app experience looked professional and clear, which made me feel more confident about the service.”
              </p>
            </Card>
            <Card className="mk-card" title="“Less friction”" subtitle="Chris • Flat tire">
              <p className="p">
                “It took me less than a minute to submit. That’s exactly what I want when I’m stuck on the roadside.”
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
              <h2 className="mk-ctaBand__title">Experience a cleaner way to get roadside help.</h2>
              <p className="mk-ctaBand__subtitle">
                Submit your request and track progress with a modern interface built for drivers—fast, secure, and
                transparent.
              </p>
              <div className="mk-ctaBand__note">
                <span>
                  You can also learn about the product vision on the <strong>About</strong> page.
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

import React from "react";
import { Container } from "../ui/Container";

// PUBLIC_INTERFACE
export function UserShell({ title, subtitle, children }) {
  /**
   * Authenticated layout shell.
   *
   * NOTE: Per updated UI requirements, the left-side quick access panel is removed.
   * Navigation is still available via the main navbar, and pages render full-width content here.
   */
  return (
    <div className="user-shell">
      <Container>
        <div className="user-shell__top">
          <div className="user-shell__header">
            <div>
              {title ? <h1 className="h1 user-shell__title">{title}</h1> : null}
              {subtitle ? <p className="lead user-shell__subtitle">{subtitle}</p> : null}
            </div>
          </div>
        </div>
      </Container>

      <div className="user-shell__content">
        <Container>
          <section className="user-shell__main user-shell__main--full" aria-label="Page content">
            {children}
          </section>
        </Container>
      </div>
    </div>
  );
}

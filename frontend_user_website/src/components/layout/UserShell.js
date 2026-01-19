import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";

function shellNavLinkClass({ isActive }) {
  return isActive ? "shell-link shell-link-active" : "shell-link";
}

// PUBLIC_INTERFACE
export function UserShell({ title, subtitle, children }) {
  /**
   * Authenticated layout shell with optional, collapsible sidebar (UI-only).
   *
   * Used on authenticated user pages to provide quick access to:
   * - Submit Request
   * - My Requests
   */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { to: "/submit", label: "Submit Request" },
      { to: "/requests", label: "My Requests" },
    ],
    []
  );

  return (
    <div className="user-shell">
      <Container>
        <div className="user-shell__top">
          <div className="user-shell__header">
            <div>
              {title ? <h1 className="h1 user-shell__title">{title}</h1> : null}
              {subtitle ? <p className="lead user-shell__subtitle">{subtitle}</p> : null}
            </div>

            <div className="user-shell__headerActions">
              <Button
                variant="ghost"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-expanded={sidebarOpen ? "true" : "false"}
                aria-controls="userSidebar"
              >
                {sidebarOpen ? "Hide menu" : "Show menu"}
              </Button>
            </div>
          </div>

          {/* Desktop quick links (always visible) */}
          <nav className="user-shell__quickNav" aria-label="User quick navigation">
            {navItems.map((n) => (
              <NavLink key={n.to} to={n.to} className={shellNavLinkClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </Container>

      <div className="user-shell__content">
        <Container>
          <div className="user-shell__grid">
            {/* Sidebar: collapsible on mobile, sticky-ish on desktop */}
            <aside
              id="userSidebar"
              className={sidebarOpen ? "user-shell__sidebar user-shell__sidebar--open" : "user-shell__sidebar"}
              aria-label="User sidebar"
            >
              <div className="user-shell__sidebarCard">
                <div className="user-shell__sidebarTitle">Quick Access</div>
                <div className="user-shell__sidebarLinks">
                  {navItems.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      className={shellNavLinkClass}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {n.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </aside>

            <section className="user-shell__main" aria-label="Page content">
              {children}
            </section>
          </div>
        </Container>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";

function navLinkClass({ isActive }) {
  return isActive ? "navlink active" : "navlink";
}

// PUBLIC_INTERFACE
export function Navbar() {
  /** Sticky responsive navigation with role-based links (UI-only). */
  const navigate = useNavigate();
  const { isAuthenticated, role, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const publicLinks = useMemo(
    () => [
      { to: "/", label: "Home" },
      { to: "/how-it-works", label: "How It Works" },
      { to: "/why-choose-us", label: "Why Choose Us" },
      { to: "/about", label: "About" },
    ],
    []
  );

  const authedUserLinks = useMemo(
    () => [
      { to: "/submit", label: "Submit Request" },
      { to: "/requests", label: "My Requests" },
      { to: "/about", label: "About" },
    ],
    []
  );

  const links = useMemo(() => {
    if (isAuthenticated && role === "user") return authedUserLinks;
    return publicLinks;
  }, [isAuthenticated, role, authedUserLinks, publicLinks]);

  const onLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link
          to="/"
          className="brand"
          aria-label="RoadRescue home"
          onClick={() => setOpen(false)}
          style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
        >
          <img
            src="/assets/roadrescue-logo.jpeg"
            alt="RoadRescue logo"
            style={{
              height: 28,
              width: 28,
              objectFit: "contain",
              display: "block",
            }}
          />
          <span>
            RoadRescue <span className="brand-accent">QuickAssist</span>
          </span>
        </Link>

        <nav className="navlinks navlinks-desktop" aria-label="Primary navigation">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLinkClass} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-right">
          {/* Desktop auth CTAs */}
          {!isAuthenticated ? (
            <div className="nav-cta navlinks-desktop" aria-label="Auth actions">
              <NavLink to="/login" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
                Login
              </NavLink>
              <Button
                variant="secondary-solid"
                size="md"
                onClick={() => {
                  setOpen(false);
                  navigate("/register");
                }}
              >
                Register
              </Button>
            </div>
          ) : (
            <>
              <span className="chip" title="Signed in role">
                {role === "user" ? "User" : "Public"}
              </span>
              <Button variant="ghost" onClick={onLogout}>
                Logout
              </Button>
            </>
          )}

          <button
            type="button"
            className="icon-btn nav-hamburger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open ? "true" : "false"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="nav-mobile" role="region" aria-label="Mobile navigation">
          <div className="container nav-mobile-inner">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? "navlink navlink-mobile active" : "navlink navlink-mobile")}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}

            {!isAuthenticated ? (
              <div className="nav-mobile-cta">
                <NavLink
                  to="/login"
                  className={({ isActive }) => (isActive ? "navlink navlink-mobile active" : "navlink navlink-mobile")}
                  onClick={() => setOpen(false)}
                >
                  Login
                </NavLink>
                <Button
                  variant="secondary-solid"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={() => {
                    setOpen(false);
                    navigate("/register");
                  }}
                >
                  Create account
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={onLogout} style={{ width: "100%", marginTop: 8 }}>
                Logout
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

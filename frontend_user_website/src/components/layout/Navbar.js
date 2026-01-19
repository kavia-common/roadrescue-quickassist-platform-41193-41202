import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";

function navLinkClass({ isActive }) {
  return isActive ? "navlink active" : "navlink";
}

// PUBLIC_INTERFACE
export function Navbar() {
  /** Sticky responsive navigation with role-based links. */
  const navigate = useNavigate();
  const { isAuthenticated, role, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const links = useMemo(() => {
    if (isAuthenticated && role === "user") {
      return [
        { to: "/submit", label: "Submit Request" },
        { to: "/requests", label: "My Requests" },
        { to: "/about", label: "About" },
      ];
    }

    return [
      { to: "/", label: "Home" },
      { to: "/how-it-works", label: "How It Works" },
      { to: "/why-choose-us", label: "Why Choose Us" },
      { to: "/about", label: "About" },
      { to: "/login", label: "Login" },
      { to: "/register", label: "Register" },
    ];
  }, [isAuthenticated, role]);

  const onLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="RoadRescue home" onClick={() => setOpen(false)}>
          RoadRescue <span className="brand-accent">QuickAssist</span>
        </Link>

        <nav className="navlinks navlinks-desktop" aria-label="Primary navigation">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLinkClass} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <span className="chip" title="Signed in role">
                {role === "user" ? "User" : "Public"}
              </span>
              <Button variant="ghost" onClick={onLogout}>
                Logout
              </Button>
            </>
          ) : null}

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

            {isAuthenticated ? (
              <Button variant="ghost" onClick={onLogout} style={{ width: "100%", marginTop: 8 }}>
                Logout
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

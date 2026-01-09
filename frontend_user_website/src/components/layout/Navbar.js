import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { dataService } from "../../services/dataService";

// PUBLIC_INTERFACE
export function Navbar({ user }) {
  /** Top navigation bar. */
  const navigate = useNavigate();

  const onLogout = async () => {
    await dataService.logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          RoadRescue <span className="brand-accent">QuickAssist</span>
        </Link>

        <nav className="navlinks" aria-label="Primary navigation">
          {user ? (
            <>
              <NavLink to="/submit" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
                Submit Request
              </NavLink>
              <NavLink to="/requests" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
                My Requests
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
                About
              </NavLink>

            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
                Login
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
                Register
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
                About
              </NavLink>
            </>
          )}
        </nav>

        <div className="nav-right">
          {user ? (
            <>
              <span className="chip" title={user.email}>
                {user.role === "admin" ? "Admin" : user.role === "mechanic" ? "Mechanic" : "User"}
              </span>
              <Button variant="ghost" onClick={onLogout}>
                Log out
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

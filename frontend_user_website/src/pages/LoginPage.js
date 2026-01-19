import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

function getRedirectTo(location) {
  const from = location?.state?.from;
  if (typeof from === "string" && from.startsWith("/")) return from;
  return "/submit";
}

/**
 * PUBLIC_INTERFACE
 */
export function LoginPage() {
  /** Login page (mock). */
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const redirectTo = useMemo(() => getRedirectTo(location), [location]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (!email.trim()) return setStatus({ type: "error", message: "Email is required." });
    if (password.length < 6) return setStatus({ type: "error", message: "Password must be at least 6 characters (mock validation)." });

    setBusy(true);
    try {
      await login(email.trim(), password);
      setStatus({ type: "success", message: "Logged in successfully. Redirecting…" });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setStatus({ type: "error", message: err?.message || "Login failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Welcome back</h1>
        <p className="lead">Log in to submit and track your roadside assistance requests.</p>
      </div>

      <Card
        title="Login"
        subtitle="Mock login for MVP (Supabase-ready structure)."
        actions={
          <Link className="link" to="/register">
            Create account
          </Link>
        }
      >
        {isAuthenticated ? <div className="alert alert-info">You are already logged in.</div> : null}

        {status.message ? (
          <div className={`alert ${status.type === "success" ? "alert-success" : status.type === "error" ? "alert-error" : "alert-info"}`} style={{ marginBottom: 12 }}>
            {status.message}
          </div>
        ) : null}

        <form onSubmit={submit} className="form">
          <Input label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            hint="MVP mock: any 6+ characters."
            disabled={busy}
          />

          <div className="row">
            <Button type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <Link className="link" to="/about">
              About
            </Link>
          </div>
        </form>

        <div className="note">
          Supabase hook point: replace <code>login()</code> in <code>AuthContext</code> with <code>supabase.auth.signInWithPassword</code>.
        </div>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { dataService } from "../services/dataService";

/**
 * PUBLIC_INTERFACE
 */
export function LoginPage({ onAuthed, bootError = "", bootResolved = true }) {
  /** Login page for users. */
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(bootError || "");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  useEffect(() => {
    // Keep local error banner aligned with boot failures / redirect message.
    setError(bootError || "");
  }, [bootError]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const u = await dataService.login(email.trim(), password);
      onAuthed?.(u);
      navigate("/submit");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setError("");
    setOauthBusy(true);
    try {
      await dataService.loginWithGoogle({ redirectTo: window.location.origin });
      // Typically redirects away; if it doesn't, the auth listener will update the app shell.
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
      setOauthBusy(false);
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
        subtitle="Sign in with your real account."
        actions={
          <Link className="link" to="/register">
            Create account
          </Link>
        }
      >
        <div className="form" style={{ marginBottom: 12 }}>
          <Button variant="ghost" disabled={oauthBusy || busy} onClick={signInWithGoogle} style={{ width: "100%" }}>
            {oauthBusy ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
          <div className="divider" style={{ margin: "6px 0 0" }} />
        </div>

        <form onSubmit={submit} className="form">
          {!bootResolved ? (
            <div className="alert" style={{ background: "rgba(37,99,235,0.06)" }}>
              Checking your session… You can still log in if this takes too long.
            </div>
          ) : null}

          <Input label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={oauthBusy} />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={oauthBusy}
          />
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="row">
            <Button type="submit" disabled={busy || oauthBusy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
            <Link className="link" to="/about">
              About data & auth
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

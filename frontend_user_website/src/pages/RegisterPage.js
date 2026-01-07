import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { dataService } from "../services/dataService";

// PUBLIC_INTERFACE
export function RegisterPage({ onAuthed }) {
  /** Registration page for users. */
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  const supabaseEnabled = useMemo(() => dataService.isSupabaseConfigured(), []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const u = await dataService.register(email.trim(), password);
      onAuthed?.(u);
      navigate("/submit");
    } catch (err) {
      setError(err.message || "Registration failed.");
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
        <h1 className="h1">Create your account</h1>
        <p className="lead">Start a new request in under a minute.</p>
      </div>

      <Card
        title="Register"
        subtitle="Email/password auth (Supabase if configured; otherwise local demo)."
        actions={
          <Link className="link" to="/login">
            Back to login
          </Link>
        }
      >
        <div className="form" style={{ marginBottom: 12 }}>
          <Button variant="ghost" disabled={!supabaseEnabled || oauthBusy || busy} onClick={signInWithGoogle} style={{ width: "100%" }}>
            {oauthBusy ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
          {!supabaseEnabled ? (
            <div className="hint">
              Google sign-in requires Supabase mode. Set <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_KEY</code>.
            </div>
          ) : null}
          <div className="divider" style={{ margin: "6px 0 0" }} />
        </div>

        <form onSubmit={submit} className="form">
          <Input label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={oauthBusy} />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            hint="At least 6 characters."
            disabled={oauthBusy}
          />
          <Input
            label="Confirm password"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={oauthBusy}
          />
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="row">
            <Button type="submit" disabled={busy || oauthBusy}>
              {busy ? "Creating..." : "Create account"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

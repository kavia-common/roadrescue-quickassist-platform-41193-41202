import React, { useState } from "react";
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
        <form onSubmit={submit} className="form">
          <Input label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            hint="At least 6 characters."
          />
          <Input
            label="Confirm password"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="row">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create account"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

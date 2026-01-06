import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { dataService } from "../services/dataService";

// PUBLIC_INTERFACE
export function LoginPage({ onAuthed }) {
  /** Login page for users. */
  const navigate = useNavigate();
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Welcome back</h1>
        <p className="lead">Log in to submit and track your roadside assistance requests.</p>
      </div>

      <Card
        title="Login"
        subtitle="Use the seeded demo account or your own."
        actions={
          <Link className="link" to="/register">
            Create account
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
          />
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="row">
            <Button type="submit" disabled={busy}>
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

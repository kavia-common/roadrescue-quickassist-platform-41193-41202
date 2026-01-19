import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

// PUBLIC_INTERFACE
export function RegisterPage() {
  /** Registration page (mock). */
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (!email.trim()) return setStatus({ type: "error", message: "Email is required." });
    if (password.length < 6) return setStatus({ type: "error", message: "Password must be at least 6 characters (mock validation)." });
    if (password !== confirm) return setStatus({ type: "error", message: "Passwords do not match." });

    setBusy(true);
    try {
      await register(email.trim(), password);
      setStatus({ type: "success", message: "Account created. Redirecting…" });
      navigate("/submit", { replace: true });
    } catch (err) {
      setStatus({ type: "error", message: err?.message || "Registration failed." });
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
        subtitle="Mock register for MVP (Supabase-ready structure)."
        actions={
          <Link className="link" to="/login">
            Back to login
          </Link>
        }
      >
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
          <Input
            label="Confirm password"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={busy}
          />

          <div className="row">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>

        <div className="note">
          Supabase hook point: replace <code>register()</code> in <code>AuthContext</code> with <code>supabase.auth.signUp</code>.
        </div>
      </Card>
    </div>
  );
}

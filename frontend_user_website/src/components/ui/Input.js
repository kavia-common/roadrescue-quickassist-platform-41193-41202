import React, { useId, useMemo, useState } from "react";

// PUBLIC_INTERFACE
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  name,
  error,
  hint,
  required,
  disabled,
  id,
  autoComplete,
}) {
  /** Input with label, hint, error, and optional password visibility toggle. */

  // Ensure stable, accessible associations even when `name` isn't a valid/unique DOM id.
  const reactId = useId();
  const inputId = useMemo(() => {
    const candidate = String(id || name || "").trim();
    return candidate || `input-${reactId}`;
  }, [id, name, reactId]);

  // Password visibility toggle (local-only UI state; never persists or logs).
  const isPasswordType = String(type).toLowerCase() === "password";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const effectiveType = isPasswordType ? (passwordVisible ? "text" : "password") : type;

  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label} {required ? <span className="req">*</span> : null}
        </label>
      ) : null}

      {/* Wrap to allow an in-field toggle button for password inputs */}
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          name={name}
          className={`input ${error ? "input-error" : ""}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={effectiveType}
          disabled={disabled}
          autoComplete={autoComplete}
          // Extra right padding so text doesn't sit under the toggle.
          style={isPasswordType ? { paddingRight: 56 } : undefined}
        />

        {isPasswordType ? (
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            // Native <button> is keyboard accessible by default (Enter/Space).
            disabled={disabled}
            style={{
              position: "absolute",
              top: "50%",
              right: 10,
              transform: "translateY(-50%)",
              border: "1px solid rgba(229,231,235,0.9)",
              background: "rgba(255,255,255,0.9)",
              color: "var(--muted)",
              borderRadius: 10,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-sm)",
              lineHeight: 1,
            }}
          >
            {passwordVisible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      {hint ? <div className="hint">{hint}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}

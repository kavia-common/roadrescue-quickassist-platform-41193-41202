import React, { useId, useMemo, useState } from "react";

function EyeIcon({ off = false, title = "" }) {
  // Inline SVG icon to avoid adding an icon dependency.
  // off=false: eye (visible). off=true: eye with slash (hidden).
  const stroke = "currentColor";
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": title ? undefined : true,
    role: title ? "img" : undefined,
  };

  if (off) {
    return (
      <svg {...common}>
        {title ? <title>{title}</title> : null}
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.74-1.76 2.07-3.72 4-5.2" />
        <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
        <path d="M9.88 5.08A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8-1.03 2.44-2.85 4.73-5.06 6.16" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      {title ? <title>{title}</title> : null}
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

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

  const toggleLabel = passwordVisible ? "Hide password" : "Show password";

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
          style={isPasswordType ? { paddingRight: 48 } : undefined}
        />

        {isPasswordType ? (
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            aria-label={toggleLabel}
            // Native <button> is keyboard accessible by default (Enter/Space).
            disabled={disabled}
            style={{
              position: "absolute",
              top: "50%",
              right: 10,
              transform: "translateY(-50%)",
              width: 34,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(229,231,235,0.9)",
              background: "rgba(255,255,255,0.9)",
              color: "var(--muted)",
              borderRadius: 10,
              padding: 0,
              cursor: disabled ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-sm)",
              lineHeight: 1,
            }}
          >
            <EyeIcon off={!passwordVisible} />
          </button>
        ) : null}
      </div>

      {hint ? <div className="hint">{hint}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}

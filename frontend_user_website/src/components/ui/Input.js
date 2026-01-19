import React, { useId, useMemo, useState } from "react";

function EyeIcon({ title = "Show password" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      focusable="false"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M12 5c5.5 0 9.8 4.2 11 7-1.2 2.8-5.5 7-11 7S2.2 14.8 1 12c1.2-2.8 5.5-7 11-7Zm0 2C7.8 7 4.3 10 3.2 12 4.3 14 7.8 17 12 17s7.7-3 8.8-5C19.7 10 16.2 7 12 7Zm0 2.5A2.5 2.5 0 1 1 12 14a2.5 2.5 0 0 1 0-5Z"
      />
    </svg>
  );
}

function EyeOffIcon({ title = "Hide password" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      focusable="false"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M3.3 2.3 21.7 20.7l-1.4 1.4-3-3A12.9 12.9 0 0 1 12 20C6.5 20 2.2 15.8 1 13c.7-1.6 2.2-3.6 4.3-5.2l-3.4-3.4 1.4-1.4ZM7 8.5c-1.9 1.2-3.3 2.7-3.9 4 .9 2 4.2 5.5 8.9 5.5 1.3 0 2.5-.3 3.6-.7l-1.8-1.8c-.5.2-1.1.3-1.8.3A3.5 3.5 0 0 1 8.5 12c0-.7.2-1.3.5-1.9L7 8.5Zm5-3.5c5.5 0 9.8 4.2 11 7-.6 1.4-1.7 2.9-3.2 4.2l-1.4-1.4c1.2-1 2.1-2 2.4-2.8-1.1-2-4.6-5-8.8-5-1 0-1.9.2-2.8.5L7.7 5.9c1.3-.6 2.7-.9 4.3-.9Z"
      />
      <path
        fill="currentColor"
        d="M12 8.5a3.5 3.5 0 0 1 3.5 3.5c0 .3 0 .6-.1.9l-1.7-1.7v-.2A1.7 1.7 0 0 0 12 9.3h-.2L10.1 7.6c.3-.1.6-.1.9-.1Z"
      />
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
}) {
  /** Input with label, hint, and error. Supports password visibility toggle when type="password". */
  const reactId = useId();
  const inputId = useMemo(() => name || `input-${reactId}`, [name, reactId]);

  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);

  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label} {required ? <span className="req">*</span> : null}
        </label>
      ) : null}

      <div className={isPassword ? "input-with-trailing" : undefined}>
        <input
          id={inputId}
          name={name}
          className={`input ${error ? "input-error" : ""} ${isPassword ? "input--with-trailing" : ""}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={resolvedType}
          disabled={disabled}
        />

        {isPassword ? (
          <button
            type="button"
            className="input-trailing-btn"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={disabled}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOffIcon title="Hide password" /> : <EyeIcon title="Show password" />}
          </button>
        ) : null}
      </div>

      {hint ? <div className="hint">{hint}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}

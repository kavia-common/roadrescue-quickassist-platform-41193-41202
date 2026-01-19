import React from "react";

/**
 * Utility to join classNames safely.
 */
function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Map legacy/old variants to new set without breaking existing code.
 */
function normalizeVariant(variant) {
  // Existing code uses: primary, secondary, ghost, danger
  // New requirements: primary, secondary (amber outline/fill), ghost
  // We'll also support: secondary-outline, secondary-solid
  if (!variant) return "primary";
  const v = String(variant).trim().toLowerCase();

  if (v === "secondary") return "secondary-outline";
  if (v === "secondary-outline") return "secondary-outline";
  if (v === "secondary-solid") return "secondary-solid";
  if (v === "ghost") return "ghost";
  if (v === "danger") return "danger";
  return "primary";
}

function normalizeSize(size) {
  const s = String(size || "md").trim().toLowerCase();
  if (s === "lg") return "lg";
  if (s === "sm") return "sm";
  return "md";
}

// PUBLIC_INTERFACE
export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  style,
  className,
  as: As = "button",
  href,
  to, // convenience for future; not used here
  ...rest
}) {
  /**
   * Ocean-themed button with variants:
   * - primary (blue)
   * - secondary-outline (amber outline)
   * - secondary-solid (amber fill)
   * - ghost
   * - danger
   *
   * Note: We keep backward compatibility with existing callers that pass "secondary".
   */
  const v = normalizeVariant(variant);
  const s = normalizeSize(size);

  const classes = cx("btn", `btn-${v}`, `btn-${s}`, className);

  // If caller wants an anchor-like button (e.g., in cards), allow As="a".
  // For accessibility, pass href when As === "a".
  if (As === "a") {
    return (
      <a
        className={classes}
        href={href}
        onClick={onClick}
        style={style}
        aria-disabled={disabled ? "true" : "false"}
        tabIndex={disabled ? -1 : 0}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} style={style} {...rest}>
      {children}
    </button>
  );
}

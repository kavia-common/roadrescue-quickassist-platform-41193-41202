import React from "react";

function getBadgeClass(kind) {
  if (kind === "success") return "badge badge-green";
  if (kind === "warning") return "badge badge-amber";
  if (kind === "info") return "badge badge-blue";
  return "badge";
}

// PUBLIC_INTERFACE
export function Badge({ children, kind = "info", title }) {
  /** Ocean-themed badge (info/warning/success). */
  return (
    <span className={getBadgeClass(kind)} title={title}>
      {children}
    </span>
  );
}

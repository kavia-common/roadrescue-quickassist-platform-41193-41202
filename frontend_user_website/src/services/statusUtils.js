/**
 * Shared request status utilities (User Website).
 *
 * Supabase canonical values:
 * - OPEN
 * - ASSIGNED
 * - EN_ROUTE
 * - WORKING
 * - COMPLETED
 */

/**
 * PUBLIC_INTERFACE
 */
export function normalizeStatus(rawStatus) {
  /** Normalize any incoming status (db/UI/legacy) into a canonical uppercase token. */
  if (!rawStatus) return "OPEN";
  const s = String(rawStatus).trim();
  if (!s) return "OPEN";

  const upper = s.toUpperCase();
  const compact = upper.replace(/\s+/g, "_");

  const map = {
    // DB canonical values
    PENDING: "OPEN",

    // UI/legacy values
    OPEN: "OPEN",
    SUBMITTED: "OPEN",
    IN_REVIEW: "OPEN",
    "IN REVIEW": "OPEN",

    ASSIGNED: "ASSIGNED",
    ACCEPTED: "ASSIGNED",

    EN_ROUTE: "EN_ROUTE",
    "EN ROUTE": "EN_ROUTE",

    WORKING: "WORKING",
    IN_PROGRESS: "WORKING",
    "IN PROGRESS": "WORKING",

    COMPLETED: "COMPLETED",
    CLOSED: "COMPLETED",
  };

  return map[compact] || map[upper] || compact;
}

/**
 * PUBLIC_INTERFACE
 */
export function statusLabel(rawStatus) {
  /** Convert raw/canonical status into a professional UI label. */
  const canonical = normalizeStatus(rawStatus);
  const labels = {
    OPEN: "Open",
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    WORKING: "Working",
    COMPLETED: "Completed",
  };
  return labels[canonical] || canonical.replace(/_/g, " ");
}

/**
 * PUBLIC_INTERFACE
 */
export function statusBadgeClass(rawStatus) {
  /** Return a badge CSS class for the given status (expects global badge styles). */
  const canonical = normalizeStatus(rawStatus);
  const map = {
    OPEN: "badge badge-blue",
    ASSIGNED: "badge badge-blue",
    EN_ROUTE: "badge badge-amber",
    WORKING: "badge badge-amber",
    COMPLETED: "badge badge-green",
  };
  return map[canonical] || "badge";
}

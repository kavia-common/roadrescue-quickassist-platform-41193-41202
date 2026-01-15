/**
 * Shared request status utilities (User Website).
 *
 * UI canonical values (what the UI uses internally):
 * - OPEN
 * - ASSIGNED
 * - EN_ROUTE
 * - WORKING
 * - COMPLETED
 * - CANCELED
 *
 * Database canonical values (what Supabase stores in public.requests.status):
 * - pending (initial)
 * - submitted
 * - in_review
 * - assigned
 * - accepted
 * - en_route
 * - completed
 * - canceled
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
    // Initial / intake
    PENDING: "OPEN",
    OPEN: "OPEN",
    SUBMITTED: "OPEN",
    IN_REVIEW: "OPEN",
    "IN REVIEW": "OPEN",

    // Assignment
    ASSIGNED: "ASSIGNED",
    ACCEPTED: "ASSIGNED",

    // Travel / work
    EN_ROUTE: "EN_ROUTE",
    "EN ROUTE": "EN_ROUTE",

    WORKING: "WORKING",
    IN_PROGRESS: "WORKING",
    "IN PROGRESS": "WORKING",

    // Terminal
    COMPLETED: "COMPLETED",
    CLOSED: "COMPLETED",

    CANCELED: "CANCELED",
    CANCELLED: "CANCELED",
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
    CANCELED: "Canceled",
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
    CANCELED: "badge badge-red",
  };
  return map[canonical] || "badge";
}

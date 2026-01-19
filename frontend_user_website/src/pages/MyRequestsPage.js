import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useUserRequests } from "../hooks/useUserRequests";
import { UserShell } from "../components/layout/UserShell";

/**
 * Map any legacy/local statuses into the user-facing read-only flow:
 * Open (default) -> Assigned -> Completed
 *
 * NOTE: We do not mutate/persist status changes here; this is display-only.
 */
function toReadOnlyStatusLabel(rawStatus) {
  const s = String(rawStatus || "").trim().toLowerCase();
  if (s === "completed") return "Completed";

  // Legacy statuses in this codebase included "Accepted"/"Pending".
  // "Accepted" maps to "Assigned" in the intended user UI.
  if (s === "accepted" || s === "assigned") return "Assigned";

  // Default / unknown -> Open
  return "Open";
}

function statusPillClass(label) {
  if (label === "Completed") return "rrq-pill rrq-pill--success";
  if (label === "Assigned") return "rrq-pill rrq-pill--warning";
  return "rrq-pill rrq-pill--info";
}

/**
 * NOTE:
 * My Requests is intentionally read-only. Request status is shown, but no edits/mutations happen here.
 */

// PUBLIC_INTERFACE
export function MyRequestsPage() {
  /** Lists requests from localStorage (rrq_user_requests). Status is read-only on user side. */
  const navigate = useNavigate();
  const { requests, clearAll } = useUserRequests();

  const rows = useMemo(() => requests, [requests]);

  return (
    <UserShell title="Breakdown Requests">
      <div className="rrq-mrTop">
        <Button variant="ghost" onClick={() => navigate("/submit")}>
          Back to Submit Request
        </Button>

        {rows.length ? (
          <button
            type="button"
            className="rrq-clearLink"
            onClick={clearAll}
            style={{ background: "transparent", border: 0 }}
          >
            Clear request history
          </button>
        ) : null}
      </div>

      <Card
        title="Request History"
        subtitle={rows.length ? "Newest first." : "No requests yet."}
        className="rrq-auth-card"
      >
        {rows.length === 0 ? (
          <div className="empty">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>No requests yet</div>
            <div className="footer-muted" style={{ marginBottom: 12 }}>
              Submit your first breakdown request to see it here.
            </div>
            <Button size="lg" onClick={() => navigate("/submit")}>
              Submit request
            </Button>
          </div>
        ) : (
          <div className="rrq-table" role="table" aria-label="Request history table">
            <div className="rrq-table__head" role="row">
              <div className="rrq-th" role="columnheader">
                Request
              </div>
              <div className="rrq-th" role="columnheader">
                Status
              </div>
              <div className="rrq-th" role="columnheader" style={{ textAlign: "right" }}>
                Actions
              </div>
            </div>

            {rows.map((r) => {
              const statusLabel = toReadOnlyStatusLabel(r.status);
              return (
                <div key={r.id} className="rrq-table__row" role="row">
                  <div role="cell">
                    <div className="rrq-vehicleTitle">
                      {r.vehicle?.make} {r.vehicle?.model}
                    </div>
                    <div className="rrq-vehicleMeta">
                      <button
                        type="button"
                        className="rrq-requestIdLink rrq-mono"
                        onClick={() => navigate(`/requests/${encodeURIComponent(r.id)}`)}
                        aria-label={`Open details for request ${r.id}`}
                      >
                        {r.id}
                      </button>
                      <span className="rrq-dot">•</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div role="cell">
                    <span className={statusPillClass(statusLabel)}>{statusLabel}</span>
                  </div>

                  <div role="cell" className="rrq-actions">
                    <Button
                      variant="secondary-outline"
                      size="sm"
                      onClick={() => navigate(`/requests/${encodeURIComponent(r.id)}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </UserShell>
  );
}

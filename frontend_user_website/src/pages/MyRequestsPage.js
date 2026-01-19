import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useUserRequests } from "../hooks/useUserRequests";
import { UserShell } from "../components/layout/UserShell";

function badgeKind(status) {
  if (status === "Completed") return "success";
  if (status === "Accepted") return "warning";
  return "info";
}

function statusPillClass(status) {
  const k = badgeKind(status);
  if (k === "success") return "rrq-pill rrq-pill--success";
  if (k === "warning") return "rrq-pill rrq-pill--warning";
  return "rrq-pill rrq-pill--info";
}

// PUBLIC_INTERFACE
export function MyRequestsPage() {
  /** Lists mock requests from localStorage. */
  const navigate = useNavigate();
  const { requests, setStatus, clearAll } = useUserRequests();

  const rows = useMemo(() => requests, [requests]);

  return (
    <UserShell title="My requests" subtitle="All requests are stored locally for this MVP (refresh-safe via localStorage).">
      <Card
        title="Requests"
        subtitle={rows.length ? "Newest first." : "No requests yet."}
        className="rrq-auth-card"
        actions={
          rows.length ? (
            <button
              type="button"
              className="rrq-clearLink"
              onClick={clearAll}
              style={{ background: "transparent", border: 0, cursor: "pointer" }}
            >
              Clear request history
            </button>
          ) : null
        }
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
          <div className="rrq-table">
            <div className="rrq-table__head">
              <div className="rrq-th rrq-th--vehicle">Vehicle</div>
              <div className="rrq-th rrq-th--status">Status</div>
              <div className="rrq-th rrq-th--actions">Actions</div>
            </div>

            {rows.map((r) => (
              <div key={r.id} className="rrq-table__row">
                <div className="rrq-td rrq-td--vehicle">
                  <div className="rrq-vehicleTitle">
                    {r.vehicle.make} {r.vehicle.model}
                  </div>
                  <div className="rrq-vehicleMeta">
                    <span className="rrq-mono">{r.id}</span>
                    <span className="rrq-dot">•</span>
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="rrq-td rrq-td--status">
                  <span className={statusPillClass(r.status)}>{r.status}</span>
                </div>

                <div className="rrq-td rrq-td--actions">
                  <div className="rrq-actions">
                    <Button variant="ghost" size="sm" onClick={() => setStatus(r.id, "Pending")}>
                      Pending
                    </Button>
                    <Button variant="secondary-solid" size="sm" onClick={() => setStatus(r.id, "Accepted")}>
                      Accept
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setStatus(r.id, "Completed")}>
                      Complete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </UserShell>
  );
}

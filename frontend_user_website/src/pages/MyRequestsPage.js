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
  /** Lists mock requests from localStorage. UI-only changes. */
  const navigate = useNavigate();
  const { requests, setStatus, clearAll } = useUserRequests();

  const rows = useMemo(() => requests, [requests]);

  return (
    <UserShell title="Breakdown Requests">
      <div className="rrq-mrTop">
        <Button variant="ghost" onClick={() => navigate("/submit")}>
          Back to Submit Request
        </Button>

        {rows.length ? (
          <button type="button" className="rrq-clearLink" onClick={clearAll} style={{ background: "transparent", border: 0 }}>
            Clear request history
          </button>
        ) : null}
      </div>

      <Card title="Request History" subtitle={rows.length ? "Newest first." : "No requests yet."} className="rrq-auth-card">
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
          <div className="rrq-mrList" role="list">
            {rows.map((r) => (
              <div key={r.id} className="rrq-mrRow" role="listitem">
                <div className="rrq-mrRow__left">
                  <div className="rrq-mrRow__title">
                    {r.vehicle.make} {r.vehicle.model}
                  </div>
                  <div className="rrq-mrRow__meta">
                    <span className="rrq-mono">{r.id}</span>
                    <span className="rrq-dot">•</span>
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="rrq-mrRow__right">
                  <span className={statusPillClass(r.status)}>{r.status}</span>
                  <div className="rrq-mrRow__actions">
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

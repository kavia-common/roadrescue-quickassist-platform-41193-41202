import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useUserRequests } from "../hooks/useUserRequests";
import { UserShell } from "../components/layout/UserShell";

function badgeKind(status) {
  if (status === "Completed") return "success";
  if (status === "Accepted") return "warning";
  return "info";
}

// PUBLIC_INTERFACE
export function MyRequestsPage() {
  /** Lists mock requests from localStorage. */
  const navigate = useNavigate();
  const { requests, setStatus, clearAll } = useUserRequests();

  return (
    <UserShell title="My Requests" subtitle="Your requests are stored locally for the MVP (refresh-safe via localStorage).">
      <Card
        title="Requests"
        subtitle={requests.length ? "Newest first." : "No requests yet."}
        actions={
          requests.length ? (
            <button
              type="button"
              className="link"
              onClick={clearAll}
              style={{ background: "transparent", border: 0, cursor: "pointer" }}
            >
              Clear all
            </button>
          ) : null
        }
      >
        {requests.length === 0 ? (
          <div className="empty">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>No requests yet</div>
            <div className="footer-muted" style={{ marginBottom: 12 }}>
              Submit your first breakdown request to see it here.
            </div>
            <Button size="lg" onClick={() => navigate("/submit")}>
              Submit Request
            </Button>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((r) => (
              <div key={r.id} className="card card-hover request-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">
                      {r.vehicle.make} {r.vehicle.model}
                    </h2>
                    <p className="card-subtitle">
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        {r.id}
                      </span>{" "}
                      • {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="card-actions">
                    <Badge kind={badgeKind(r.status)} title="Current status">
                      {r.status}
                    </Badge>
                  </div>
                </div>

                <div className="card-body">
                  <div className="kv">
                    <div>
                      <span className="k">Problem</span>
                      <span className="v" style={{ fontWeight: 600 }}>
                        {r.problemDescription}
                      </span>
                    </div>
                    <div>
                      <span className="k">Location</span>
                      <span className="v" style={{ fontWeight: 600 }}>
                        {r.location}
                      </span>
                    </div>
                    <div>
                      <span className="k">Phone</span>
                      <span className="v">{r.contactPhone}</span>
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="row">
                    <ButtonSet onSetStatus={(s) => setStatus(r.id, s)} />
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

// PUBLIC_INTERFACE
function ButtonSet({ onSetStatus }) {
  /** Small status-setter button group for the MVP list (UI-only). */
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => onSetStatus("Pending")}>
        Pending
      </Button>
      <Button variant="secondary-solid" size="sm" onClick={() => onSetStatus("Accepted")}>
        Accepted
      </Button>
      <Button variant="primary" size="sm" onClick={() => onSetStatus("Completed")}>
        Completed
      </Button>
    </>
  );
}

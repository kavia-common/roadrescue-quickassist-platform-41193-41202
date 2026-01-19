import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { LocationMap } from "../components/LocationMap";
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

function formatMaybe(v) {
  const x = v == null ? "" : String(v).trim();
  return x ? x : "—";
}

function parseFiniteNumber(v) {
  const n = typeof v === "number" ? v : Number(String(v || "").trim());
  return Number.isFinite(n) ? n : null;
}

// PUBLIC_INTERFACE
export function MyRequestsPage() {
  /** Lists requests from localStorage (rrq_user_requests). Status is read-only on user side. */
  const navigate = useNavigate();
  const { requests, clearAll } = useUserRequests();

  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => requests, [requests]);

  const selectedLat = parseFiniteNumber(selected?.lat ?? selected?.latitude ?? selected?.location?.lat);
  const selectedLon = parseFiniteNumber(selected?.lon ?? selected?.longitude ?? selected?.location?.lon);

  const selectedAddress =
    String(
      selected?.breakdownAddress ??
        selected?.address ??
        selected?.location ??
        selected?.breakdown_location ??
        selected?.breakdownLocation ??
        ""
    ).trim() || "";

  const canShowMap = selectedLat != null && selectedLon != null;

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
                        onClick={() => setSelected(r)}
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
                    <Button variant="secondary-outline" size="sm" onClick={() => setSelected(r)}>
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(selected)}
        title={selected ? `Request Details — ${selected.id}` : "Request Details"}
        onClose={() => setSelected(null)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selected ? (
          <div className="rrq-rd">
            <div className="rrq-rd__metaRow">
              <div className="rrq-rd__metaLeft">
                <div className="rrq-rd__id rrq-mono">{selected.id}</div>
                <div className="rrq-rd__created">Created: {new Date(selected.createdAt).toLocaleString()}</div>
              </div>
              <div className="rrq-rd__metaRight">
                <span className={statusPillClass(toReadOnlyStatusLabel(selected.status))}>
                  {toReadOnlyStatusLabel(selected.status)}
                </span>
              </div>
            </div>

            <div className="rrq-rd__grid">
              <div className="rrq-rd__block">
                <div className="rrq-rd__blockTitle">Vehicle</div>
                <div className="rrq-rd__kv">
                  <div>
                    <span className="rrq-rd__k">Make</span>
                    <span className="rrq-rd__v">{formatMaybe(selected.vehicle?.make)}</span>
                  </div>
                  <div>
                    <span className="rrq-rd__k">Model</span>
                    <span className="rrq-rd__v">{formatMaybe(selected.vehicle?.model)}</span>
                  </div>
                  <div>
                    <span className="rrq-rd__k">Year</span>
                    <span className="rrq-rd__v">{formatMaybe(selected.vehicle?.year ?? selected.year)}</span>
                  </div>
                  <div>
                    <span className="rrq-rd__k">License Plate</span>
                    <span className="rrq-rd__v">{formatMaybe(selected.vehicle?.licensePlate ?? selected.licensePlate)}</span>
                  </div>
                </div>
              </div>

              <div className="rrq-rd__block">
                <div className="rrq-rd__blockTitle">Contact</div>
                <div className="rrq-rd__kv">
                  <div>
                    <span className="rrq-rd__k">Name</span>
                    <span className="rrq-rd__v">{formatMaybe(selected.contactName ?? selected.contact?.name)}</span>
                  </div>
                  <div>
                    <span className="rrq-rd__k">Phone</span>
                    <span className="rrq-rd__v">{formatMaybe(selected.contactPhone ?? selected.contact?.phone)}</span>
                  </div>
                </div>
              </div>

              <div className="rrq-rd__block rrq-rd__block--full">
                <div className="rrq-rd__blockTitle">Issue</div>
                <div className="rrq-rd__text">
                  {formatMaybe(selected.issueDescription ?? selected.problemDescription ?? selected.issue)}
                </div>
              </div>

              <div className="rrq-rd__block rrq-rd__block--full">
                <div className="rrq-rd__blockTitle">Breakdown Address</div>
                <div className="rrq-rd__text">{selectedAddress ? selectedAddress : "—"}</div>
              </div>

              <div className="rrq-rd__block">
                <div className="rrq-rd__blockTitle">Latitude</div>
                <div className="rrq-rd__text">{selectedLat != null ? String(selectedLat) : "—"}</div>
              </div>

              <div className="rrq-rd__block">
                <div className="rrq-rd__blockTitle">Longitude</div>
                <div className="rrq-rd__text">{selectedLon != null ? String(selectedLon) : "—"}</div>
              </div>
            </div>

            <div className="rrq-rd__mapWrap">
              {canShowMap ? (
                <div
                  onWheel={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <LocationMap lat={selectedLat} lon={selectedLon} address={selectedAddress} height={300} />
                </div>
              ) : (
                <div className="rrq-rd__locationNote">Location not set.</div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </UserShell>
  );
}

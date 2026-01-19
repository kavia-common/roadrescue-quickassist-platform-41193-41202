import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { LocationMap } from "../components/LocationMap";
import { UserShell } from "../components/layout/UserShell";

function formatMaybe(v) {
  const x = v == null ? "" : String(v).trim();
  return x ? x : "—";
}

function parseFiniteNumber(v) {
  const n = typeof v === "number" ? v : Number(String(v || "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Local-only data source used by this MVP.
 * Keep consistent with useUserRequests (localStorage key rrq_user_requests).
 */
function getLocalRequests() {
  try {
    const raw = localStorage.getItem("rrq_user_requests");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Map any legacy/local statuses into the user-facing read-only flow:
 * Open (default) -> Assigned -> Completed
 */
function toReadOnlyStatusLabel(rawStatus) {
  const s = String(rawStatus || "").trim().toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "accepted" || s === "assigned") return "Assigned";
  return "Open";
}

function statusPillClass(label) {
  if (label === "Completed") return "rrq-pill rrq-pill--success";
  if (label === "Assigned") return "rrq-pill rrq-pill--warning";
  return "rrq-pill rrq-pill--info";
}

// PUBLIC_INTERFACE
export function RequestDetailPage() {
  /** Dedicated detail view for a single request (localStorage-backed), including brief + map. */
  const { requestId } = useParams();

  const req = useMemo(() => {
    const all = getLocalRequests();
    return all.find((r) => String(r.id) === String(requestId)) || null;
  }, [requestId]);

  const lat = parseFiniteNumber(req?.lat ?? req?.latitude ?? req?.location?.lat);
  const lon = parseFiniteNumber(req?.lon ?? req?.longitude ?? req?.location?.lon);

  const address =
    String(
      req?.breakdownAddress ??
        req?.address ??
        req?.location ??
        req?.breakdown_location ??
        req?.breakdownLocation ??
        ""
    ).trim() || "";

  const canShowMap = lat != null && lon != null;

  if (!req) {
    return (
      <UserShell title="Request Details">
        <Card title="Request not found" className="rrq-auth-card">
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            We couldn’t find that request in your local request history.
          </div>
          <Link className="link" to="/requests">
            ← Back to My Requests
          </Link>
        </Card>
      </UserShell>
    );
  }

  const statusLabel = toReadOnlyStatusLabel(req.status);

  return (
    <UserShell title={`Request ${req.id}`}>
      <div className="rrq-detailTop">
        <Link className="link" to="/requests">
          ← Back to My Requests
        </Link>
        <span className={statusPillClass(statusLabel)}>{statusLabel}</span>
      </div>

      <Card
        title="Request Details"
        subtitle={`Created: ${new Date(req.createdAt).toLocaleString()}`}
        className="rrq-auth-card rrq-detailCard"
      >
        <div className="rrq-detailGrid">
          <div className="rrq-detailBlock">
            <div className="rrq-detailBlockTitle">Vehicle</div>
            <div className="rrq-detailKv">
              <div>
                <span className="rrq-detailK">Make</span>
                <span className="rrq-detailV">{formatMaybe(req.vehicle?.make)}</span>
              </div>
              <div>
                <span className="rrq-detailK">Model</span>
                <span className="rrq-detailV">{formatMaybe(req.vehicle?.model)}</span>
              </div>
              <div>
                <span className="rrq-detailK">Year</span>
                <span className="rrq-detailV">{formatMaybe(req.vehicle?.year ?? req.year)}</span>
              </div>
              <div>
                <span className="rrq-detailK">License Plate</span>
                <span className="rrq-detailV">{formatMaybe(req.vehicle?.licensePlate ?? req.licensePlate)}</span>
              </div>
            </div>
          </div>

          <div className="rrq-detailBlock">
            <div className="rrq-detailBlockTitle">Contact</div>
            <div className="rrq-detailKv">
              <div>
                <span className="rrq-detailK">Name</span>
                <span className="rrq-detailV">{formatMaybe(req.contactName ?? req.contact?.name)}</span>
              </div>
              <div>
                <span className="rrq-detailK">Phone</span>
                <span className="rrq-detailV">{formatMaybe(req.contactPhone ?? req.contact?.phone)}</span>
              </div>
            </div>
          </div>

          <div className="rrq-detailBlock rrq-detailBlock--full">
            <div className="rrq-detailBlockTitle">Breakdown Location</div>
            <div className="rrq-detailText">{address ? address : "—"}</div>
          </div>

          <div className="rrq-detailBlock rrq-detailBlock--full">
            <div className="rrq-detailBlockTitle">Issue Description</div>
            <div className="rrq-detailText">
              {formatMaybe(req.issueDescription ?? req.problemDescription ?? req.issue)}
            </div>
          </div>

          <div className="rrq-detailBlock">
            <div className="rrq-detailBlockTitle">Latitude</div>
            <div className="rrq-detailText">{lat != null ? String(lat) : "—"}</div>
          </div>

          <div className="rrq-detailBlock">
            <div className="rrq-detailBlockTitle">Longitude</div>
            <div className="rrq-detailText">{lon != null ? String(lon) : "—"}</div>
          </div>

          <div className="rrq-detailBlock rrq-detailBlock--full">
            <div className="rrq-detailBlockTitle">Map</div>
            {canShowMap ? (
              <div
                onWheel={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <LocationMap lat={lat} lon={lon} address={address} height={320} />
              </div>
            ) : (
              <div className="rrq-detailLocationNote">Location not set.</div>
            )}
          </div>
        </div>
      </Card>
    </UserShell>
  );
}

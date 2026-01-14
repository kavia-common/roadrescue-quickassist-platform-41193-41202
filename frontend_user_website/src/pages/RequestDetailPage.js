import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { dataService } from "../services/dataService";
import { statusLabel } from "../services/statusUtils";
import { LocationMap } from "../components/LocationMap";

function isValidCoord(n, min, max) {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

// PUBLIC_INTERFACE
export function RequestDetailPage({ user }) {
  /** Detail view for a single request, including persisted address and map. */
  const { requestId } = useParams();
  const [req, setReq] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await dataService.getRequestById(requestId);
        if (!r) throw new Error("Request not found.");
        if (r.userId !== user.id) throw new Error("You do not have access to this request.");
        if (mounted) setReq(r);
      } catch (e) {
        if (mounted) setError(e.message || "Could not load request.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [requestId, user.id]);

  const canShowMap = useMemo(() => {
    return isValidCoord(req?.lat, -90, 90) && isValidCoord(req?.lon, -180, 180);
  }, [req?.lat, req?.lon]);

  if (error) {
    return (
      <div className="container">
        <Card title="Request detail">
          <div className="alert alert-error">{error}</div>
          <Link className="link" to="/requests">
            ← Back to list
          </Link>
        </Card>
      </div>
    );
  }

  if (!req)
    return (
      <div className="container">
        <div className="skeleton">Loading…</div>
      </div>
    );

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Request {req.id.slice(0, 8)}</h1>
        <p className="lead">
          Status: <strong>{statusLabel(req.status)}</strong>
        </p>
      </div>

      <div className="grid2">
        <Card title="Vehicle">
          <div className="kv">
            {/* ENFORCED SHAPE: vehicle = { make, model }. Fallback to "" if missing. */}
            <div>
              <span className="k">Make</span>
              <span className="v">{(req.vehicle && req.vehicle.make) || ""}</span>
            </div>
            <div>
              <span className="k">Model</span>
              <span className="v">{(req.vehicle && req.vehicle.model) || ""}</span>
            </div>
            <div>
              <span className="k">Year</span>
              <span className="v">—</span>
            </div>
            <div>
              <span className="k">Plate</span>
              <span className="v">—</span>
            </div>
          </div>
        </Card>

        <Card title="Contact">
          <div className="kv">
            <div>
              <span className="k">Name</span>
              <span className="v">{req.contact.name}</span>
            </div>
            <div>
              <span className="k">Phone</span>
              <span className="v">{req.contact.phone}</span>
            </div>
            <div>
              <span className="k">Created</span>
              <span className="v">{new Date(req.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Breakdown location" subtitle="Saved with the request (no GPS permissions).">
        {req.address ? (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Address</div>
            <div style={{ lineHeight: 1.35 }}>{req.address}</div>
          </div>
        ) : (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            No address saved for this request.
          </div>
        )}

        {canShowMap ? <LocationMap lat={req.lat} lon={req.lon} address={req.address || ""} height={300} /> : null}
      </Card>

      <Card title="Issue description">
        <p className="p">{req.issueDescription}</p>
        <div className="divider" />
        <Link className="link" to="/requests">
          ← Back to My Requests
        </Link>
      </Card>
    </div>
  );
}

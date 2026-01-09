import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { dataService } from "../services/dataService";
import { statusLabel } from "../services/statusUtils";
import { MapPanel } from "../components/MapPanel";

// PUBLIC_INTERFACE
export function RequestDetailPage({ user }) {
  /** Detail view for a single request. */
  const { requestId } = useParams();
  const [req, setReq] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const r = await dataService.getRequestById(requestId);
        if (!r) throw new Error("Request not found.");
        if (r.userId !== user.id) throw new Error("You do not have access to this request.");
        if (mounted) setReq(r);
      } catch (e) {
        if (mounted) setError(e.message || "Could not load request.");
      }
    };

    load();

    const unsub = dataService.subscribeToRequestsChanged(() => {
      load();
    });

    return () => {
      mounted = false;
      unsub?.();
    };
  }, [requestId, user.id]);

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

  if (!req) return <div className="container"><div className="skeleton">Loading…</div></div>;

  const locationText = req?.location?.text || "";

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
            <div><span className="k">Make</span><span className="v">{(req.vehicle && req.vehicle.make) || ""}</span></div>
            <div><span className="k">Model</span><span className="v">{(req.vehicle && req.vehicle.model) || ""}</span></div>
            <div><span className="k">Year</span><span className="v">—</span></div>
            <div><span className="k">Plate</span><span className="v">—</span></div>
          </div>
        </Card>

        <Card title="Contact">
          <div className="kv">
            <div><span className="k">Name</span><span className="v">{req.contact.name}</span></div>
            <div><span className="k">Phone</span><span className="v">{req.contact.phone}</span></div>
            <div><span className="k">Created</span><span className="v">{new Date(req.createdAt).toLocaleString()}</span></div>
            <div><span className="k">Location</span><span className="v">{locationText || "—"}</span></div>
          </div>
        </Card>
      </div>

      <MapPanel title="Location map" locationText={locationText} height={320} />

      <Card title="Issue description">
        <p className="p">{req.issueDescription}</p>
        <div className="divider" />
        <Link className="link" to="/requests">← Back to My Requests</Link>
      </Card>
    </div>
  );
}

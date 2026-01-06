import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { dataService } from "../services/dataService";

function statusBadge(status) {
  const map = {
    Submitted: "badge badge-blue",
    "In Review": "badge badge-amber",
    Assigned: "badge badge-blue",
    "In Progress": "badge badge-blue",
    Completed: "badge badge-green",
    Accepted: "badge badge-blue",
    "En Route": "badge badge-amber",
    Working: "badge badge-amber",
  };
  return <span className={map[status] || "badge"}>{status}</span>;
}

// PUBLIC_INTERFACE
export function MyRequestsPage({ user }) {
  /** Lists requests for current user. */
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await dataService.listRequests({ forUserId: user.id });
        if (mounted) setRows(list);
      } catch (e) {
        if (mounted) setError(e.message || "Could not load requests.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">My requests</h1>
        <p className="lead">Track status updates as mechanics accept and work your case.</p>
      </div>

      <Card
        title="Requests"
        subtitle="Newest first."
        actions={
          <Link className="link" to="/submit">
            + New request
          </Link>
        }
      >
        {error ? <div className="alert alert-error">{error}</div> : null}
        <Table
          columns={[
            { key: "id", header: "Request", render: (r) => <Link className="link" to={`/requests/${r.id}`}>{r.id.slice(0, 8)}</Link> },
            { key: "createdAt", header: "Created", render: (r) => new Date(r.createdAt).toLocaleString() },
            { key: "vehicle", header: "Vehicle", render: (r) => `${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.year || ""}`.trim() },
            { key: "status", header: "Status", render: (r) => statusBadge(r.status) },
          ]}
          rows={rows}
          rowKey={(r) => r.id}
        />
      </Card>
    </div>
  );
}

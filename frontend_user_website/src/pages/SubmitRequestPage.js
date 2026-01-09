import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { MapView } from "../components/MapView";
import { dataService } from "../services/dataService";
import { geocodeAddress } from "../services/geocodingService";
import { createProfiler } from "../services/perfProfiler";

function parseNumberOrNull(v) {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// PUBLIC_INTERFACE
export function SubmitRequestPage({ user }) {
  /** Form to submit a new breakdown request (now includes a map preview for the selected coords). */
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", plate: "" });
  const [issueDescription, setIssueDescription] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "" });

  // Simple location capture: a text hint + optional coordinates.
  // Chennai is the default map center when coords are not provided.
  const [locationText, setLocationText] = useState("");
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");

  const [busy, setBusy] = useState(false);
  const [findBusy, setFindBusy] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState({ type: "", message: "" }); // type: info|error

  const parsedLat = useMemo(() => parseNumberOrNull(latText), [latText]);
  const parsedLng = useMemo(() => parseNumberOrNull(lngText), [lngText]);

  const marker = useMemo(() => {
    if (parsedLat == null || parsedLng == null) return null;
    return { lat: parsedLat, lng: parsedLng };
  }, [parsedLat, parsedLng]);

  const validate = () => {
    if (!vehicle.make.trim()) return "Vehicle make is required.";
    if (!vehicle.model.trim()) return "Vehicle model is required.";
    if (!issueDescription.trim()) return "Issue description is required.";
    if (!contact.name.trim()) return "Contact name is required.";
    if (!contact.phone.trim()) return "Contact phone is required.";

    // Coordinates are optional; if one is provided, require both and validate ranges.
    const hasLat = String(latText).trim().length > 0;
    const hasLng = String(lngText).trim().length > 0;
    if (hasLat || hasLng) {
      if (parsedLat == null || parsedLng == null) return "Please enter valid latitude and longitude numbers.";
      if (parsedLat < -90 || parsedLat > 90) return "Latitude must be between -90 and 90.";
      if (parsedLng < -180 || parsedLng > 180) return "Longitude must be between -180 and 180.";
    }
    return "";
  };

  const onFindLocation = async () => {
    const profiler = createProfiler("find_location");
    profiler.mark("start");

    setError("");
    setLocationStatus({ type: "", message: "" });

    const q = locationText.trim();
    if (!q) {
      setLocationStatus({ type: "error", message: "Enter an address/landmark first, then click “Find location”." });
      profiler.end({ reason: "empty_query" });
      return;
    }

    setFindBusy(true);
    try {
      profiler.mark("before_geocode");
      const result = await geocodeAddress(q, { countryCodes: "in", limit: 1, profiler });
      profiler.mark("after_geocode");
      profiler.measure("find_location:geocode_total", "before_geocode", "after_geocode");

      // React state updates / UI refresh can be a bottleneck if map invalidation is heavy.
      profiler.mark("before_state_updates");

      // Populate fields that drive the map marker/center.
      setLatText(String(result.lat));
      setLngText(String(result.lng));

      // Replace the location text with Nominatim’s display name to improve clarity for the user.
      setLocationText(result.displayName);

      setLocationStatus({ type: "info", message: `Found: ${result.displayName}` });

      profiler.mark("after_state_updates");
      profiler.measure("find_location:state_updates_sync", "before_state_updates", "after_state_updates");
    } catch (e) {
      setLocationStatus({ type: "error", message: e?.message || "Could not find that location." });
      profiler.info("find_location:error", { message: e?.message || String(e) });
    } finally {
      setFindBusy(false);
      profiler.mark("end");
      profiler.measure("find_location:total", "start", "end");
      profiler.end();
    }
  };

  const submit = async (e) => {
    const profiler = createProfiler("submit_request");
    profiler.mark("start");

    e.preventDefault();

    profiler.mark("before_validate");
    setError("");
    const msg = validate();
    profiler.mark("after_validate");
    profiler.measure("submit:validate", "before_validate", "after_validate");

    if (msg) {
      setError(msg);
      profiler.end({ outcome: "validation_error" });
      return;
    }

    setBusy(true);
    try {
      // Persisting of location is intentionally not wired into the data layer here,
      // because the current request schema in this repo does not include location fields.
      // This change adds a UI map preview for the request flow and mechanic detail view.

      profiler.mark("before_create_request");
      const req = await dataService.createRequest({ user, vehicle, issueDescription, contact });
      profiler.mark("after_create_request");
      profiler.measure("submit:db_write(createRequest)", "before_create_request", "after_create_request");

      profiler.mark("before_navigate");
      // In mock mode, the UI could extend local storage later; for now we navigate as usual.
      navigate(`/requests/${req.id}`);
      profiler.mark("after_navigate");
      profiler.measure("submit:navigate_call", "before_navigate", "after_navigate");

      profiler.end({ outcome: "success", requestIdPrefix: String(req.id || "").slice(0, 8) });
    } catch (err) {
      profiler.info("submit:error", { message: err?.message || String(err) });
      setError(err.message || "Could not submit request.");
      profiler.end({ outcome: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Submit a breakdown request</h1>
        <p className="lead">Tell us what happened and where you are. A mechanic will review and accept it.</p>
      </div>

      <Card title="Request details" subtitle="OpenStreetMap preview (default center: Chennai).">
        <form onSubmit={submit} className="form">
          <div className="grid2">
            <Input
              label="Make"
              name="make"
              value={vehicle.make}
              onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))}
              required
            />
            <Input
              label="Model"
              name="model"
              value={vehicle.model}
              onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))}
              required
            />
            <Input
              label="Year"
              name="year"
              value={vehicle.year}
              onChange={(e) => setVehicle((v) => ({ ...v, year: e.target.value }))}
              placeholder="e.g., 2018"
            />
            <Input
              label="License plate"
              name="plate"
              value={vehicle.plate}
              onChange={(e) => setVehicle((v) => ({ ...v, plate: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="issue">
              Issue description <span className="req">*</span>
            </label>
            <textarea
              id="issue"
              className={`textarea ${error && !issueDescription.trim() ? "input-error" : ""}`}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Describe the symptoms, warning lights, noises, etc."
              rows={4}
            />
          </div>

          <div className="grid2">
            <Input
              label="Contact name"
              name="contactName"
              value={contact.name}
              onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
              required
            />
            <Input
              label="Contact phone"
              name="contactPhone"
              value={contact.phone}
              onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
              required
            />
          </div>

          <div className="divider" />

          <div className="grid2">
            <Input
              label="Location / landmark"
              name="locationText"
              value={locationText}
              onChange={(e) => {
                setLocationText(e.target.value);
                // Clear any prior “Found” message when the user edits the query.
                if (locationStatus.message) setLocationStatus({ type: "", message: "" });
              }}
              placeholder="e.g., Near Anna Nagar Tower Park"
              hint="Enter an address/landmark and click “Find location” to auto-fill coordinates."
              disabled={findBusy}
            />

            <div style={{ display: "flex", alignItems: "end" }}>
              <Button
                type="button"
                variant="secondary"
                onClick={onFindLocation}
                disabled={findBusy || !locationText.trim()}
                style={{ width: "100%" }}
              >
                {findBusy ? "Finding…" : "Find location"}
              </Button>
            </div>

            <Input
              label="Latitude"
              name="latitude"
              value={latText}
              onChange={(e) => setLatText(e.target.value)}
              placeholder="e.g., 13.0827"
              hint="Optional. If provided, longitude is required too."
            />
            <Input
              label="Longitude"
              name="longitude"
              value={lngText}
              onChange={(e) => setLngText(e.target.value)}
              placeholder="e.g., 80.2707"
              hint="Optional. If provided, latitude is required too."
            />
          </div>

          {locationStatus.message ? (
            <div className={`alert ${locationStatus.type === "error" ? "alert-error" : ""}`}>{locationStatus.message}</div>
          ) : null}

          <MapView center={marker || undefined} marker={marker || undefined} height={280} ariaLabel="Selected location map" />

          {locationText.trim() ? (
            <div className="hint" style={{ marginTop: -6 }}>
              Location note: <strong>{locationText.trim()}</strong>
            </div>
          ) : null}

          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="row">
            <Button type="submit" disabled={busy}>
              {busy ? "Submitting..." : "Submit request"}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate("/requests")}>
              View my requests
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

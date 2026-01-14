import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { MapView } from "../components/MapView";
import { dataService } from "../services/dataService";
import { fetchClient } from "../utils/fetchClient";

function parseNumberOrNull(v) {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reverse-geocode using OpenStreetMap Nominatim (public endpoint).
 * This does not require API keys and aligns with the existing Leaflet/OSM approach in this repo.
 *
 * NOTE: This is a best-effort UX improvement; on failure we fall back to "Current Location (lat, lng)".
 */
async function reverseGeocodeNominatim({ lat, lng }) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const resp = await fetchClient(url, {
    headers: {
      // Provide a simple identifier; some deployments may ignore it, but it's polite.
      "Accept": "application/json",
    },
  });
  if (!resp.ok) throw new Error(`Reverse geocoding failed (${resp.status}).`);
  const data = await resp.json();
  const name =
    data?.display_name ||
    data?.name ||
    (data?.address
      ? [
          data.address.road,
          data.address.neighbourhood,
          data.address.suburb,
          data.address.city || data.address.town || data.address.village,
          data.address.state,
        ]
          .filter(Boolean)
          .join(", ")
      : "");
  return name ? String(name) : "";
}

function formatCoord(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  // Keep reasonable precision for maps while avoiding noisy strings in inputs
  return n.toFixed(6);
}

function geolocationErrorToMessage(err) {
  if (!err) return "Unable to access location.";
  // Standard codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  if (err.code === 1) return "Location permission was denied. Please allow access and try again.";
  if (err.code === 2) return "Location information is unavailable on this device/network.";
  if (err.code === 3) return "Timed out while fetching location. Please try again.";
  return err.message || "Unable to access location.";
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
  const [error, setError] = useState("");

  // UX state for "Find My Location"
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState({ type: "", message: "" }); // type: success|error|info

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

  const onFindMyLocation = async () => {
    setError("");
    setLocationStatus({ type: "", message: "" });

    if (!("geolocation" in navigator)) {
      setLocationStatus({
        type: "error",
        message: "Geolocation is not supported by this browser. Please enter location manually.",
      });
      return;
    }

    setLocating(true);
    try {
      const coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err),
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 10_000,
          }
        );
      });

      const lat = Number(coords.latitude);
      const lng = Number(coords.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Could not read valid coordinates from the device.");
      }

      // 1) Update coords (drives MapView center+marker)
      setLatText(formatCoord(lat));
      setLngText(formatCoord(lng));

      // 2) Reverse-geocode best-effort; fall back to coord label
      let resolvedLabel = "";
      try {
        resolvedLabel = await reverseGeocodeNominatim({ lat, lng });
      } catch {
        // Ignore reverse-geocode errors; we still have coordinates.
      }

      const fallbackLabel = `Current Location (${formatCoord(lat)}, ${formatCoord(lng)})`;
      setLocationText(resolvedLabel || fallbackLabel);

      // 3) Trigger validation after setting value (if any location-related errors were showing)
      const msg = validate();
      setError(msg || "");

      setLocationStatus({
        type: "success",
        message: "Location updated from your current position.",
      });
    } catch (e) {
      setLocationStatus({
        type: "error",
        message: geolocationErrorToMessage(e),
      });
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const msg = validate();
    if (msg) return setError(msg);

    setBusy(true);
    try {
      // Persisting of location is intentionally not wired into the data layer here,
      // because the current request schema in this repo does not include location fields.
      // This change adds a UI map preview for the request flow and mechanic detail view.
      const req = await dataService.createRequest({ user, vehicle, issueDescription, contact });

      // In mock mode, the UI could extend local storage later; for now we navigate as usual.
      navigate(`/requests/${req.id}`);
    } catch (err) {
      setError(err.message || "Could not submit request.");
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

          <div className="grid2" style={{ alignItems: "end" }}>
            <div className="field">
              <label className="label" htmlFor="locationText">
                Location / landmark
              </label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  id="locationText"
                  name="locationText"
                  className="input"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g., Near Anna Nagar Tower Park"
                  disabled={locating}
                  aria-describedby="locationHint"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onFindMyLocation}
                  disabled={locating}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {locating ? "Locating…" : "Find My Location"}
                </Button>
              </div>
              <div id="locationHint" className="hint">
                Optional: add a short landmark or area name, or use <strong>Find My Location</strong> to auto-fill.
              </div>
            </div>

            <div />

            <Input
              label="Latitude"
              name="latitude"
              value={latText}
              onChange={(e) => setLatText(e.target.value)}
              placeholder="e.g., 13.0827"
              hint="Optional. If provided, longitude is required too."
              disabled={locating}
            />
            <Input
              label="Longitude"
              name="longitude"
              value={lngText}
              onChange={(e) => setLngText(e.target.value)}
              placeholder="e.g., 80.2707"
              hint="Optional. If provided, latitude is required too."
              disabled={locating}
            />
          </div>

          {locationStatus.message ? (
            <div className={`alert ${locationStatus.type === "success" ? "alert-success" : locationStatus.type === "error" ? "alert-error" : "alert-info"}`}>
              {locationStatus.message}
            </div>
          ) : null}

          <MapView
            center={marker || undefined}
            marker={marker || undefined}
            height={280}
            ariaLabel="Selected location map"
          />

          {locationText.trim() ? (
            <div className="hint" style={{ marginTop: -6 }}>
              Location note: <strong>{locationText.trim()}</strong>
            </div>
          ) : null}

          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="row">
            <Button type="submit" disabled={busy || locating}>
              {busy ? "Submitting..." : "Submit request"}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate("/requests")} disabled={locating}>
              View my requests
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

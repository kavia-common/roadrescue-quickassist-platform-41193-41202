import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { MapView } from "../components/MapView";
import { dataService } from "../services/dataService";
import { fetchClient } from "../utils/fetchClient";
import { withTimeout } from "../utils/withTimeout";

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
      Accept: "application/json",
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

function isPermissionDenied(err) {
  // Standard codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  return Number(err?.code) === 1;
}

function geolocationErrorToMessage(err) {
  if (!err) return "Unable to access location.";
  // Standard codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  if (Number(err.code) === 1) {
    return "Location permission was denied. Please enable location in your browser settings and click Retry, or enter your location manually.";
  }
  if (Number(err.code) === 2) return "Location information is unavailable on this device/network.";
  if (Number(err.code) === 3) return "Timed out while fetching location. Please try again.";
  return err.message || "Unable to access location.";
}

/**
 * Best-effort permission precheck.
 * Returns: "granted" | "denied" | "prompt" | "unknown"
 */
async function getGeolocationPermissionState() {
  try {
    // Some browsers don't implement navigator.permissions; keep it optional.
    if (!navigator?.permissions?.query) return "unknown";
    const res = await navigator.permissions.query({ name: "geolocation" });
    const state = String(res?.state || "").toLowerCase();
    if (state === "granted" || state === "denied" || state === "prompt") return state;
    return "unknown";
  } catch {
    return "unknown";
  }
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

  /**
   * Inline non-blocking notice near Location / landmark field.
   * This is intentionally separate from the existing "locationStatus" toast-like banner.
   */
  const [geoPermissionNotice, setGeoPermissionNotice] = useState({ visible: false, message: "" });

  const [locationStatus, setLocationStatus] = useState({ type: "", message: "" }); // type: success|error|info

  const parsedLat = useMemo(() => parseNumberOrNull(latText), [latText]);
  const parsedLng = useMemo(() => parseNumberOrNull(lngText), [lngText]);

  const marker = useMemo(() => {
    if (parsedLat == null || parsedLng == null) return null;
    return { lat: parsedLat, lng: parsedLng };
  }, [parsedLat, parsedLng]);

  const locateAttemptIdRef = useRef(0);

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

  useEffect(() => {
    // Preemptively show guidance if permission is already blocked (when supported).
    // Do not block or attempt geolocation here; just show a helpful inline notice.
    let mounted = true;
    (async () => {
      const state = await getGeolocationPermissionState();
      if (!mounted) return;

      if (state === "denied") {
        // eslint-disable-next-line no-console
        console.info("[Geolocation] PermissionStatus is 'denied' (precheck). Showing inline guidance.");
        setGeoPermissionNotice({
          visible: true,
          message:
            "Location permission was denied. Please enable location in your browser settings and click Retry, or enter your location manually.",
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const onFindMyLocation = async () => {
    // Each click increments an attempt id so late async results don't overwrite newer attempts.
    locateAttemptIdRef.current += 1;
    const attemptId = locateAttemptIdRef.current;

    setError("");
    setLocationStatus({ type: "", message: "" });

    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line no-console
      console.info("[Geolocation] Not supported by this browser.");
      setGeoPermissionNotice({ visible: true, message: "Geolocation is not supported by this browser. Please enter location manually." });
      return;
    }

    // If permissions API is available and indicates a permanent deny, do not attempt geolocation.
    // Still allow Retry to attempt again (some users may change settings and come back).
    const preState = await getGeolocationPermissionState();
    if (preState === "denied") {
      // eslint-disable-next-line no-console
      console.info("[Geolocation] PermissionStatus is 'denied' (preempt). Skipping getCurrentPosition.");
      setGeoPermissionNotice({
        visible: true,
        message:
          "Location permission was denied. Please enable location in your browser settings and click Retry, or enter your location manually.",
      });
      return;
    }

    setLocating(true);
    try {
      // eslint-disable-next-line no-console
      console.info("[Geolocation] Requesting current position…");

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

      // If a newer attempt happened, ignore this result.
      if (attemptId !== locateAttemptIdRef.current) return;

      const lat = Number(coords.latitude);
      const lng = Number(coords.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Could not read valid coordinates from the device.");
      }

      // eslint-disable-next-line no-console
      console.info("[Geolocation] Success:", { lat, lng });

      // Successful geolocation: clear permission notice and errors
      setGeoPermissionNotice({ visible: false, message: "" });

      // 1) Update coords (drives MapView center+marker)
      setLatText(formatCoord(lat));
      setLngText(formatCoord(lng));

      // 2) Reverse-geocode best-effort with timeout; fall back to coord label
      let resolvedLabel = "";
      try {
        // Ensure denial or a stalled network call never leaves the UI in a "locating" hang.
        resolvedLabel = await withTimeout(reverseGeocodeNominatim({ lat, lng }), 4500, "Reverse geocoding");
      } catch (revErr) {
        // eslint-disable-next-line no-console
        console.info("[Geolocation] Reverse geocoding skipped/failed (non-blocking):", revErr?.message || revErr);
      }

      const fallbackLabel = `Current Location (${formatCoord(lat)}, ${formatCoord(lng)})`;

      // IMPORTANT: keep manual entry functional and do not clear existing input.
      // We only set location text on success; on denial we leave it unchanged.
      setLocationText(resolvedLabel || fallbackLabel);

      // 3) Trigger validation after setting value (if any location-related errors were showing)
      const msg = validate();
      setError(msg || "");

      setLocationStatus({
        type: "success",
        message: "Location updated from your current position.",
      });
    } catch (e) {
      if (attemptId !== locateAttemptIdRef.current) return;

      // eslint-disable-next-line no-console
      console.error("[Geolocation] Failed:", e);

      if (isPermissionDenied(e)) {
        // Requirement: non-blocking inline notice near location field, with Retry button.
        setGeoPermissionNotice({
          visible: true,
          message:
            "Location permission was denied. Please enable location in your browser settings and click Retry, or enter your location manually.",
        });

        // Keep UI clean: do not show a big blocking error banner for this case.
        setLocationStatus({ type: "", message: "" });
      } else {
        // Other geolocation errors can still be shown in existing status area.
        setLocationStatus({ type: "error", message: geolocationErrorToMessage(e) });
      }
    } finally {
      // Always resolve loading state; never leave spinner lingering.
      if (attemptId === locateAttemptIdRef.current) setLocating(false);
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
                  {locating ? "Locating…" : geoPermissionNotice.visible ? "Retry" : "Find My Location"}
                </Button>
              </div>

              {geoPermissionNotice.visible ? (
                <div className="alert alert-info" style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Location permission needed</div>
                  <div style={{ lineHeight: 1.35 }}>{geoPermissionNotice.message}</div>
                </div>
              ) : null}

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
            <div
              className={`alert ${
                locationStatus.type === "success"
                  ? "alert-success"
                  : locationStatus.type === "error"
                    ? "alert-error"
                    : "alert-info"
              }`}
            >
              {locationStatus.message}
            </div>
          ) : null}

          <MapView center={marker || undefined} marker={marker || undefined} height={280} ariaLabel="Selected location map" />

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

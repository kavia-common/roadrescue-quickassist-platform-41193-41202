import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import MapView from "../components/MapView";
import { dataService } from "../services/dataService";

const CHENNAI = { lat: 13.0827, lng: 80.2707 };

function isFiniteNumberString(value) {
  if (value === "" || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n);
}

function validateLatLngStrings(latStr, lngStr) {
  // Empty is treated as invalid, caller may show helper and/or fallback.
  if (!isFiniteNumberString(latStr) || !isFiniteNumberString(lngStr)) {
    return {
      ok: false,
      latError: "Enter a number (e.g., 13.0827).",
      lngError: "Enter a number (e.g., 80.2707).",
    };
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);

  const latOk = lat >= -90 && lat <= 90;
  const lngOk = lng >= -180 && lng <= 180;

  return {
    ok: latOk && lngOk,
    latError: latOk ? "" : "Latitude must be between -90 and 90.",
    lngError: lngOk ? "" : "Longitude must be between -180 and 180.",
  };
}

function formatCoordsText(latStr, lngStr) {
  // Copy-friendly, deterministic format. If inputs are invalid, use Chennai as safe fallback.
  const lat = Number(latStr);
  const lng = Number(lngStr);
  const safeLat = Number.isFinite(lat) ? lat : CHENNAI.lat;
  const safeLng = Number.isFinite(lng) ? lng : CHENNAI.lng;
  return `${safeLat.toFixed(5)}, ${safeLng.toFixed(5)}`;
}

function geolocationErrorToMessage(err) {
  if (!err) return "Unable to fetch your location.";
  // https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError/code
  if (err.code === 1) return "Location permission denied. You can enter coordinates manually.";
  if (err.code === 2) return "Location unavailable. Please try again or enter coordinates manually.";
  if (err.code === 3) return "Location request timed out. Please try again.";
  return err.message || "Unable to fetch your location.";
}

// PUBLIC_INTERFACE
export function SubmitRequestPage({ user }) {
  /** Form to submit a new breakdown request. */
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", plate: "" });
  const [issueDescription, setIssueDescription] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Share Location UI feedback (kept separate from form validation error)
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ type: "", message: "" }); // success|error|info

  // Controlled location inputs (strings so users can type partial values like "-" or "13.")
  const [latInput, setLatInput] = useState(String(CHENNAI.lat));
  const [lngInput, setLngInput] = useState(String(CHENNAI.lng));

  // Debounced map location (numbers)
  const [mapLat, setMapLat] = useState(CHENNAI.lat);
  const [mapLng, setMapLng] = useState(CHENNAI.lng);

  const locationValidation = useMemo(
    () => validateLatLngStrings(latInput.trim(), lngInput.trim()),
    [latInput, lngInput]
  );

  // Debounce updates to MapView to avoid excessive rerenders while typing.
  // If invalid/empty values are present, fallback to Chennai.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (locationValidation.ok) {
        setMapLat(Number(latInput));
        setMapLng(Number(lngInput));
      } else {
        setMapLat(CHENNAI.lat);
        setMapLng(CHENNAI.lng);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [latInput, lngInput, locationValidation.ok]);

  const setCoordinatesFromNumbers = (lat, lng, { silent = false } = {}) => {
    const nextLat = Number(lat);
    const nextLng = Number(lng);

    // If values are invalid, keep Chennai defaults (as requested).
    const latOk = Number.isFinite(nextLat) && nextLat >= -90 && nextLat <= 90;
    const lngOk = Number.isFinite(nextLng) && nextLng >= -180 && nextLng <= 180;

    if (!latOk || !lngOk) {
      setLatInput(String(CHENNAI.lat));
      setLngInput(String(CHENNAI.lng));
      if (!silent) {
        setGeoStatus({
          type: "error",
          message: "Received invalid coordinates from the browser. Falling back to Chennai defaults.",
        });
      }
      return;
    }

    // Use a consistent precision for better UX + easy copy/paste
    setLatInput(nextLat.toFixed(5));
    setLngInput(nextLng.toFixed(5));
    if (!silent) setGeoStatus({ type: "success", message: "Location detected and applied." });
  };

  // PUBLIC_INTERFACE
  const useMyLocation = async () => {
    /** Use browser Geolocation API to fill lat/lng inputs; keeps Chennai fallback on failure. */
    setGeoStatus({ type: "", message: "" });

    if (!("geolocation" in navigator)) {
      setGeoStatus({
        type: "error",
        message: "Geolocation is not supported in this browser. Please enter coordinates manually.",
      });
      return;
    }

    setGeoBusy(true);

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30_000,
        });
      });

      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;

      setCoordinatesFromNumbers(lat, lng);
    } catch (e) {
      // Keep Chennai defaults; do not overwrite existing typed coordinates on failure.
      setGeoStatus({ type: "error", message: geolocationErrorToMessage(e) });
    } finally {
      setGeoBusy(false);
    }
  };

  // PUBLIC_INTERFACE
  const copyCoordinates = async () => {
    /** Copy the current lat/lng to clipboard using the browser Clipboard API. */
    setGeoStatus({ type: "", message: "" });

    const text = formatCoordsText(latInput.trim(), lngInput.trim());

    if (!navigator.clipboard?.writeText) {
      setGeoStatus({
        type: "error",
        message: "Clipboard is not available in this browser context. Please copy the values manually.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setGeoStatus({ type: "success", message: `Copied: ${text}` });
    } catch {
      setGeoStatus({ type: "error", message: "Could not copy to clipboard. Please try again." });
    }
  };

  const validate = () => {
    if (!vehicle.make.trim()) return "Vehicle make is required.";
    if (!vehicle.model.trim()) return "Vehicle model is required.";
    if (!issueDescription.trim()) return "Issue description is required.";
    if (!contact.name.trim()) return "Contact name is required.";
    if (!contact.phone.trim()) return "Contact phone is required.";
    // Note: We intentionally do NOT block submission on invalid lat/lng in this MVP,
    // because location is not persisted yet; the map falls back to Chennai.
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const msg = validate();
    if (msg) return setError(msg);

    setBusy(true);
    try {
      const req = await dataService.createRequest({ user, vehicle, issueDescription, contact });
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
        <p className="lead">Tell us what happened. A mechanic will review and accept it.</p>
      </div>

      <Card title="Request details" subtitle="No maps/AI—manual details only.">
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

          {/* Location inputs */}
          <div
            className="card"
            style={{
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "var(--shadow-sm)",
              marginTop: 4,
            }}
          >
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Location (Lat/Lng)
                </h3>
                <p className="card-subtitle" style={{ margin: "6px 0 0" }}>
                  Enter coordinates manually or use your current location. Invalid values fall back to Chennai defaults.
                </p>
              </div>
            </div>

            <div className="card-body">
              {/* Share Location controls */}
              <div
                className="row"
                style={{
                  marginTop: 0,
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 10,
                }}
              >
                <Button
                  type="button"
                  onClick={useMyLocation}
                  disabled={geoBusy || busy}
                  style={{ minWidth: 160 }}
                >
                  {geoBusy ? "Detecting…" : "Use My Location"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={copyCoordinates}
                  disabled={geoBusy || busy}
                  style={{ minWidth: 150 }}
                >
                  Copy Coordinates
                </Button>

                <div className="hint" style={{ margin: 0 }}>
                  {("geolocation" in navigator) ? "Uses browser GPS permissions." : "Geolocation unavailable."}
                </div>
              </div>

              {geoStatus.message ? (
                <div
                  className={`alert ${geoStatus.type === "success" ? "alert-success" : geoStatus.type === "error" ? "alert-error" : ""}`}
                  style={{ marginTop: 10 }}
                >
                  {geoStatus.message}
                </div>
              ) : null}

              <div className="grid2" style={{ marginTop: 10 }}>
                <Input
                  label="Latitude"
                  name="latitude"
                  value={latInput}
                  onChange={(e) => {
                    setGeoStatus({ type: "", message: "" });
                    setLatInput(e.target.value);
                  }}
                  placeholder="13.0827"
                  hint="Range: -90 to 90"
                  error={latInput.trim() && locationValidation.latError ? locationValidation.latError : ""}
                  disabled={geoBusy}
                />
                <Input
                  label="Longitude"
                  name="longitude"
                  value={lngInput}
                  onChange={(e) => {
                    setGeoStatus({ type: "", message: "" });
                    setLngInput(e.target.value);
                  }}
                  placeholder="80.2707"
                  hint="Range: -180 to 180"
                  error={lngInput.trim() && locationValidation.lngError ? locationValidation.lngError : ""}
                  disabled={geoBusy}
                />
              </div>

              <div className="hint" style={{ marginTop: 6 }}>
                Map updates live (debounced). Current map target:{" "}
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {mapLat.toFixed(5)}, {mapLng.toFixed(5)}
                </span>
              </div>
            </div>
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

          {/* OpenStreetMap preview (bound to the Lat/Lng inputs). */}
          <MapView lat={mapLat} lng={mapLng} />

          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="row">
            <Button type="submit" disabled={busy || geoBusy}>
              {busy ? "Submitting..." : "Submit request"}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate("/requests")} disabled={geoBusy}>
              View my requests
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

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

// PUBLIC_INTERFACE
export function SubmitRequestPage({ user }) {
  /** Form to submit a new breakdown request. */
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", plate: "" });
  const [issueDescription, setIssueDescription] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
                  Enter coordinates manually. Invalid values will fall back to Chennai defaults.
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="grid2">
                <Input
                  label="Latitude"
                  name="latitude"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="13.0827"
                  hint="Range: -90 to 90"
                  error={latInput.trim() && locationValidation.latError ? locationValidation.latError : ""}
                />
                <Input
                  label="Longitude"
                  name="longitude"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="80.2707"
                  hint="Range: -180 to 180"
                  error={lngInput.trim() && locationValidation.lngError ? locationValidation.lngError : ""}
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

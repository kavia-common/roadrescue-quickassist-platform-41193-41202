import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { LocationMap } from "../components/LocationMap";
import { dataService } from "../services/dataService";
import { fetchClient } from "../utils/fetchClient";

/**
 * Address geocoding using OpenStreetMap Nominatim.
 * IMPORTANT: Per requirements, we DO NOT use navigator.geolocation or request permissions.
 */
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetchClient(url, {
    headers: {
      // Per instruction. Note: some browsers may not allow overriding User-Agent, but we include it anyway.
      "User-Agent": "RoadRescue-MVP/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed (${response.status}).`);
  }

  const data = await response.json();
  if (!data || data.length === 0) {
    throw new Error("Address not found");
  }

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

function isValidCoord(n, min, max) {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

function formatCoord(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return n.toFixed(6);
}

// PUBLIC_INTERFACE
export function SubmitRequestPage({ user }) {
  /** Address-based request submission flow using Nominatim geocoding + shared Leaflet map preview. */
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", plate: "" });
  const [issueDescription, setIssueDescription] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "" });

  // New address-based location fields
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [displayAddress, setDisplayAddress] = useState("");

  const [finding, setFinding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canShowMap = useMemo(() => isValidCoord(lat, -90, 90) && isValidCoord(lon, -180, 180), [lat, lon]);

  const validate = () => {
    if (!vehicle.make.trim()) return "Vehicle make is required.";
    if (!vehicle.model.trim()) return "Vehicle model is required.";
    if (!issueDescription.trim()) return "Issue description is required.";
    if (!contact.name.trim()) return "Contact name is required.";
    if (!contact.phone.trim()) return "Contact phone is required.";

    if (!address.trim()) return "Breakdown address is required.";
    if (!canShowMap) return "Please click “Find location” to resolve the address to coordinates.";
    return "";
  };

  const handleFindLocation = async () => {
    setError("");
    setDisplayAddress("");
    setLat(null);
    setLon(null);

    const trimmed = address.trim();
    if (!trimmed) {
      setError("Please enter a breakdown address first.");
      return;
    }

    setFinding(true);
    try {
      const location = await geocodeAddress(trimmed);
      if (!isValidCoord(location.lat, -90, 90) || !isValidCoord(location.lon, -180, 180)) {
        throw new Error("Geocoding returned invalid coordinates.");
      }

      setLat(location.lat);
      setLon(location.lon);
      setDisplayAddress(location.displayName || trimmed);
    } catch (err) {
      // Requirement: show error if not found. Keep it non-crashy and visible.
      setError(err?.message || "Could not find location. Please enter a valid address.");
    } finally {
      setFinding(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) return setError(msg);

    setBusy(true);
    try {
      const req = await dataService.createRequest({
        vehicle: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
        issueDescription,
        address: displayAddress || address.trim(),
        latitude: lat,
        longitude: lon,
      });

      navigate(`/requests/${req.id}`);
    } catch (err) {
      setError(err?.message || "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Submit a breakdown request</h1>
        <p className="lead">Enter your breakdown address. We’ll convert it to coordinates and show it on the map.</p>
      </div>

      <Card title="Request details" subtitle="Address-based geocoding (OpenStreetMap Nominatim).">
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

          <div className="field">
            <label className="label" htmlFor="address">
              Breakdown address <span className="req">*</span>
            </label>

            <textarea
              id="address"
              className={`textarea ${error && !address.trim() ? "input-error" : ""}`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter the full address (area, city, landmark, etc.)"
              rows={3}
              disabled={finding || busy}
            />

            <div className="row" style={{ marginTop: 8 }}>
              <Button type="button" variant="ghost" size="sm" onClick={handleFindLocation} disabled={finding || busy}>
                {finding ? "Finding…" : "Find location"}
              </Button>

              <div className="hint">No GPS permissions needed. We use OpenStreetMap Nominatim.</div>
            </div>
          </div>

          <div className="grid2">
            <Input
              label="Latitude"
              name="latitude"
              value={lat == null ? "" : formatCoord(lat)}
              onChange={() => {}}
              placeholder="Auto-filled"
              disabled
              hint="Read-only"
            />
            <Input
              label="Longitude"
              name="longitude"
              value={lon == null ? "" : formatCoord(lon)}
              onChange={() => {}}
              placeholder="Auto-filled"
              disabled
              hint="Read-only"
            />
          </div>

          {displayAddress ? (
            <div className="alert alert-info" style={{ marginTop: 4 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>Resolved address</div>
              <div style={{ lineHeight: 1.35 }}>{displayAddress}</div>
            </div>
          ) : null}

          {canShowMap ? (
            <div
              onWheel={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <LocationMap lat={lat} lon={lon} address={displayAddress || ""} height={300} />
            </div>
          ) : null}

          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="row">
            <Button type="submit" disabled={busy || finding}>
              {busy ? "Submitting..." : "Submit request"}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate("/requests")} disabled={finding}>
              View my requests
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

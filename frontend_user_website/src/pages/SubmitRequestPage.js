import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import MapView from "../components/MapView";
import { dataService } from "../services/dataService";

const CHENNAI = { lat: 13.0827, lng: 80.2707 };

/**
 * Minimal client-side geocoding using OpenStreetMap Nominatim.
 * - Uses `format=jsonv2` and `limit=1` for a single best match.
 * - Requires a "User-Agent" on server-side, but browsers can't set it reliably; we add `accept-language`
 *   and use a modest rate (one request per explicit user action).
 */
async function geocodeAddressNominatim(address, { signal } = {}) {
  const q = address.trim();
  if (!q) return { ok: false, message: "Address is required." };

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      // Best-effort; allowed by browsers, unlike User-Agent.
      "Accept-Language": navigator.language || "en",
    },
    signal,
  });

  if (!resp.ok) {
    throw new Error(`Geocoding failed (HTTP ${resp.status}). Please try again.`);
  }

  const data = await resp.json();
  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, message: "No matches found. Please refine the address." };
  }

  const top = data[0];
  const lat = Number(top?.lat);
  const lng = Number(top?.lon);
  const displayName = String(top?.display_name || q);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: "Found an address match, but coordinates were invalid." };
  }

  return { ok: true, lat, lng, displayName };
}

function isSecureEnoughForBrowserAPIs() {
  // Some browser APIs (geolocation, clipboard) require secure context.
  // "http://localhost" is treated as secure; arbitrary http origins are not.
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  return window.isSecureContext || isLocalhost;
}

async function queryGeoPermissionState() {
  // Use Permissions API when available.
  // Note: Safari may not support navigator.permissions or "geolocation" name.
  if (!navigator.permissions?.query) return { supported: false, state: "unknown" };
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return { supported: true, state: result?.state || "unknown" };
  } catch {
    return { supported: false, state: "unknown" };
  }
}

function geolocationErrorToMessage(err) {
  if (!err) return "Unable to fetch your location.";

  // https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError/code
  if (err.code === 1) {
    return "Location permission denied. Please allow location access in your browser settings, then try again.";
  }
  if (err.code === 2) {
    return "Location unavailable. Please check GPS/network and try again.";
  }
  if (err.code === 3) {
    return "Location request timed out. Try again (or move to an area with better GPS signal).";
  }

  return err.message || "Unable to fetch your location.";
}

async function tryClipboardWriteText(text) {
  // Prefer async Clipboard API when available & allowed.
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function execCommandCopyFallback(text) {
  // Fallback for older browsers / blocked clipboard API.
  // Uses a temporary textarea and document.execCommand('copy').
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    // Keep it off-screen, but in the document
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    const ok = document.execCommand && document.execCommand("copy");
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
export function SubmitRequestPage({ user }) {
  /** Form to submit a new breakdown request with address-based geocoding (Nominatim). */
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", plate: "" });
  const [issueDescription, setIssueDescription] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Address + geocoding state
  const [addressInput, setAddressInput] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ type: "", message: "" }); // success|error|info

  // Map location (numbers)
  const [mapLat, setMapLat] = useState(CHENNAI.lat);
  const [mapLng, setMapLng] = useState(CHENNAI.lng);

  // Abort controller for geocoding requests (avoid race updates)
  const geocodeAbortRef = useRef(null);

  const secureContextOk = useMemo(() => isSecureEnoughForBrowserAPIs(), []);
  const geoSupported = useMemo(() => "geolocation" in navigator, []);
  const canAttemptGeolocation = secureContextOk && geoSupported;

  const validate = () => {
    if (!vehicle.make.trim()) return "Vehicle make is required.";
    if (!vehicle.model.trim()) return "Vehicle model is required.";
    if (!issueDescription.trim()) return "Issue description is required.";
    if (!contact.name.trim()) return "Contact name is required.";
    if (!contact.phone.trim()) return "Contact phone is required.";
    if (!selectedAddress.trim()) return "Please search and select an address.";
    return "";
  };

  const setCoordinatesFromNumbers = (lat, lng, { address = "", silent = false } = {}) => {
    const nextLat = Number(lat);
    const nextLng = Number(lng);

    const latOk = Number.isFinite(nextLat) && nextLat >= -90 && nextLat <= 90;
    const lngOk = Number.isFinite(nextLng) && nextLng >= -180 && nextLng <= 180;

    if (!latOk || !lngOk) {
      setMapLat(CHENNAI.lat);
      setMapLng(CHENNAI.lng);
      if (!silent) {
        setGeoStatus({
          type: "error",
          message: "Received invalid coordinates. Falling back to Chennai defaults.",
        });
      }
      return;
    }

    setMapLat(nextLat);
    setMapLng(nextLng);
    if (address) setSelectedAddress(address);

    if (!silent) {
      setGeoStatus({ type: "success", message: "Location applied." });
    }
  };

  // PUBLIC_INTERFACE
  const findAddress = async () => {
    /** Geocode the entered address via OpenStreetMap Nominatim and update map + selectedAddress. */
    setGeoStatus({ type: "", message: "" });

    const q = addressInput.trim();
    if (!q) {
      setGeoStatus({ type: "error", message: "Enter an address to search." });
      return;
    }

    // Cancel any in-flight geocode
    if (geocodeAbortRef.current) {
      try {
        geocodeAbortRef.current.abort();
      } catch {
        // no-op
      }
    }
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    setGeoBusy(true);
    try {
      const result = await geocodeAddressNominatim(q, { signal: controller.signal });
      if (!result.ok) {
        setGeoStatus({ type: "error", message: result.message || "Could not geocode this address." });
        return;
      }

      setCoordinatesFromNumbers(result.lat, result.lng, { address: result.displayName, silent: true });
      setSelectedAddress(result.displayName);
      setGeoStatus({ type: "success", message: "Address found and pinned on the map." });
    } catch (e) {
      if (e?.name === "AbortError") return;
      setGeoStatus({ type: "error", message: e?.message || "Geocoding failed. Please try again." });
    } finally {
      setGeoBusy(false);
    }
  };

  // PUBLIC_INTERFACE
  const useMyLocation = async () => {
    /** Use browser Geolocation API and set a "GPS (lat,lng)" pseudo-address for persistence. */
    setGeoStatus({ type: "", message: "" });

    if (!secureContextOk) {
      setGeoStatus({
        type: "error",
        message:
          "Use My Location requires a secure connection (HTTPS) or localhost. Please switch to HTTPS, or use address search.",
      });
      return;
    }

    if (!geoSupported) {
      setGeoStatus({
        type: "error",
        message: "Geolocation is not supported in this browser. Please use address search.",
      });
      return;
    }

    setGeoBusy(true);

    try {
      const perm = await queryGeoPermissionState();
      if (perm.supported && perm.state === "denied") {
        setGeoStatus({
          type: "error",
          message:
            "Location permission is blocked for this site. Please open your browser site settings and set Location to “Allow”, then try again.",
        });
        return;
      }

      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30_000,
        });
      });

      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;

      const gpsLabel =
        Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
          ? `GPS (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`
          : "GPS (unknown)";
      setCoordinatesFromNumbers(lat, lng, { address: gpsLabel });
    } catch (e) {
      setGeoStatus({ type: "error", message: geolocationErrorToMessage(e) });
    } finally {
      setGeoBusy(false);
    }
  };

  // PUBLIC_INTERFACE
  const copyLocation = async () => {
    /** Copy the current address + coordinates (when available) to clipboard. */
    setGeoStatus({ type: "", message: "" });

    const safeAddr = selectedAddress?.trim();
    const coords = `${mapLat.toFixed(5)}, ${mapLng.toFixed(5)}`;
    const text = safeAddr ? `${safeAddr} — ${coords}` : coords;

    try {
      if (secureContextOk) {
        const ok = await tryClipboardWriteText(text);
        if (ok) {
          setGeoStatus({ type: "success", message: `Copied: ${text}` });
          return;
        }
      }

      const fallbackOk = execCommandCopyFallback(text);
      if (fallbackOk) {
        setGeoStatus({ type: "success", message: `Copied (fallback): ${text}` });
        return;
      }

      setGeoStatus({
        type: "error",
        message: "Could not copy automatically (clipboard blocked). Please copy manually.",
      });
    } catch (e) {
      setGeoStatus({
        type: "error",
        message: e?.message ? `Could not copy: ${e.message}` : "Could not copy to clipboard.",
      });
    }
  };

  // Cleanup any in-flight geocode when unmounting
  useEffect(() => {
    return () => {
      if (geocodeAbortRef.current) {
        try {
          geocodeAbortRef.current.abort();
        } catch {
          // no-op
        }
      }
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const msg = validate();
    if (msg) return setError(msg);

    setBusy(true);
    try {
      const req = await dataService.createRequest({
        user,
        vehicle,
        issueDescription,
        contact,
        location: {
          address: selectedAddress,
          lat: mapLat,
          lng: mapLng,
        },
      });
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

      <Card title="Request details" subtitle="Address-based location (OpenStreetMap).">
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
                  Location (Address)
                </h3>
                <p className="card-subtitle" style={{ margin: "6px 0 0" }}>
                  Search by address (Nominatim) to pin a location. You can also use GPS as a fallback.
                </p>
              </div>
            </div>

            <div className="card-body">
              {!secureContextOk ? (
                <div className="alert alert-info" style={{ marginBottom: 10 }}>
                  GPS and clipboard features work best over <strong>HTTPS</strong> (or localhost). Current origin is not a secure context, so browser permissions may be blocked.
                </div>
              ) : null}

              <div className="grid2" style={{ alignItems: "end" }}>
                <Input
                  label="Address"
                  name="address"
                  value={addressInput}
                  onChange={(e) => {
                    setGeoStatus({ type: "", message: "" });
                    setAddressInput(e.target.value);
                  }}
                  placeholder="Street, city, region…"
                  required
                  disabled={geoBusy || busy}
                  hint="Tip: include city/landmark for better results."
                />

                <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
                  <Button type="button" onClick={findAddress} disabled={geoBusy || busy} style={{ minWidth: 160 }}>
                    {geoBusy ? "Searching…" : "Find Address"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={useMyLocation}
                    disabled={!canAttemptGeolocation || geoBusy || busy}
                    style={{ minWidth: 160 }}
                    title={
                      !canAttemptGeolocation
                        ? !geoSupported
                          ? "Geolocation is not supported by this browser."
                          : "Requires HTTPS (or localhost) to request location."
                        : ""
                    }
                  >
                    Use My Location
                  </Button>
                </div>
              </div>

              {geoStatus.message ? (
                <div
                  className={`alert ${
                    geoStatus.type === "success" ? "alert-success" : geoStatus.type === "error" ? "alert-error" : "alert-info"
                  }`}
                  style={{ marginTop: 10 }}
                >
                  {geoStatus.message}
                </div>
              ) : null}

              <div className="row" style={{ marginTop: 10, justifyContent: "flex-start" }}>
                <Button type="button" variant="ghost" onClick={copyLocation} disabled={geoBusy || busy}>
                  Copy Location
                </Button>

                <div className="hint" style={{ margin: 0 }}>
                  Selected:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {selectedAddress || "—"}
                  </span>
                </div>
              </div>

              <div className="hint" style={{ marginTop: 8 }}>
                Map target:{" "}
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

          {/* OpenStreetMap preview (bound to address/lat/lng). */}
          <MapView lat={mapLat} lng={mapLng} address={selectedAddress} />

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

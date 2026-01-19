import React, { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useUserRequests } from "../hooks/useUserRequests";
import { UserShell } from "../components/layout/UserShell";
import { LocationMap } from "../components/LocationMap";

async function geocodeAddressNominatim(address) {
  // Use OpenStreetMap Nominatim for client-side geocoding (no backend required).
  // Note: Nominatim usage policy recommends a proper User-Agent; browsers restrict it.
  // We keep the request simple and include `accept-language` to improve relevance.
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", address);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept-Language": "en",
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.lat || !first?.lon) {
    return null;
  }

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

/**
 * PUBLIC_INTERFACE
 */
export function SubmitRequestPage() {
  /** UI-only request submission stored to localStorage via useUserRequests (schema preserved). */
  const { addRequest } = useUserRequests();

  // NOTE: We keep the existing persisted schema:
  // - vehicle: { make, model }
  // - problemDescription
  // - location
  // - contactPhone
  //
  // The additional UI-only fields below do NOT change what is saved.
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  const [issueDescription, setIssueDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [breakdownAddress, setBreakdownAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  const [showMap, setShowMap] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [status, setStatus] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({});

  const validate = useMemo(() => {
    const next = {};
    if (!vehicleMake.trim()) next.vehicleMake = "Required.";
    if (!vehicleModel.trim()) next.vehicleModel = "Required.";
    if (!issueDescription.trim()) next.issueDescription = "Required.";
    if (!contactName.trim()) next.contactName = "Required.";
    if (!contactPhone.trim()) next.contactPhone = "Required.";
    if (!breakdownAddress.trim()) next.breakdownAddress = "Required.";
    // Latitude/Longitude are present as fields per reference; not required for MVP persistence.
    return next;
  }, [vehicleMake, vehicleModel, issueDescription, contactName, contactPhone, breakdownAddress]);

  const clearForm = () => {
    setVehicleMake("");
    setVehicleModel("");
    setVehicleYear("");
    setLicensePlate("");
    setIssueDescription("");
    setContactName("");
    setContactPhone("");
    setBreakdownAddress("");
    setLat("");
    setLon("");
    setShowMap(false);
    setIsGeocoding(false);
    setErrors({});
    setStatus({ type: "", message: "" });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    setErrors(validate);
    const hasErrors = Object.keys(validate).length > 0;
    if (hasErrors) {
      setStatus({ type: "error", message: "Please fix the highlighted fields." });
      return;
    }

    // Persist request payload for user read-only views.
    // We include lat/lon/address so Request Details can show the map, but we do not
    // introduce any status-changing behavior (user site is read-only for status).
    addRequest({
      vehicle: {
        make: vehicleMake,
        model: vehicleModel,
      },
      problemDescription: issueDescription,
      location: breakdownAddress,
      contactPhone,

      // Additional fields used by RequestDetailPage (display-only).
      breakdownAddress,
      lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
      lon: Number.isFinite(Number(lon)) ? Number(lon) : null,

      // Optional richer contact fields for detail display
      contactName,
    });

    setStatus({
      type: "success",
      message: "Request submitted successfully (mock). You can view it in My Requests.",
    });

    clearForm();
  };

  const onFindLocation = async () => {
    const address = breakdownAddress.trim();
    if (!address) {
      setStatus({ type: "error", message: "Please enter an address to find the location." });
      setShowMap(false);
      return;
    }

    setIsGeocoding(true);
    setStatus({ type: "info", message: "Finding location…" });

    try {
      const result = await geocodeAddressNominatim(address);
      if (!result) {
        setShowMap(false);
        setStatus({
          type: "error",
          message: "Could not find a location for that address. Please refine it and try again.",
        });
        return;
      }

      // Preserve prior UX: autofill the Latitude/Longitude fields and show a map marker.
      setLat(String(result.latitude));
      setLon(String(result.longitude));
      setShowMap(true);

      setStatus({
        type: "success",
        message: "Location found. Latitude/Longitude were auto-filled.",
      });
    } catch (e) {
      setShowMap(false);
      setStatus({ type: "error", message: e?.message || "Could not geocode that address." });
    } finally {
      setIsGeocoding(false);
    }
  };

  const parsedLat = Number(lat);
  const parsedLon = Number(lon);
  const canShowMapFromCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLon);

  return (
    <UserShell title="Submit a breakdown request">
      <Card
        title="Request details"
        subtitle="No backend call yet — stored locally in your browser."
        className="rrq-auth-card rrq-srCard"
      >
        {status.message ? (
          <div
            className={`alert ${status.type === "success" ? "alert-success" : status.type === "error" ? "alert-error" : "alert-info"}`}
            style={{ marginBottom: 12 }}
          >
            {status.message}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="rrq-srForm" aria-label="Submit breakdown request form">
          <div className="rrq-srGrid2">
            <Input
              label="Make"
              name="vehicleMake"
              value={vehicleMake}
              onChange={(e) => setVehicleMake(e.target.value)}
              placeholder="e.g., Toyota"
              required
              error={errors.vehicleMake}
            />
            <Input
              label="Model"
              name="vehicleModel"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g., Corolla"
              required
              error={errors.vehicleModel}
            />
            <Input
              label="Year"
              name="vehicleYear"
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
              placeholder="e.g., 2018"
            />
            <Input
              label="License Plate"
              name="licensePlate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g., ABC-1234"
            />
          </div>

          <div className="rrq-srFull">
            <div className="field">
              <label className="label" htmlFor="issueDescription">
                Issue Description <span className="req">*</span>
              </label>
              <textarea
                id="issueDescription"
                className={`textarea ${errors.issueDescription ? "input-error" : ""}`}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                rows={4}
                placeholder="Describe the issue you're facing..."
              />
              {errors.issueDescription ? <div className="error">{errors.issueDescription}</div> : null}
            </div>
          </div>

          <div className="rrq-srGrid2">
            <Input
              label="Contact Name"
              name="contactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g., John Doe"
              required
              error={errors.contactName}
            />
            <Input
              label="Contact Phone"
              name="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g., 555-123-4567"
              required
              error={errors.contactPhone}
            />
          </div>

          <div className="rrq-srFull">
            <div className="field">
              <label className="label" htmlFor="breakdownAddress">
                Breakdown Address <span className="req">*</span>
              </label>

              <div className="rrq-srAddressRow">
                <input
                  id="breakdownAddress"
                  className={`input ${errors.breakdownAddress ? "input-error" : ""}`}
                  value={breakdownAddress}
                  onChange={(e) => setBreakdownAddress(e.target.value)}
                  placeholder="Enter your location..."
                />
                <Button
                  type="button"
                  variant="secondary-outline"
                  onClick={onFindLocation}
                  className="rrq-srFindBtn"
                  disabled={isGeocoding}
                >
                  {isGeocoding ? "Finding…" : "Find Location"}
                </Button>
              </div>

              {errors.breakdownAddress ? <div className="error">{errors.breakdownAddress}</div> : null}
            </div>
          </div>

          <div className="rrq-srGrid2">
            <Input
              label="Latitude"
              name="lat"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Auto-filled"
            />
            <Input
              label="Longitude"
              name="lon"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="Auto-filled"
            />
          </div>

          {showMap && canShowMapFromCoords ? (
            <div
              className="rrq-srFull"
              onWheel={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <LocationMap lat={parsedLat} lon={parsedLon} address={breakdownAddress} height={320} />
            </div>
          ) : null}

          <div className="rrq-srActions">
            <Button type="button" variant="ghost" onClick={clearForm}>
              Clear Form
            </Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </Card>
    </UserShell>
  );
}

import React, { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useUserRequests } from "../hooks/useUserRequests";

/**
 * PUBLIC_INTERFACE
 */
export function SubmitRequestPage() {
  /** Authenticated request submission (mock/persisted to localStorage). */
  const { addRequest } = useUserRequests();

  const [vehicle, setVehicle] = useState({ make: "", model: "" });
  const [problemDescription, setProblemDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [status, setStatus] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({});

  const validate = useMemo(() => {
    const next = {};
    if (!vehicle.make.trim()) next.make = "Required.";
    if (!vehicle.model.trim()) next.model = "Required.";
    if (!problemDescription.trim()) next.problemDescription = "Required.";
    if (!location.trim()) next.location = "Required.";
    if (!contactPhone.trim()) next.contactPhone = "Required.";
    return next;
  }, [vehicle.make, vehicle.model, problemDescription, location, contactPhone]);

  const onSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    setErrors(validate);
    const hasErrors = Object.keys(validate).length > 0;
    if (hasErrors) {
      setStatus({ type: "error", message: "Please fix the highlighted fields." });
      return;
    }

    addRequest({
      vehicle,
      problemDescription,
      location,
      contactPhone,
    });

    setStatus({ type: "success", message: "Request submitted successfully (mock). You can view it in My Requests." });

    // Clear form
    setVehicle({ make: "", model: "" });
    setProblemDescription("");
    setLocation("");
    setContactPhone("");
    setErrors({});
  };

  return (
    <div className="container">
      <div className="hero">
        <h1 className="h1">Submit Request</h1>
        <p className="lead">Tell us what happened and where you are. We’ll keep the flow simple for the MVP.</p>
      </div>

      <Card title="Request details" subtitle="No backend call yet — stored locally in your browser.">
        {status.message ? (
          <div className={`alert ${status.type === "success" ? "alert-success" : status.type === "error" ? "alert-error" : "alert-info"}`} style={{ marginBottom: 12 }}>
            {status.message}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="form">
          <div className="grid2">
            <Input
              label="Vehicle make"
              name="make"
              value={vehicle.make}
              onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))}
              required
              error={errors.make}
            />
            <Input
              label="Vehicle model"
              name="model"
              value={vehicle.model}
              onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))}
              required
              error={errors.model}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="problemDescription">
              Problem description <span className="req">*</span>
            </label>
            <textarea
              id="problemDescription"
              className={`textarea ${errors.problemDescription ? "input-error" : ""}`}
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Flat tire, battery issue, engine trouble, warning lights…"
              rows={4}
            />
            {errors.problemDescription ? <div className="error">{errors.problemDescription}</div> : null}
          </div>

          <div className="field">
            <label className="label" htmlFor="location">
              Location (MVP free text) <span className="req">*</span>
            </label>
            <textarea
              id="location"
              className={`textarea ${errors.location ? "input-error" : ""}`}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Area, city, nearby landmark, or any helpful info."
              rows={3}
            />
            {errors.location ? <div className="error">{errors.location}</div> : null}
            <div className="hint">MVP: free text only (no maps/geocoding).</div>
          </div>

          <Input
            label="Contact phone"
            name="contactPhone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
            error={errors.contactPhone}
            placeholder="e.g., +1 555-123-4567"
          />

          <div className="row">
            <Button type="submit">Submit request</Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setVehicle({ make: "", model: "" });
                setProblemDescription("");
                setLocation("");
                setContactPhone("");
                setErrors({});
                setStatus({ type: "info", message: "Form cleared." });
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

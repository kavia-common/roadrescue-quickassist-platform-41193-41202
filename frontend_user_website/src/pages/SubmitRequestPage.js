import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useUserRequests } from "../hooks/useUserRequests";
import { UserShell } from "../components/layout/UserShell";

/**
 * PUBLIC_INTERFACE
 */
export function SubmitRequestPage() {
  /** Authenticated request submission (mock/persisted to localStorage). */
  const navigate = useNavigate();
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
    <UserShell
      title="Submit a breakdown request"
      subtitle="Describe the issue and your location. This MVP stores requests locally in your browser."
    >
      <Card
        title="Request details"
        subtitle="No backend call yet — stored locally in your browser."
        className="rrq-auth-card"
      >
        {status.message ? (
          <div
            className={`alert ${
              status.type === "success" ? "alert-success" : status.type === "error" ? "alert-error" : "alert-info"
            }`}
            style={{ marginBottom: 12 }}
          >
            {status.message}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="rrq-form">
          {/* Section: Vehicle */}
          <div className="rrq-form__section">
            <div className="rrq-form__sectionHead">
              <div className="rrq-form__sectionTitle">Vehicle</div>
            </div>

            <div className="rrq-form__grid2">
              <Input
                label="Make"
                name="make"
                value={vehicle.make}
                onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))}
                required
                error={errors.make}
                placeholder="e.g., Toyota"
              />
              <Input
                label="Model"
                name="model"
                value={vehicle.model}
                onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))}
                required
                error={errors.model}
                placeholder="e.g., Corolla"
              />
            </div>
          </div>

          {/* Section: Problem */}
          <div className="rrq-form__section">
            <div className="rrq-form__sectionHead">
              <div className="rrq-form__sectionTitle">Problem description</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="problemDescription">
                Description <span className="req">*</span>
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
          </div>

          {/* Section: Location */}
          <div className="rrq-form__section">
            <div className="rrq-form__sectionHead">
              <div className="rrq-form__sectionTitle">Location (free text)</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="location">
                Location <span className="req">*</span>
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
          </div>

          {/* Section: Contact */}
          <div className="rrq-form__section">
            <div className="rrq-form__sectionHead">
              <div className="rrq-form__sectionTitle">Contact</div>
            </div>

            <div className="rrq-form__grid2">
              <Input
                label="Phone number"
                name="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                error={errors.contactPhone}
                placeholder="e.g., +1 555-123-4567"
              />

              {/* Spacer to match the 2-column look from the reference */}
              <div className="rrq-form__hintBox" aria-hidden="true">
                <div className="rrq-form__hintBoxTitle">Tip</div>
                <div className="rrq-form__hintBoxText">Include a number you can answer quickly so help can reach you.</div>
              </div>
            </div>
          </div>

          {/* Bottom action bar (matches reference positioning/feel) */}
          <div className="rrq-form__actions">
            <div className="rrq-form__actionsLeft">
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
                Clear form
              </Button>
            </div>

            <div className="rrq-form__actionsRight">
              <Button
                variant="secondary-outline"
                type="button"
                onClick={() => {
                  navigate(-1);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Submit request</Button>
            </div>
          </div>
        </form>
      </Card>
    </UserShell>
  );
}

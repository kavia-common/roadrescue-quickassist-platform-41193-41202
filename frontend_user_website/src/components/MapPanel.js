import React, { useMemo, useState } from "react";

/**
 * Build a Google Maps "search" embed URL.
 * This does not require an API key and works for simple user-entered locations.
 */
function buildGoogleMapsEmbedUrl(query) {
  const q = (query || "").trim();
  if (!q) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}

// PUBLIC_INTERFACE
export function MapPanel({
  title = "Location map",
  locationText = "",
  height = 320,
}) {
  /** Lightweight map panel: uses a Google Maps embed when location text is provided; otherwise shows a placeholder. */
  const [frameError, setFrameError] = useState(false);

  const src = useMemo(() => buildGoogleMapsEmbedUrl(locationText), [locationText]);

  const hasLocation = Boolean(locationText && locationText.trim());
  const canRenderFrame = hasLocation && !frameError && Boolean(src);

  return (
    <section className="map-panel card">
      <div className="card-header">
        <div>
          <h2 className="card-title">{title}</h2>
          <p className="card-subtitle">
            {hasLocation
              ? "Preview based on the entered location."
              : "Add a location to show a map preview."}
          </p>
        </div>
      </div>

      <div className="card-body">
        {canRenderFrame ? (
          <div
            className="map-frame"
            style={{
              height,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "rgba(249, 250, 251, 1)",
            }}
          >
            <iframe
              title="Map"
              src={src}
              width="100%"
              height="100%"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0 }}
              onError={() => setFrameError(true)}
            />
          </div>
        ) : (
          <div
            className="alert"
            style={{
              borderRadius: 12,
              padding: 12,
              border: "1px dashed rgba(37,99,235,0.35)",
              background: "rgba(37,99,235,0.06)",
              color: "var(--text)",
            }}
          >
            {!hasLocation ? (
              <div>
                <strong>No location provided.</strong>
                <div style={{ marginTop: 6, color: "var(--muted)" }}>
                  Enter a location (address, landmark, or “City, State”) to display a map.
                </div>
              </div>
            ) : (
              <div>
                <strong>Map preview unavailable.</strong>
                <div style={{ marginTop: 6, color: "var(--muted)" }}>
                  We couldn’t load the embedded map for this location. You can still submit the
                  request—location text will be saved.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

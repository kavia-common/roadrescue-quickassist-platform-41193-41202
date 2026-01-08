import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "./map.css";

/**
 * Ensure Leaflet default marker icons work in bundlers when using CDN CSS.
 * Leaflet's CSS references marker images relatively; in CRA this can break.
 * We point to the unpkg-hosted images so markers always render.
 */
function ensureLeafletDefaultIcons() {
  // Guard in case this is executed multiple times.
  if (L.Icon.Default?.prototype?._kaviaIconFixApplied) return;

  // eslint-disable-next-line no-underscore-dangle
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  // eslint-disable-next-line no-underscore-dangle
  L.Icon.Default.prototype._kaviaIconFixApplied = true;
}

const CHENNAI = { lat: 13.0827, lng: 80.2707 };

// PUBLIC_INTERFACE
export default function MapView({ lat, lng, zoom = 13, className = "" }) {
  /** Reusable OpenStreetMap (Leaflet) map centered on Chennai by default; shows a single marker and updates with lat/lng props. */
  const containerId = useMemo(() => `rrqa-map-${Math.random().toString(16).slice(2)}`, []);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Local UI state (in-map): toggle "documentation/help overlay" vs live map view.
  const [showDocs, setShowDocs] = useState(false);

  const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : CHENNAI.lat;
  const safeLng = Number.isFinite(Number(lng)) ? Number(lng) : CHENNAI.lng;

  useEffect(() => {
    ensureLeafletDefaultIcons();

    // Create map once.
    if (!mapRef.current) {
      const map = L.map(containerId, {
        center: [safeLat, safeLng],
        zoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const marker = L.marker([safeLat, safeLng]).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;
    }

    // Cleanup on unmount.
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // containerId must be stable; safeLat/safeLng/zoom intentionally excluded here
    // to avoid recreating the map on each prop update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  useEffect(() => {
    // Update view + marker whenever props change.
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const next = [safeLat, safeLng];
    marker.setLatLng(next);
    map.setView(next, zoom, { animate: true });
  }, [safeLat, safeLng, zoom]);

  useEffect(() => {
    // When returning from docs overlay, Leaflet sometimes needs an invalidateSize()
    // because the map container might have been visually covered.
    if (!showDocs) {
      const map = mapRef.current;
      if (map) {
        // Defer to next frame so layout is final.
        window.requestAnimationFrame(() => {
          try {
            map.invalidateSize();
          } catch {
            // no-op
          }
        });
      }
    }
  }, [showDocs]);

  const openDocs = () => setShowDocs(true);
  const closeDocs = () => setShowDocs(false);

  return (
    <div className={`rrqa-map-card ${className}`}>
      <div className="rrqa-map-header">
        <div>
          <div className="rrqa-map-title">Breakdown location</div>
          <div className="rrqa-map-subtitle">
            Map preview (OpenStreetMap). Coordinates:{" "}
            <span className="rrqa-map-mono">
              {safeLat.toFixed(5)}, {safeLng.toFixed(5)}
            </span>
          </div>
        </div>

        <div className="rrqa-map-actions">
          <button type="button" className="rrqa-map-help-btn" onClick={openDocs} aria-label="Open map help and documentation">
            Help
          </button>
        </div>
      </div>

      <div className="rrqa-map-frame" role="region" aria-label="Breakdown location map preview">
        <div className="rrqa-map-stage">
          <div
            id={containerId}
            className={`rrqa-map-canvas ${showDocs ? "rrqa-map-hidden" : ""}`}
            aria-hidden={showDocs ? "true" : "false"}
          />

          {showDocs ? (
            <div className="rrqa-map-docs" role="dialog" aria-modal="true" aria-label="Map help and documentation">
              <div className="rrqa-map-docs-header">
                <button type="button" className="rrqa-map-back-btn" onClick={closeDocs} aria-label="Back to map">
                  <span aria-hidden="true">←</span>
                  <span className="rrqa-map-back-label">Back</span>
                </button>
                <div className="rrqa-map-docs-title">Map help</div>
              </div>

              <div className="rrqa-map-docs-body">
                <p className="rrqa-map-docs-lead">
                  This is a simple Leaflet (OpenStreetMap) preview used for the MVP. It doesn’t track your real location.
                </p>

                <div className="rrqa-map-docs-section">
                  <div className="rrqa-map-docs-h">Controls</div>
                  <ul className="rrqa-map-docs-list">
                    <li>
                      Use <strong>+</strong> / <strong>−</strong> to zoom.
                    </li>
                    <li>Drag to pan around.</li>
                    <li>The marker indicates the currently selected coordinates.</li>
                  </ul>
                </div>

                <div className="rrqa-map-docs-section">
                  <div className="rrqa-map-docs-h">Notes</div>
                  <ul className="rrqa-map-docs-list">
                    <li>
                      Returning to the map uses in-app state (no page refresh). If tiles look off, try zooming once.
                    </li>
                    <li>
                      Future versions can bind the location to form fields (GPS, address search, etc.).
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

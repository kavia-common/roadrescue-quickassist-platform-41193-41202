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

// Location fallback
const CHENNAI = { lat: 13.0827, lng: 80.2707 };

// Utility: validate latitude/longitude as finite numbers within valid ranges
function sanitizeLatLng(lat, lng) {
  const nlat = Number(lat);
  const nlng = Number(lng);
  if (
    !Number.isFinite(nlat) ||
    !Number.isFinite(nlng) ||
    Math.abs(nlat) > 90 ||
    Math.abs(nlng) > 180
  ) {
    return { lat: CHENNAI.lat, lng: CHENNAI.lng };
  }
  return { lat: nlat, lng: nlng };
}

// PUBLIC_INTERFACE
export default function MapView({ lat, lng, address = "", zoom = 13, className = "" }) {
  /**
   * Hardened OpenStreetMap (Leaflet) map for breakdown location.
   * - Defers map init until Leaflet is loaded and canvas node is in the DOM.
   * - Ensures unique containerId per mount.
   * - Protects against invalid lat/lng to avoid re-init loops.
   * - Cleans up all Leaflet instances and DOM nodes on unmount/prop change.
   */
  const containerId = useMemo(
    () => `rrqa-map-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
    []
  );
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Local UI state (in-map): toggle "documentation/help overlay" vs live map view.
  const [showDocs, setShowDocs] = useState(false);

  // Defensive: only allow numeric lat/lng in valid ranges (default Chennai)
  const { lat: safeLat, lng: safeLng } = sanitizeLatLng(lat, lng);

  // Track if map init got an error (e.g., due to double init, missing node, or lost Leaflet)
  const [initError, setInitError] = useState(null);

  // Defensive: poll for Leaflet global and DOM readiness before instantiating map
  useEffect(() => {
    let destroyed = false;

    // Wait for #containerId node to exist in the DOM
    function waitForCanvasNode(cb, maxWaitMs = 5000) {
      const start = Date.now();
      function check() {
        if (destroyed) return;
        const el = document.getElementById(containerId);
        if (el) return cb(el);
        if (Date.now() - start > maxWaitMs) return cb(null);
        setTimeout(check, 8);
      }
      check();
    }

    // Robust map creator with multiple error guards.
    function initializeMap() {
      // Already created or destroyed in meantime?
      if (mapRef.current || destroyed) return;
      const el = document.getElementById(containerId);
      if (!el) {
        setInitError("Map container not found in DOM.");
        return;
      }
      try {
        // Defensive teardown in case of accidental re-crash (shouldn't occur, but hardening)
        if (el._leaflet_id) {
          // Clean up any lingering Leaflet instance associated with this node
          try {
            const lInstance = L.DomUtil.get(el._leaflet_id);
            if (lInstance?.remove) lInstance.remove();
            // eslint-disable-next-line no-underscore-dangle
            el._leaflet_id = undefined;
          } catch {}
        }

        // Only allow one map per node
        ensureLeafletDefaultIcons();

        const map = L.map(containerId, {
          center: [safeLat, safeLng],
          zoom,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        const marker = L.marker([safeLat, safeLng]).addTo(map);

        mapRef.current = map;
        markerRef.current = marker;
        setInitError(null);
      } catch (e) {
        setInitError(e?.message || "Failed to initialize map.");
      }
    }

    waitForCanvasNode((el) => {
      if (!el) {
        setInitError("Map container not found (timed out).");
        return;
      }
      // Defer to next tick so Leaflet/DOM are ready
      setTimeout(() => {
        if (destroyed) return;
        try {
          initializeMap();
        } catch (e) {
          setInitError(e?.message || "Map initialization error");
        }
      }, 0);
    });

    // Cleanup on unmount.
    return () => {
      destroyed = true;
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch {}
        markerRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }
      // Defensive: clean up canvas leaflet id
      const el = document.getElementById(containerId);
      if (el && el._leaflet_id) {
        try {
          // eslint-disable-next-line no-underscore-dangle
          el._leaflet_id = undefined;
        } catch {}
      }
    };
    // containerId must be stable; safeLat/safeLng/zoom intentionally excluded
    // to avoid recreating the map on each prop update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  // Safe lat/lng prop & zoom update. Only update if instance is alive and props valid.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    // If incoming update is wildly invalid, don't attempt to move map (could crash).
    if (
      !Number.isFinite(safeLat) ||
      !Number.isFinite(safeLng) ||
      Math.abs(safeLat) > 90 ||
      Math.abs(safeLng) > 180
    ) {
      return;
    }
    const next = [safeLat, safeLng];
    try {
      marker.setLatLng(next);
      map.setView(next, zoom, { animate: true });
    } catch {
      // Defensive: ignore marker/map pan errors
    }
  }, [safeLat, safeLng, zoom]);

  // When returning from docs overlay, sometimes needs invalidateSize()
  useEffect(() => {
    if (!showDocs) {
      const map = mapRef.current;
      if (map) {
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
            Map preview (OpenStreetMap).
            {address ? (
              <>
                {" "}
                Address: <span className="rrqa-map-mono">{address}</span> •
              </>
            ) : null}{" "}
            Coordinates:{" "}
            <span className="rrqa-map-mono">
              {safeLat.toFixed(5)}, {safeLng.toFixed(5)}
            </span>
            {initError && (
              <span
                style={{
                  color: "var(--error)",
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                [Map error: {initError}]
              </span>
            )}
          </div>
        </div>

        <div className="rrqa-map-actions">
          <button
            type="button"
            className="rrqa-map-help-btn"
            onClick={openDocs}
            aria-label="Open map help and documentation"
          >
            Help
          </button>
        </div>
      </div>

      <div
        className="rrqa-map-frame"
        role="region"
        aria-label="Breakdown location map preview"
      >
        <div className="rrqa-map-stage">
          <div
            id={containerId}
            className={`rrqa-map-canvas ${showDocs ? "rrqa-map-hidden" : ""}`}
            aria-hidden={showDocs ? "true" : "false"}
          />

          {showDocs ? (
            <div
              className="rrqa-map-docs"
              role="dialog"
              aria-modal="true"
              aria-label="Map help and documentation"
            >
              <div className="rrqa-map-docs-header">
                <button
                  type="button"
                  className="rrqa-map-back-btn"
                  onClick={closeDocs}
                  aria-label="Back to map"
                >
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

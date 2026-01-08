import React, { useEffect, useMemo, useRef } from "react";
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

  return (
    <div className={`rrqa-map-card ${className}`}>
      <div className="rrqa-map-header">
        <div>
          <div className="rrqa-map-title">Breakdown location</div>
          <div className="rrqa-map-subtitle">
            Map preview (OpenStreetMap). Coordinates: <span className="rrqa-map-mono">{safeLat.toFixed(5)}, {safeLng.toFixed(5)}</span>
          </div>
        </div>
      </div>

      <div className="rrqa-map-frame" role="region" aria-label="Breakdown location map preview">
        <div id={containerId} className="rrqa-map-canvas" />
      </div>
    </div>
  );
}

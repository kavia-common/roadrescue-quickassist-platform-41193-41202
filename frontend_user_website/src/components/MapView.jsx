import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Leaflet is loaded via CDN (public/index.html), so it is accessed via window.L.
 * This component intentionally does not import "leaflet" from npm.
 */

// Chennai default center (per requirement)
const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 };
const DEFAULT_ZOOM = 12;

function clampLat(lat) {
  if (typeof lat !== "number" || Number.isNaN(lat)) return null;
  return Math.max(-90, Math.min(90, lat));
}

function clampLng(lng) {
  if (typeof lng !== "number" || Number.isNaN(lng)) return null;
  // Wrap to [-180, 180] to avoid Leaflet warnings
  let x = lng;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

// PUBLIC_INTERFACE
export function MapView({
  center,
  marker,
  zoom = DEFAULT_ZOOM,
  height = 260,
  className = "",
  showMarker = true,
  ariaLabel = "Map",
}) {
  /**
   * Reusable Leaflet MapView that uses free OpenStreetMap tiles.
   *
   * Props:
   * - center: {lat, lng} | undefined => map center (defaults to Chennai)
   * - marker: {lat, lng} | undefined => marker position (if showMarker)
   * - zoom: number
   * - height: number (px)
   */
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [leafletReady, setLeafletReady] = useState(false);

  const safeCenter = useMemo(() => {
    const lat = clampLat(center?.lat);
    const lng = clampLng(center?.lng);
    if (lat == null || lng == null) return CHENNAI_CENTER;
    return { lat, lng };
  }, [center?.lat, center?.lng]);

  const safeMarker = useMemo(() => {
    const lat = clampLat(marker?.lat);
    const lng = clampLng(marker?.lng);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [marker?.lat, marker?.lng]);

  // Wait briefly for CDN script to be present.
  useEffect(() => {
    let tries = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const L = window.L;
      if (L?.map && L?.tileLayer) {
        setLeafletReady(true);
        return;
      }
      tries += 1;
      if (tries >= 40) return; // ~4s total
      window.setTimeout(tick, 100);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize map once.
  useEffect(() => {
    if (!leafletReady) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const L = window.L;

    // Create map
    const map = L.map(containerRef.current, {
      center: [safeCenter.lat, safeCenter.lng],
      zoom,
      zoomControl: true,
    });

    // Free OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Marker (optional)
    if (showMarker && safeMarker) {
      markerRef.current = L.marker([safeMarker.lat, safeMarker.lng]).addTo(map);
    }

    // Handle container resize (important for hidden/collapsed containers)
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      try {
        map.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady]);

  // Update center/zoom on changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([safeCenter.lat, safeCenter.lng], zoom, { animate: false });
  }, [safeCenter.lat, safeCenter.lng, zoom]);

  // Update marker on changes.
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !leafletReady) return;

    // Remove marker if disabled or no marker.
    if (!showMarker || !safeMarker) {
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch {
          // ignore
        }
        markerRef.current = null;
      }
      return;
    }

    // Create or move marker.
    if (!markerRef.current) {
      markerRef.current = L.marker([safeMarker.lat, safeMarker.lng]).addTo(map);
    } else {
      markerRef.current.setLatLng([safeMarker.lat, safeMarker.lng]);
    }
  }, [leafletReady, safeMarker?.lat, safeMarker?.lng, showMarker]);

  return (
    <div className={`map-card ${className}`}>
      <div className="map-card__header">
        <div className="map-card__title">Location</div>
        <div className="map-card__subtitle">
          {safeMarker ? (
            <span>
              Lat: <strong>{safeMarker.lat.toFixed(5)}</strong> • Lng: <strong>{safeMarker.lng.toFixed(5)}</strong>
            </span>
          ) : (
            <span>Default center: Chennai</span>
          )}
        </div>
      </div>

      <div className="map-frame" style={{ height }} aria-label={ariaLabel}>
        {!leafletReady ? (
          <div className="map-fallback">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Loading map…</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              If this persists, ensure Leaflet CDN is reachable.
            </div>
          </div>
        ) : null}

        <div
          ref={containerRef}
          className="map-container"
          style={{
            height: "100%",
            width: "100%",
            opacity: leafletReady ? 1 : 0, // avoid flashing unstyled tile container
            transition: "opacity 160ms ease",
          }}
        />
      </div>
    </div>
  );
}

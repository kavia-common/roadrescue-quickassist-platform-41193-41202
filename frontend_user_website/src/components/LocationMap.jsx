import React, { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/**
 * Fix Leaflet marker icon paths when bundling with CRA/webpack.
 * Without this, the map may load but the marker can silently fail to appear.
 */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CHENNAI_CENTER = { lat: 13.0827, lon: 80.2707 };

function clampLat(lat) {
  if (typeof lat !== "number" || Number.isNaN(lat)) return null;
  return Math.max(-90, Math.min(90, lat));
}

function clampLon(lon) {
  if (typeof lon !== "number" || Number.isNaN(lon)) return null;
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

// PUBLIC_INTERFACE
export function LocationMap({ lat, lon, address = "", height = 300 }) {
  /**
   * Shared map display component.
   *
   * Props:
   * - lat: number | null
   * - lon: number | null
   * - address: string (optional)
   * - height: number (px)
   *
   * Returns null when lat/lon are missing.
   */
  const safe = useMemo(() => {
    const clat = clampLat(lat);
    const clon = clampLon(lon);
    if (clat == null || clon == null) return null;
    return { lat: clat, lon: clon };
  }, [lat, lon]);

  if (!safe) return null;

  return (
    <div className="map-card">
      <div className="map-card__header">
        <div className="map-card__title">Location</div>
        <div className="map-card__subtitle">
          {address ? (
            <span>{address}</span>
          ) : (
            <span>
              Lat: <strong>{safe.lat.toFixed(5)}</strong> • Lon: <strong>{safe.lon.toFixed(5)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="map-frame">
        <MapContainer
          center={[safe.lat, safe.lon] || [CHENNAI_CENTER.lat, CHENNAI_CENTER.lon]}
          zoom={15}
          style={{ height: `${height}px`, width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[safe.lat, safe.lon]}>
            <Popup>Breakdown Location</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}

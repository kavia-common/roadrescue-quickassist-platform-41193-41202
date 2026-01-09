/**
 * Geocoding utilities (User Website).
 *
 * Uses OpenStreetMap Nominatim.
 * Nominatim usage policy requires identification via User-Agent when possible.
 * Browsers cannot reliably set "User-Agent", but we still:
 * - send Accept + Accept-Language headers,
 * - keep the request limited (limit=1),
 * - call only on explicit user action.
 */

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

/**
 * @typedef {Object} GeocodeSuccess
 * @property {true} ok
 * @property {number} lat
 * @property {number} lon
 * @property {string} displayName
 *
 * @typedef {Object} GeocodeFailure
 * @property {false} ok
 * @property {string} message
 *
 * @typedef {GeocodeSuccess|GeocodeFailure} GeocodeResult
 */

// PUBLIC_INTERFACE
export async function geocodeAddressNominatim(address, { signal } = {}) {
  /**
   * Geocode an address string using Nominatim.
   *
   * Required query params per spec:
   * - format=json
   * - addressdetails=1
   * - limit=1
   *
   * Returns a GeocodeResult. Does NOT throw for "no results"; only throws for
   * network/HTTP errors or invalid JSON.
   */
  const q = String(address ?? "").trim();
  if (!q) return { ok: false, message: "Address is required." };

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      // Best-effort identification/localization; allowed by browsers.
      "Accept-Language": navigator.language || "en",
    },
    signal,
  });

  if (!resp.ok) {
    // HTTP errors should be surfaced clearly.
    throw new Error(`Geocoding failed (HTTP ${resp.status}). Please try again.`);
  }

  const data = await resp.json();
  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, message: "No matches found. Please refine the address (add city/landmark)." };
  }

  const top = data[0];
  const lat = Number(top?.lat);
  const lon = Number(top?.lon);
  const displayName = String(top?.display_name || q);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, message: "Found a match, but received invalid coordinates." };
  }

  return { ok: true, lat, lon, displayName };
}

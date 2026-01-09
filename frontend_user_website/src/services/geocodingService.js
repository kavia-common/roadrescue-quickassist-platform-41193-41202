/**
 * Nominatim geocoding service (OpenStreetMap).
 *
 * This module uses the public Nominatim API endpoint. The public endpoint has
 * usage policies (rate limits, required User-Agent/Referer expectations, etc.).
 * For production, consider proxying through your backend to control headers,
 * caching, retries, and to stay compliant with Nominatim usage policy.
 */

/**
 * @typedef {Object} GeocodeResult
 * @property {number} lat
 * @property {number} lng
 * @property {string} displayName
 */

function toFiniteNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampLat(lat) {
  if (lat == null) return null;
  return Math.max(-90, Math.min(90, lat));
}

function clampLng(lng) {
  if (lng == null) return null;
  // Wrap to [-180, 180]
  let x = lng;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

async function safeReadJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export async function geocodeAddress(address, { countryCodes = "in", limit = 1 } = {}) {
  /**
   * Geocode a free-form address string using Nominatim.
   *
   * @param {string} address - User-entered address/landmark string.
   * @param {Object} [options]
   * @param {string} [options.countryCodes="in"] - Optional country code filter (comma-separated), e.g. "in".
   * @param {number} [options.limit=1] - Number of results to return (we pick the first result).
   * @returns {Promise<GeocodeResult>} - {lat, lng, displayName}
   *
   * @throws {Error} When address is empty, network fails, or no results are found.
   */
  const q = String(address ?? "").trim();
  if (!q) {
    throw new Error("Please enter an address/landmark to find the location.");
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));

  // Helpful for narrowing to India in this app’s context (Chennai default).
  if (countryCodes) {
    url.searchParams.set("countrycodes", countryCodes);
  }

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      // Browsers disallow setting User-Agent; Accept is fine.
      "Accept": "application/json",
    },
  });

  if (!resp.ok) {
    const data = await safeReadJson(resp);
    const msg = data?.error || `Geocoding failed (HTTP ${resp.status}).`;
    throw new Error(msg);
  }

  const data = await safeReadJson(resp);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No matching location found. Try a more specific address or nearby landmark.");
  }

  const first = data[0];
  const lat = clampLat(toFiniteNumber(first?.lat));
  const lng = clampLng(toFiniteNumber(first?.lon));
  const displayName = String(first?.display_name || "").trim();

  if (lat == null || lng == null) {
    throw new Error("Geocoding returned an invalid coordinate. Please try a different query.");
  }

  return {
    lat,
    lng,
    displayName: displayName || q,
  };
}

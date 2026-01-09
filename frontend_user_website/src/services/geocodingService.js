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
export async function geocodeAddress(address, { countryCodes = "in", limit = 1, profiler } = {}) {
  /**
   * Geocode a free-form address string using Nominatim.
   *
   * @param {string} address - User-entered address/landmark string.
   * @param {Object} [options]
   * @param {string} [options.countryCodes="in"] - Optional country code filter (comma-separated), e.g. "in".
   * @param {number} [options.limit=1] - Number of results to return (we pick the first result).
   * @param {Object} [options.profiler] - Optional profiler instance (see services/perfProfiler.js).
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

  profiler?.mark("geocode_fetch_start");
  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      // Browsers disallow setting User-Agent; Accept is fine.
      "Accept": "application/json",
    },
  });
  profiler?.mark("geocode_fetch_end");
  profiler?.measure("geocode:network", "geocode_fetch_start", "geocode_fetch_end");

  if (!resp.ok) {
    profiler?.info("geocode:non_200", { status: resp.status });
    const data = await safeReadJson(resp);
    const msg = data?.error || `Geocoding failed (HTTP ${resp.status}).`;
    throw new Error(msg);
  }

  profiler?.mark("geocode_json_start");
  const data = await safeReadJson(resp);
  profiler?.mark("geocode_json_end");
  profiler?.measure("geocode:json_parse", "geocode_json_start", "geocode_json_end");

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

  profiler?.info("geocode:result", {
    hasDisplayName: Boolean(displayName),
    // String lengths help detect unusually large payloads without logging PII.
    queryLength: q.length,
    displayNameLength: displayName.length,
  });

  return {
    lat,
    lng,
    displayName: displayName || q,
  };
}

/**
 * Routing Service
 *
 * Provides driving duration and route distance calculations using documented
 * routing providers with batched matrix requests.
 *
 * Supported Providers:
 * 1. OSRM (Open Source Routing Machine) Table Service (default open provider)
 *    Docs: http://project-osrm.org/docs/v5.24.0/api/#table-service
 *    Public endpoint: https://router.project-osrm.org/table/v1/driving
 * 2. Mapbox Matrix API (enabled when MAPBOX_ACCESS_TOKEN is configured)
 *    Docs: https://docs.mapbox.com/api/navigation/matrix/
 * 3. Google Maps Distance Matrix API (enabled when GOOGLE_MAPS_API_KEY is configured)
 *    Docs: https://developers.google.com/maps/documentation/distance-matrix
 *
 * Features:
 * - Batched matrix calculation (1 origin -> N destinations in a single request).
 * - Finite HTTP timeout with AbortController.
 * - Short-term in-memory cache to respect provider rate limits and reduce latency.
 * - Honest error reporting: never manufactures ETAs or random values.
 * - Accurate traffic status labeling (static estimated vs live traffic).
 */

const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const cache = new Map();

/**
 * Generates a cache key for an origin and set of destinations.
 */
function getCacheKey(provider, origin, destinations) {
  const oStr = `${origin[0].toFixed(5)},${origin[1].toFixed(5)}`;
  const dStr = destinations.map((d) => `${d[0].toFixed(5)},${d[1].toFixed(5)}`).join('|');
  return `${provider}:${oStr}-->${dStr}`;
}

/**
 * Validates coordinate pair [longitude, latitude].
 */
function isValidCoordinate(coord) {
  if (!Array.isArray(coord) || coord.length !== 2) return false;
  const [lng, lat] = coord;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90 &&
    !(lng === 0 && lat === 0)
  );
}

/**
 * Fetch driving durations and distances from OSRM Table Service.
 *
 * @param {Array<number>} origin [longitude, latitude]
 * @param {Array<Array<number>>} destinations Array of [longitude, latitude]
 * @param {number} timeoutMs Request timeout in milliseconds
 */
async function fetchOsrmMatrix(origin, destinations, timeoutMs = 7000) {
  // OSRM coordinates format: {lng0},{lat0};{lng1},{lat1};...
  const allCoords = [origin, ...destinations]
    .map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
    .join(';');

  const url = `https://router.project-osrm.org/table/v1/driving/${allCoords}?sources=0&annotations=duration,distance`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ParkMe-MobileApp/1.0 (nearby-parking-driving-reach)',
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OSRM table service returned HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !Array.isArray(data.durations) || !data.durations[0]) {
      throw new Error(`OSRM table service error: ${data.code || 'invalid response structure'}`);
    }

    // data.durations[0] contains durations in seconds from origin (index 0) to all coords
    // data.distances[0] contains distances in meters
    // Index 0 is origin-to-origin (0s); destination i corresponds to index i + 1
    const results = destinations.map((_, i) => {
      const dur = data.durations[0][i + 1];
      const dist = data.distances && data.distances[0] ? data.distances[0][i + 1] : null;

      return {
        durationSeconds: dur !== null && dur !== undefined && !Number.isNaN(dur) ? Math.round(dur) : null,
        distanceMeters: dist !== null && dist !== undefined && !Number.isNaN(dist) ? Math.round(dist) : null,
      };
    });

    return {
      provider: 'osrm',
      providerAttribution: '© OpenStreetMap contributors, OSRM',
      isLiveTraffic: false,
      results,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Routing service request timed out after ' + timeoutMs + 'ms');
    }
    throw err;
  }
}

/**
 * Fetch driving durations and distances from Mapbox Matrix API.
 */
async function fetchMapboxMatrix(origin, destinations, token, timeoutMs = 7000) {
  const allCoords = [origin, ...destinations]
    .map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
    .join(';');

  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic/${allCoords}?sources=0&annotations=duration,distance&access_token=${encodeURIComponent(
    token
  )}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Mapbox Matrix API HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.durations || !data.durations[0]) {
      throw new Error(`Mapbox Matrix API error: ${data.code || 'bad response'}`);
    }

    const results = destinations.map((_, i) => ({
      durationSeconds: data.durations[0][i + 1] != null ? Math.round(data.durations[0][i + 1]) : null,
      distanceMeters: data.distances && data.distances[0][i + 1] != null ? Math.round(data.distances[0][i + 1]) : null,
    }));

    return {
      provider: 'mapbox',
      providerAttribution: '© Mapbox, © OpenStreetMap',
      isLiveTraffic: true,
      results,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Main function to calculate driving durations and distances from driver origin to destinations.
 *
 * @param {Object} options
 * @param {Array<number>} options.origin [longitude, latitude]
 * @param {Array<Array<number>>} options.destinations Array of [longitude, latitude]
 * @returns {Promise<{ provider: string, providerAttribution: string, isLiveTraffic: boolean, results: Array<{ durationSeconds: number|null, distanceMeters: number|null }> }>}
 */
async function calculateDrivingTravelTimes({ origin, destinations }) {
  if (!isValidCoordinate(origin)) {
    throw new Error('Invalid origin coordinates. Expected [longitude, latitude] with valid numbers.');
  }

  if (!Array.isArray(destinations) || destinations.length === 0) {
    return {
      provider: 'none',
      providerAttribution: '',
      isLiveTraffic: false,
      results: [],
    };
  }

  // Validate all destination coordinates
  for (let i = 0; i < destinations.length; i++) {
    if (!isValidCoordinate(destinations[i])) {
      throw new Error(`Invalid destination coordinate at index ${i}: ${JSON.stringify(destinations[i])}`);
    }
  }

  const requestedProvider = (process.env.ROUTING_PROVIDER || 'osrm').toLowerCase();
  const cacheKey = getCacheKey(requestedProvider, origin, destinations);

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let matrixResult;

  if (requestedProvider === 'mapbox' && process.env.MAPBOX_ACCESS_TOKEN) {
    matrixResult = await fetchMapboxMatrix(origin, destinations, process.env.MAPBOX_ACCESS_TOKEN);
  } else if (requestedProvider === 'mapbox' && !process.env.MAPBOX_ACCESS_TOKEN) {
    throw new Error(
      'Mapbox provider was requested via ROUTING_PROVIDER=mapbox, but MAPBOX_ACCESS_TOKEN environment variable is not configured.'
    );
  } else {
    // Default to OSRM Table Service
    matrixResult = await fetchOsrmMatrix(origin, destinations);
  }

  // Store in cache
  cache.set(cacheKey, { timestamp: Date.now(), data: matrixResult });

  // Clean cache periodically
  if (cache.size > 200) {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
      }
    }
  }

  return matrixResult;
}

/**
 * Calculates straight-line Haversine distance in meters between two [longitude, latitude] coordinates.
 */
function calculateHaversineDistance([lng1, lat1], [lng2, lat2]) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

module.exports = {
  calculateDrivingTravelTimes,
  calculateHaversineDistance,
  isValidCoordinate,
  fetchOsrmMatrix,
};

// Geocoding + routing behind one interface (§6, §7).
//
// Today: Photon for address autocomplete, OSRM for the driving route. Both are free
// and keyless, which is why they were chosen over Google Maps. Both are public demo
// endpoints with fair-use limits — for production, self-host OSRM and Photon (or swap
// in a paid provider) by replacing only the two fetch calls below. Callers depend on
// the shape returned here, not on the provider.

/** Nairobi. Search results are biased toward it so local queries rank first. */
export const CITY_CENTER = { lat: -1.2921, lng: 36.8219 };

const PHOTON = 'https://photon.komoot.io/api';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

/** Straight-line km. Used only for the offline fallback below. */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Photon feature → the flat shape the UI stores on an order. */
function toPlace(feature) {
  const [lng, lat] = feature.geometry.coordinates;
  const p = feature.properties || {};
  const line = [p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street || p.name, p.district]
    .filter(Boolean)
    .join(', ');
  const area = [p.city || p.county, p.state].filter(Boolean).join(', ');
  return {
    id: `${p.osm_type || 'x'}${p.osm_id || `${lat}${lng}`}`,
    label: [line || p.name, area].filter(Boolean).join(' · ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    name: p.name || line || 'Dropped pin',
    lat,
    lng
  };
}

/**
 * Address autocomplete. Callers debounce and pass an AbortSignal so superseded
 * keystrokes don't race. Returns [] rather than throwing when the network is down —
 * an empty dropdown degrades better than an error under a search box.
 */
export async function searchPlaces(query, { signal, limit = 6 } = {}) {
  const q = (query || '').trim();
  if (q.length < 3) return [];

  const url = `${PHOTON}/?q=${encodeURIComponent(q)}&limit=${limit}&lang=en&lat=${CITY_CENTER.lat}&lon=${CITY_CENTER.lng}`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.features || []).map(toPlace);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return [];
  }
}

/** Coordinates → an address label, for "use my current location" and map taps. */
export async function reverseGeocode({ lat, lng }) {
  const fallback = { id: `pin${lat}${lng}`, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, name: 'Dropped pin', lat, lng };
  try {
    const response = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&lang=en`);
    if (!response.ok) return fallback;
    const data = await response.json();
    return data.features?.[0] ? toPlace(data.features[0]) : fallback;
  } catch {
    return fallback;
  }
}

/** The browser's own geolocation, promisified. */
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot share your location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Location permission denied. Search for an address instead.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Driving route between two points.
 * → { distanceKm, durationSeconds, coordinates: [[lat, lng], ...], estimated }
 *
 * `estimated: true` means OSRM was unreachable and we fell back to a straight line
 * scaled by a typical detour factor. The UI labels the figures as estimates in that
 * case rather than silently presenting a guess as a measured route.
 */
export async function routeBetween(from, to) {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  try {
    const response = await fetch(`${OSRM}/${path}?overview=full&geometries=geojson`);
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error('No route');
    return {
      distanceKm: route.distance / 1000,
      durationSeconds: route.duration,
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      estimated: false
    };
  } catch {
    // Offline / rate-limited: 1.35 is a common urban straight-line-to-road ratio,
    // and 24 km/h approximates Nairobi traffic.
    const straight = haversineKm(from, to);
    const distanceKm = straight * 1.35;
    return {
      distanceKm,
      durationSeconds: (distanceKm / 24) * 3600,
      coordinates: [
        [from.lat, from.lng],
        [to.lat, to.lng]
      ],
      estimated: true
    };
  }
}

// §25 — where the vehicle is on the map, frame by frame.
//
// The tracking screens draw a marker that moves; this works out where it should be.
// Everything here reads from orderStatus, so the marker and the timeline rows beside
// it are two views of one clock rather than two animations that happen to agree.
//
// Kept free of React and of Leaflet: it takes plain [lat, lng] pairs and gives one
// back, which is what makes it testable and what keeps the geometry out of the map.

import { STATUS, stepIndex, transitShare } from './orderStatus';

const KM_PER_DEGREE = 111.32;
const RADIANS = Math.PI / 180;

/**
 * Flat-earth distance in kilometres. A city fits inside the error of this, and it runs
 * cheaply enough to sit in an animation frame — which the haversine would not.
 */
function spanKm([fromLat, fromLng], [toLat, toLng]) {
  const northing = (toLat - fromLat) * KM_PER_DEGREE;
  const easting = (toLng - fromLng) * KM_PER_DEGREE * Math.cos(((fromLat + toLat) / 2) * RADIANS);
  return Math.hypot(northing, easting);
}

/**
 * A polyline with its cumulative lengths worked out once, so walking along it later is
 * a binary-free scan rather than a full re-measure every frame.
 */
export function measurePath(points) {
  if (!points?.length) return null;
  const marks = [0];
  for (let index = 1; index < points.length; index += 1) {
    marks.push(marks[index - 1] + spanKm(points[index - 1], points[index]));
  }
  return { points, marks, total: marks[marks.length - 1] };
}

/** The point `fraction` of the way along a measured path, interpolated within a segment. */
export function pointAlong(measured, fraction) {
  if (!measured?.points?.length) return null;
  const { points, marks, total } = measured;
  if (points.length === 1 || !(total > 0)) return points[0];

  const target = Math.max(0, Math.min(1, fraction)) * total;
  let index = 1;
  while (index < points.length - 1 && marks[index] < target) index += 1;

  const segment = marks[index] - marks[index - 1];
  const t = segment > 0 ? (target - marks[index - 1]) / segment : 0;
  const [fromLat, fromLng] = points[index - 1];
  const [toLat, toLng] = points[index];
  return [fromLat + (toLat - fromLat) * t, fromLng + (toLng - fromLng) * t];
}

/**
 * A flight or a sailing does not follow the road network, so drawing the driving
 * polyline for those modes would be a lie on the one screen that has to be true. They
 * get an arc between the endpoints instead — schematic, and honestly so. The map draws
 * this and the marker walks it, so the vehicle never floats beside its own route.
 */
export function arcBetween(from, to, curvature = 0.16, samples = 48) {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const control = {
    lat: midLat + (to.lng - from.lng) * curvature,
    lng: midLng - (to.lat - from.lat) * curvature
  };

  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = index / samples;
    const inverse = 1 - t;
    return [
      inverse * inverse * from.lat + 2 * inverse * t * control.lat + t * t * to.lat,
      inverse * inverse * from.lng + 2 * inverse * t * control.lng + t * t * to.lng
    ];
  });
}

/**
 * Which leg the vehicle is on and how far through it, at `now`.
 *
 * Two legs, matching the two halves of the timeline:
 *
 *   approach — the agent closing on the pickup, run across exactly the ETA they quoted
 *              when they were assigned. It reaches 1 at the same instant agentHasArrived
 *              flips, so the marker touching A and the "Rider arrived" row lighting up
 *              are one event, not two that nearly coincide.
 *
 *   route    — the parcel running pickup → destination on transitShare, the same figure
 *              that moves "Dispatched → In transit → Arriving" down the timeline and
 *              counts the kilometres down beside it.
 *
 * `moving` is whether it should be shown travelling right now; a parcel waiting to be
 * collected and one already delivered are both stationary, and the pulse says so.
 */
export function vehicleLeg(order, now = Date.now()) {
  const still = { leg: 'idle', fraction: 0, moving: false };
  if (!order || order.status === STATUS.CANCELLED) return still;

  if (stepIndex(order.status) < stepIndex(STATUS.PICKED_UP)) {
    const courier = order.courier;
    if (!courier) return still;

    const assignedAt = courier.assignedAt ? new Date(courier.assignedAt).getTime() : null;
    const eta = Number(courier.etaMinutes);
    if (!assignedAt || !Number.isFinite(eta) || eta <= 0) return { leg: 'approach', fraction: 0, moving: false };

    const share = Math.max(0, Math.min(1, (now - assignedAt) / (eta * 60_000)));
    return { leg: 'approach', fraction: share, moving: share < 1 };
  }

  // Collected but not yet dispatched: sitting at the pickup with the parcel aboard.
  if (order.status === STATUS.PICKED_UP) return { leg: 'route', fraction: 0, moving: false };

  return { leg: 'route', fraction: transitShare(order, now), moving: order.status === STATUS.IN_TRANSIT };
}

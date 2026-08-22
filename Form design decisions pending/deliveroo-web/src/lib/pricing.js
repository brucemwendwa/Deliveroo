// §9 delivery price calculator. Pure and dependency-free so it can be unit tested
// and, later, mirrored server-side without dragging React along.

/** Base rate quoted to the customer, per kilogram. */
export const RATE_PER_KG = 50;
/** Distance component, per kilometre of the driving route (not straight-line). */
export const RATE_PER_KM = 40;
/** Nobody pays less than this, however short the hop. */
export const MINIMUM_FARE = 200;
/** Totals are rounded up to a whole multiple of this, so prices read cleanly. */
export const ROUNDING = 10;

const roundUp = (value, step) => Math.ceil(value / step) * step;

/**
 * Breakdown for a quote. Every field the UI prints is returned, so the price card
 * never re-derives arithmetic and can't drift from the total.
 *
 *   quote({ weightKg: 3, distanceKm: 12.4 })
 *   → { weightCost: 150, distanceCost: 496, subtotal: 646, total: 650, ... }
 */
export function quote({ weightKg = 0, distanceKm = 0 } = {}) {
  const weight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0;
  const distance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;

  const weightCost = weight * RATE_PER_KG;
  const distanceCost = distance * RATE_PER_KM;
  const subtotal = weightCost + distanceCost;
  const total = Math.max(MINIMUM_FARE, roundUp(subtotal, ROUNDING));

  return {
    weightKg: weight,
    distanceKm: distance,
    weightCost,
    distanceCost,
    subtotal,
    total,
    /** true when the floor kicked in — the UI says so rather than showing odd maths */
    minimumApplied: subtotal > 0 && total === MINIMUM_FARE && roundUp(subtotal, ROUNDING) < MINIMUM_FARE
  };
}

/** "KES 650" — grouped, no decimals, which is how the fare is always shown. */
export const formatKes = (amount) =>
  `KES ${Math.round(Number(amount) || 0).toLocaleString('en-KE')}`;

/** "12.4 km" */
export const formatKm = (km) => `${(Number(km) || 0).toFixed(1)} km`;

/** Seconds from the router → "35 min" / "1 h 12 min". */
export function formatDuration(seconds) {
  const total = Math.max(1, Math.round((Number(seconds) || 0) / 60));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

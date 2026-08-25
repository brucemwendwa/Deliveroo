// §9 delivery price calculator. Pure and dependency-free so it can be unit tested
// and, later, mirrored server-side without dragging React along.
//
// Since §25 the tariff varies by transport mode, and the mode catalogue lives in
// transport.js. This module still owns the money: what an *order* costs, declared
// versus verified weight, and every format the UI prints.

import {
  DEFAULT_MODE,
  DEFAULT_PRIORITY,
  TRANSPORT,
  chargeableWeightKg,
  modeMeta,
  priorityOf,
  quoteTransport,
  transportOf
} from './transport';

const ROAD_TARIFF = modeMeta(TRANSPORT.ROAD).tariff;

/** Base rate quoted to the customer, per kilogram. Road; other modes vary (§25). */
export const RATE_PER_KG = ROAD_TARIFF.perKg;
/** Distance component, per kilometre of the driving route (not straight-line). */
export const RATE_PER_KM = ROAD_TARIFF.perKm;
/** Nobody pays less than this, however short the hop. */
export const MINIMUM_FARE = ROAD_TARIFF.minimum;
/** Totals are rounded up to a whole multiple of this, so prices read cleanly. */
export const ROUNDING = 10;

/**
 * Breakdown for a quote. Every field the UI prints is returned, so the price card
 * never re-derives arithmetic and can't drift from the total.
 *
 *   quote({ weightKg: 3, distanceKm: 12.4 })
 *   → { weightCost: 150, distanceCost: 496, subtotal: 646, total: 650, ... }
 *
 * Defaults to road at standard priority, which is the tariff this app has always
 * charged — so an existing quote, and every order already in storage, is unchanged.
 */
export function quote({ weightKg = 0, distanceKm = 0, mode = DEFAULT_MODE, priority = DEFAULT_PRIORITY, durationSeconds } = {}) {
  return quoteTransport({ mode, priority, weightKg, distanceKm, durationSeconds });
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
  if (hours < 24) return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  // Sea freight runs into days, and "31 h" reads as a mistake where "1 day 7 h" doesn't.
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return `${days} day${days > 1 ? 's' : ''}${restHours ? ` ${restHours} h` : ''}`;
}

/** "2:15 PM" — the arrival clock time, which is what a customer actually plans around. */
export const formatClock = (date) =>
  new Date(date).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true });

/** Now + a duration, as a clock time. */
export const etaClock = (seconds, from = Date.now()) =>
  formatClock(new Date(from + Math.max(0, Number(seconds) || 0) * 1000));

// ---------------------------------------------------------------------------
// Declared vs verified weight.
//
// The weight the customer types at booking is a *declaration* — nothing stops
// them under-stating it to shave the fare. So it only ever buys an estimate.
// The billable weight is whatever an admin actually put on the scale at pickup,
// and until that exists every customer-facing figure is labelled an estimate.
// ---------------------------------------------------------------------------

/** A declared weight this far under the measured one is flagged in the console. */
export const WEIGHT_TOLERANCE_KG = 0.5;
/** …or this far off proportionally, whichever is the larger allowance. */
export const WEIGHT_TOLERANCE_RATIO = 0.2;

/** Highest weight the scale will accept — anything past this is a typo, not a parcel. */
export const MAX_WEIGHT_KG = 1000;

/** true once an admin has weighed the parcel. */
export const isWeightVerified = (parcel) =>
  Number.isFinite(parcel?.verifiedWeightKg) && parcel.verifiedWeightKg > 0;

/** The weight the fare is actually charged on: measured if we have it, declared if not. */
export const billableWeightKg = (parcel) =>
  isWeightVerified(parcel) ? parcel.verifiedWeightKg : parcel?.weightKg || 0;

/**
 * Prices a whole order rather than loose numbers, so callers can't accidentally
 * bill the declared weight of a parcel that has since been weighed. `basis` tells
 * the UI whether to say "estimated" or "final".
 *
 * `transport` is optional: an order without one is a road order at standard
 * priority, which is what every order placed before §25 is.
 */
export function priceOrder({ parcel, route, transport } = {}) {
  const mode = transport?.mode || DEFAULT_MODE;
  const priority = transport?.priority || DEFAULT_PRIORITY;
  // The heavier of what it weighs and the space it takes up (§25).
  const chargeable = chargeableWeightKg(parcel || {}, billableWeightKg(parcel));

  return {
    ...quoteTransport({
      mode,
      priority,
      weightKg: chargeable,
      distanceKm: route?.distanceKm,
      durationSeconds: route?.durationSeconds
    }),
    declaredWeightKg: parcel?.weightKg ?? 0,
    chargeableWeightKg: chargeable,
    basis: isWeightVerified(parcel) ? 'verified' : 'estimated'
  };
}

/** The mode and priority an order actually shipped on. */
export const orderTransport = (order) => ({ mode: transportOf(order), priority: priorityOf(order) });

/**
 * How far the declaration was out, or null if the parcel hasn't been weighed.
 * `flagged` is the console's "look at this one" signal — under-declaration only,
 * since over-declaring costs the customer, not us.
 */
export function weightDiscrepancy(parcel) {
  if (!isWeightVerified(parcel)) return null;
  const declared = Number(parcel.weightKg) || 0;
  const measured = parcel.verifiedWeightKg;
  const deltaKg = measured - declared;
  const allowance = Math.max(WEIGHT_TOLERANCE_KG, declared * WEIGHT_TOLERANCE_RATIO);
  return {
    declaredKg: declared,
    measuredKg: measured,
    deltaKg,
    /** Under-declared by more than the allowance. */
    flagged: deltaKg > allowance
  };
}

/** "+4.2 kg" / "−0.8 kg" — signed, because the direction is the whole point. */
export const formatDelta = (kg) => `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${Math.abs(kg).toFixed(1)} kg`;

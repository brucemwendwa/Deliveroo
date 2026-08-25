// Multi-modal transport (§25). Which vehicles can carry a parcel on a given route,
// what each one costs, and how long each takes.
//
// Pure and dependency-free for the same reason pricing.js is: the eligibility rules
// and the tariff are business logic, not presentation, and the Flask side will have
// to agree with them exactly. pricing.js imports this module — never the other way
// round — so the dependency runs in one direction only.

export const TRANSPORT = {
  ROAD: 'ROAD',
  AIR: 'AIR',
  SHIP: 'SHIP',
  DRONE: 'DRONE'
};

export const DEFAULT_MODE = TRANSPORT.ROAD;

export const PRIORITY = {
  STANDARD: 'STANDARD',
  EXPRESS: 'EXPRESS'
};

export const DEFAULT_PRIORITY = PRIORITY.STANDARD;

/**
 * Priority is a multiplier pair, not a separate tariff: express buys a place at the
 * front of the queue on whichever vehicle was chosen, so it scales that vehicle's
 * own price and time rather than introducing figures of its own.
 */
export const PRIORITY_OPTIONS = [
  {
    id: PRIORITY.STANDARD,
    label: 'Standard',
    note: 'Goes out on the next scheduled run.',
    priceFactor: 1,
    timeFactor: 1
  },
  {
    id: PRIORITY.EXPRESS,
    label: 'Express',
    note: 'Straight out, ahead of the queue.',
    priceFactor: 1.45,
    timeFactor: 0.72
  }
];

export const priorityOption = (id) =>
  PRIORITY_OPTIONS.find((option) => option.id === id) || PRIORITY_OPTIONS[0];

// ---------------------------------------------------------------------------
// The catalogue.
//
// Road keeps the tariff the app has always charged — 40/km, 50/kg, 200 minimum —
// so every existing quote is unchanged. It gains one thing: a line-haul band. A
// city courier rate of 40/km is right for a cross-town hop and absurd over 400 km,
// where the same van is running a scheduled route rather than a dedicated errand,
// so anything past the first 50 km is charged at the line-haul rate instead.
//
// The other three are flat per-km: they are shared-capacity freight, not a vehicle
// hired by the parcel. That is also why sea freight undercuts road over distance
// while taking a day, and why air costs multiples of both.
// ---------------------------------------------------------------------------

export const TRANSPORT_MODES = [
  {
    id: TRANSPORT.ROAD,
    label: 'Road',
    glyph: '🚐',
    icon: 'local_shipping',
    freightLabel: 'Road delivery',
    tagline: 'Affordable & reliable',
    blurb: 'Vans and motorcycles on the road network. Available almost everywhere.',
    tariff: { base: 0, perKm: 40, perKg: 50, minimum: 200, cityKm: 50, lineHaulPerKm: 6 },
    speedKmh: 45,
    handlingSeconds: 15 * 60,
    limits: { maxDistanceKm: 1500, maxWeightKg: 2000 }
  },
  {
    id: TRANSPORT.AIR,
    label: 'Air',
    glyph: '✈️',
    icon: 'flight',
    freightLabel: 'Air freight',
    tagline: 'Fastest option',
    blurb: 'Cargo space on scheduled flights, with road legs at both ends.',
    tariff: { base: 1500, perKm: 11, perKg: 240, minimum: 2000 },
    speedKmh: 700,
    handlingSeconds: 95 * 60,
    limits: { minDistanceKm: 120, maxWeightKg: 250 }
  },
  {
    id: TRANSPORT.SHIP,
    label: 'Ship',
    glyph: '🚢',
    icon: 'directions_boat',
    freightLabel: 'Sea freight',
    tagline: 'Best for large & heavy shipments',
    blurb: 'Container space between ports. Slowest, and by far the cheapest per kilo.',
    tariff: { base: 900, perKm: 4.5, perKg: 28, minimum: 1400 },
    speedKmh: 32,
    handlingSeconds: 10 * 3600,
    limits: { minDistanceKm: 200, requiresPort: true }
  },
  {
    id: TRANSPORT.DRONE,
    label: 'Drone',
    glyph: '🚁',
    icon: 'drone',
    freightLabel: 'Drone delivery',
    tagline: 'Ultra-fast local delivery',
    blurb: 'Small, light, short hops — straight over the traffic.',
    tariff: { base: 350, perKm: 60, perKg: 110, minimum: 700 },
    speedKmh: 48,
    handlingSeconds: 8 * 60,
    limits: { maxDistanceKm: 30, maxWeightKg: 5, maxLongestSideCm: 45 }
  }
];

export const modeMeta = (mode) =>
  TRANSPORT_MODES.find((entry) => entry.id === mode) || TRANSPORT_MODES[0];

export const modeLabel = (mode) => modeMeta(mode).label;

/** Mode of an order, defaulting to road — orders placed before §25 have no mode. */
export const transportOf = (order) => order?.transport?.mode || DEFAULT_MODE;
export const priorityOf = (order) => order?.transport?.priority || DEFAULT_PRIORITY;

// ---------------------------------------------------------------------------
// Fleet availability (§26). The admin console can take a mode offline; booking then
// stops offering it. Prototype-level: this is partner capacity we book into, not a
// fleet Deliveroo owns.
// ---------------------------------------------------------------------------

export const FLEET_STATUS = {
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE'
};

export const FLEET_STATUS_LABEL = {
  [FLEET_STATUS.AVAILABLE]: 'Available',
  [FLEET_STATUS.BUSY]: 'Busy',
  [FLEET_STATUS.OFFLINE]: 'Offline'
};

export const DEFAULT_FLEET = Object.fromEntries(
  TRANSPORT_MODES.map((mode) => [mode.id, FLEET_STATUS.AVAILABLE])
);

/** Busy capacity is still bookable; it just takes longer to get a vehicle moving. */
const BUSY_DELAY_SECONDS = 25 * 60;

// ---------------------------------------------------------------------------
// Geography. Sea freight needs a port at one end, which is why Nairobi → Mombasa
// can go by ship and Nairobi → Westlands cannot.
// ---------------------------------------------------------------------------

export const PORTS = [
  { name: 'Mombasa', lat: -4.0435, lng: 39.6682 },
  { name: 'Malindi', lat: -3.2192, lng: 40.1169 },
  { name: 'Lamu', lat: -2.2717, lng: 40.902 },
  { name: 'Kisumu', lat: -0.0917, lng: 34.768 },
  { name: 'Dar es Salaam', lat: -6.7924, lng: 39.2083 }
];

const PORT_RADIUS_KM = 90;

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest listed port to a point, or null if none is within reach of a road leg. */
export function nearestPort(place) {
  if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lng)) return null;
  let best = null;
  for (const port of PORTS) {
    const km = haversineKm(place, port);
    if (km <= PORT_RADIUS_KM && (!best || km < best.km)) best = { ...port, km };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Parcel measurements.
// ---------------------------------------------------------------------------

/** Airline divisor: a light but bulky parcel is charged on the space it occupies. */
export const VOLUMETRIC_DIVISOR = 5000;

export function volumetricWeightKg({ lengthCm, widthCm, heightCm } = {}) {
  const l = Number(lengthCm) || 0;
  const w = Number(widthCm) || 0;
  const h = Number(heightCm) || 0;
  if (l <= 0 || w <= 0 || h <= 0) return 0;
  return Math.round(((l * w * h) / VOLUMETRIC_DIVISOR) * 100) / 100;
}

/** Longest dimension, used for the drone's size limit. */
export function longestSideCm({ lengthCm, widthCm, heightCm } = {}) {
  return Math.max(Number(lengthCm) || 0, Number(widthCm) || 0, Number(heightCm) || 0);
}

/**
 * What the fare is actually charged on: the heavier of the real weight and the space
 * the parcel takes up. Dimensions are optional, so this is usually just the weight.
 */
export function chargeableWeightKg(parcel = {}, actualWeightKg) {
  const actual = Number.isFinite(actualWeightKg) ? actualWeightKg : Number(parcel.weightKg) || 0;
  return Math.max(actual, volumetricWeightKg(parcel));
}

export const PACKAGE_TYPES = [
  { id: 'DOCUMENTS', label: 'Documents', icon: 'description' },
  { id: 'PARCEL', label: 'Parcel', icon: 'inventory_2' },
  { id: 'ELECTRONICS', label: 'Electronics', icon: 'devices' },
  { id: 'CLOTHING', label: 'Clothing', icon: 'apparel' },
  { id: 'FOOD', label: 'Food', icon: 'lunch_dining' },
  { id: 'FRAGILE', label: 'Fragile', icon: 'egg_alt' },
  { id: 'OTHER', label: 'Other', icon: 'category' }
];

export const packageTypeLabel = (id) =>
  PACKAGE_TYPES.find((type) => type.id === id)?.label || '';

// ---------------------------------------------------------------------------
// Eligibility (§25). Not every mode can serve every route, and a mode that cannot
// has to say why — a greyed-out card with no explanation is a dead end.
// ---------------------------------------------------------------------------

const km = (value) => `${Math.round(value).toLocaleString('en-KE')} km`;

export function modeAvailability({
  mode,
  distanceKm = 0,
  weightKg = 0,
  longestSideCm: longest = 0,
  pickup,
  destination,
  fleetStatus = FLEET_STATUS.AVAILABLE
} = {}) {
  const meta = modeMeta(mode);
  const { limits } = meta;

  if (fleetStatus === FLEET_STATUS.OFFLINE) {
    return { available: false, reason: `${meta.freightLabel} is offline right now — no capacity on this route.` };
  }

  if (!distanceKm) {
    return { available: false, reason: 'Choose both locations to see what can carry it.' };
  }

  if (limits.maxDistanceKm && distanceKm > limits.maxDistanceKm) {
    return {
      available: false,
      reason: `${meta.freightLabel} covers routes up to ${km(limits.maxDistanceKm)} — this one is ${km(distanceKm)}.`
    };
  }

  if (limits.minDistanceKm && distanceKm < limits.minDistanceKm) {
    return {
      available: false,
      reason: `${meta.freightLabel} starts at ${km(limits.minDistanceKm)} — road covers this ${km(distanceKm)} hop faster.`
    };
  }

  if (limits.maxWeightKg && weightKg > limits.maxWeightKg) {
    return {
      available: false,
      reason: `${meta.freightLabel} carries up to ${limits.maxWeightKg} kg — this parcel prices at ${Math.round(weightKg * 10) / 10} kg.`
    };
  }

  if (limits.maxLongestSideCm && longest > limits.maxLongestSideCm) {
    return {
      available: false,
      reason: `${meta.freightLabel} takes parcels up to ${limits.maxLongestSideCm} cm on the longest side — this one is ${Math.round(longest)} cm.`
    };
  }

  if (limits.requiresPort) {
    const port = nearestPort(pickup) || nearestPort(destination);
    if (!port) {
      return {
        available: false,
        reason: 'Sea freight runs between ports — neither end of this route reaches one.'
      };
    }
    return { available: true, reason: null, via: port.name, busy: fleetStatus === FLEET_STATUS.BUSY };
  }

  return { available: true, reason: null, busy: fleetStatus === FLEET_STATUS.BUSY };
}

// ---------------------------------------------------------------------------
// Tariff.
// ---------------------------------------------------------------------------

const ROUNDING = 10;
const roundUp = (value, step) => Math.ceil(value / step) * step;

/** Distance the fare is charged on — road tapers past the city band, the rest are flat. */
export function chargeableDistanceKm(mode, distanceKm) {
  const { tariff } = modeMeta(mode);
  if (!tariff.cityKm || distanceKm <= tariff.cityKm) return distanceKm;
  return tariff.cityKm + ((distanceKm - tariff.cityKm) * tariff.lineHaulPerKm) / tariff.perKm;
}

/**
 * One mode's quote for one parcel on one route. Every figure the UI prints is
 * returned, so the price card never re-derives arithmetic.
 *
 *   quoteTransport({ mode: 'ROAD', weightKg: 3, distanceKm: 12.4 })
 *   → { baseFare: 0, distanceCost: 496, weightCost: 150, total: 650, ... }
 *
 * Road at standard priority reproduces the original §9 calculator exactly, which is
 * what keeps every existing quote and every stored order unchanged.
 */
export function quoteTransport({
  mode = DEFAULT_MODE,
  weightKg = 0,
  distanceKm = 0,
  priority = DEFAULT_PRIORITY,
  durationSeconds = null,
  busy = false
} = {}) {
  const meta = modeMeta(mode);
  const { tariff } = meta;
  const tier = priorityOption(priority);

  const weight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0;
  const distance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;

  const baseFare = distance > 0 ? tariff.base : 0;
  const distanceCost = chargeableDistanceKm(mode, distance) * tariff.perKm;
  const weightCost = weight * tariff.perKg;
  const subtotal = baseFare + distanceCost + weightCost;
  const priorityCost = subtotal * (tier.priceFactor - 1);
  const priced = subtotal + priorityCost;
  // The floor applies even to an empty quote, exactly as the original §9 calculator did.
  const total = Math.max(tariff.minimum, roundUp(priced, ROUNDING));

  return {
    mode,
    priority,
    weightKg: weight,
    distanceKm: distance,
    baseFare,
    distanceCost,
    weightCost,
    priorityCost,
    subtotal: priced,
    total,
    minimumApplied: priced > 0 && roundUp(priced, ROUNDING) < tariff.minimum,
    durationSeconds: estimateDurationSeconds({ mode, distanceKm: distance, priority, durationSeconds, busy })
  };
}

/**
 * How long the journey takes door to door: time in motion plus the handling each
 * mode needs at either end (a flight is 45 minutes; getting the parcel through both
 * airports is not).
 *
 * Road prefers the router's own driving time when we have it — a measured route beats
 * an average speed.
 */
export function estimateDurationSeconds({
  mode = DEFAULT_MODE,
  distanceKm = 0,
  priority = DEFAULT_PRIORITY,
  durationSeconds = null,
  busy = false
} = {}) {
  const meta = modeMeta(mode);
  const tier = priorityOption(priority);

  const inMotion =
    mode === TRANSPORT.ROAD && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : (distanceKm / meta.speedKmh) * 3600;

  const total = (inMotion + meta.handlingSeconds) * tier.timeFactor + (busy ? BUSY_DELAY_SECONDS : 0);
  return Math.max(60, Math.round(total));
}

/**
 * Every mode, priced and checked against the route in one pass — this is what the
 * transport step renders. Ineligible modes come back with their reason attached
 * rather than being dropped, because the customer is owed the explanation.
 */
export function transportOptions({
  pickup,
  destination,
  route,
  parcel,
  weightKg,
  priority = DEFAULT_PRIORITY,
  fleet = DEFAULT_FLEET
} = {}) {
  const distanceKm = route?.distanceKm || 0;
  const chargeable = chargeableWeightKg(parcel || {}, weightKg);
  const longest = longestSideCm(parcel || {});

  const options = TRANSPORT_MODES.map((meta) => {
    const availability = modeAvailability({
      mode: meta.id,
      distanceKm,
      weightKg: chargeable,
      longestSideCm: longest,
      pickup,
      destination,
      fleetStatus: fleet?.[meta.id] || FLEET_STATUS.AVAILABLE
    });

    return {
      mode: meta.id,
      meta,
      available: availability.available,
      reason: availability.reason,
      busy: Boolean(availability.busy),
      via: availability.via || null,
      quote: availability.available
        ? quoteTransport({
            mode: meta.id,
            weightKg: chargeable,
            distanceKm,
            priority,
            durationSeconds: route?.durationSeconds,
            busy: Boolean(availability.busy)
          })
        : null
    };
  });

  // Badges, decided across the set rather than per card: cheapest and quickest of
  // whatever is actually on offer.
  const live = options.filter((option) => option.quote);
  const cheapest = live.reduce((best, o) => (!best || o.quote.total < best.quote.total ? o : best), null);
  const quickest = live.reduce(
    (best, o) => (!best || o.quote.durationSeconds < best.quote.durationSeconds ? o : best),
    null
  );

  return options.map((option) => ({
    ...option,
    badge:
      live.length > 1 && cheapest && option.mode === cheapest.mode
        ? 'Best value'
        : live.length > 1 && quickest && option.mode === quickest.mode
          ? 'Fastest'
          : null
  }));
}

/** The mode we default the customer to: cheapest eligible, road when nothing is. */
export function defaultModeFor(options = []) {
  const live = options.filter((option) => option.available);
  if (!live.length) return null;
  return live.reduce((best, o) => (o.quote.total < best.quote.total ? o : best), live[0]).mode;
}

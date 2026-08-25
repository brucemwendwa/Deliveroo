// §18 status vocabulary plus the §16/§17 permission guards. Kept free of React and
// of the store so both the customer screens and the admin console read one source.

export const STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

/** The happy path, in order. Cancellation leaves this line rather than extending it. */
export const STATUS_FLOW = [
  STATUS.PENDING,
  STATUS.ASSIGNED,
  STATUS.PICKED_UP,
  STATUS.IN_TRANSIT,
  STATUS.DELIVERED
];

export const STATUS_LABEL = {
  [STATUS.PENDING]: 'Pending',
  [STATUS.ASSIGNED]: 'Courier Assigned',
  [STATUS.PICKED_UP]: 'Picked Up',
  [STATUS.IN_TRANSIT]: 'In Transit',
  [STATUS.DELIVERED]: 'Delivered',
  [STATUS.CANCELLED]: 'Cancelled'
};

/** Timeline wording (§13) — past tense, customer-facing. */
export const TIMELINE_LABEL = {
  [STATUS.PENDING]: 'Order received',
  [STATUS.ASSIGNED]: 'Courier assigned',
  [STATUS.PICKED_UP]: 'Picked up',
  [STATUS.IN_TRANSIT]: 'In transit',
  [STATUS.DELIVERED]: 'Delivered'
};

/** Nothing can be done to an order in one of these states. */
export const TERMINAL_STATUSES = [STATUS.DELIVERED, STATUS.CANCELLED];

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

/** Position along STATUS_FLOW, or -1 for cancelled/unknown. */
export const stepIndex = (status) => STATUS_FLOW.indexOf(status);

export const isComplete = (status, step) => {
  const current = stepIndex(status);
  return current >= 0 && stepIndex(step) <= current;
};

// ---------------------------------------------------------------------------
// §16 / §17 guards. Both actions are allowed right up until the parcel lands.
// ---------------------------------------------------------------------------

export const canCancel = (order) => Boolean(order) && !isTerminal(order.status);

export const canChangeDestination = (order) => Boolean(order) && !isTerminal(order.status);

/** Why the action is unavailable — §17 requires the UI to say, not just disable. */
export function blockedReason(order) {
  if (!order) return 'Order not found.';
  if (order.status === STATUS.DELIVERED) return 'This delivery has already been completed.';
  if (order.status === STATUS.CANCELLED) return 'This delivery was cancelled.';
  return null;
}

/** Statuses an admin may move an order to from where it is now (§18). */
export function allowedTransitions(status) {
  if (isTerminal(status)) return [];
  const next = STATUS_FLOW.slice(stepIndex(status) + 1);
  return [...next, STATUS.CANCELLED];
}

// ---------------------------------------------------------------------------
// Weight verification. The parcel is physically in our hands from the moment a
// courier collects it until it leaves for the drop, so that is the window in
// which it can be put on a scale. Once it is in transit the fare is settled —
// re-pricing a customer who is already committed and moving would be indefensible.
// ---------------------------------------------------------------------------

export const WEIGHABLE_STATUSES = [STATUS.PENDING, STATUS.ASSIGNED, STATUS.PICKED_UP];

export const canVerifyWeight = (order) => Boolean(order) && WEIGHABLE_STATUSES.includes(order.status);

/** Why the scale is closed for this order — the console says so rather than just grey. */
export function weightLockedReason(order) {
  if (!order) return 'Order not found.';
  if (canVerifyWeight(order)) return null;
  if (order.status === STATUS.CANCELLED) return 'This delivery was cancelled.';
  if (order.status === STATUS.DELIVERED) return 'This delivery has already been completed.';
  return 'The parcel is already in transit — the fare is settled and can no longer be re-priced.';
}

// ---------------------------------------------------------------------------
// §25 journey view. The six statuses above stay the vocabulary the API speaks;
// what a customer watching a parcel wants is finer than that — dispatched, in
// transit, arriving — so those are *derived* here rather than added to STATUS.
// One source of truth, two levels of detail.
// ---------------------------------------------------------------------------

/** Rough share of the journey done at each status, before time is taken into account. */
export const PROGRESS = {
  [STATUS.PENDING]: 4,
  [STATUS.ASSIGNED]: 20,
  [STATUS.PICKED_UP]: 45,
  [STATUS.IN_TRANSIT]: 60,
  [STATUS.DELIVERED]: 100,
  [STATUS.CANCELLED]: 0
};

/** In transit, progress runs across this band as the journey time elapses. */
const TRANSIT_BAND = [60, 98];
/** Past this, the parcel is "arriving" rather than merely in transit. */
export const ARRIVING_AT = 88;

const historyTime = (order, status) => {
  const entry = [...(order?.history || [])].reverse().find((row) => row.status === status);
  return entry ? new Date(entry.at).getTime() : null;
};

/**
 * How far along the delivery is, 0–100. Once it is in transit the figure moves with
 * the clock rather than sitting still until the next admin click — that is what makes
 * the ETA count down and the timeline reach "Arriving" on its own.
 */
export function progressFor(order, now = Date.now()) {
  if (!order) return 0;
  const base = PROGRESS[order.status] ?? 0;
  if (order.status !== STATUS.IN_TRANSIT) return base;

  const startedAt = historyTime(order, STATUS.IN_TRANSIT);
  const duration = Number(order.route?.durationSeconds) || 0;
  if (!startedAt || duration <= 0) return base;

  const elapsed = (now - startedAt) / 1000;
  const share = Math.max(0, Math.min(1, elapsed / duration));
  return TRANSIT_BAND[0] + (TRANSIT_BAND[1] - TRANSIT_BAND[0]) * share;
}

/** Seconds left before the parcel lands, from the progress above. */
export function remainingSeconds(order, now = Date.now()) {
  if (!order || order.status === STATUS.DELIVERED) return 0;
  const duration = Number(order.route?.durationSeconds) || 0;
  return Math.max(0, duration * (1 - progressFor(order, now) / 100));
}

/** Kilometres still to run — the tracking screen prints this beside the ETA. */
export function remainingKm(order, now = Date.now()) {
  if (!order || order.status === STATUS.DELIVERED) return 0;
  const distance = Number(order.route?.distanceKm) || 0;
  return Math.max(0, distance * (1 - progressFor(order, now) / 100));
}

export const isArriving = (order, now = Date.now()) =>
  order?.status === STATUS.IN_TRANSIT && progressFor(order, now) >= ARRIVING_AT;

/** The seven rows of the tracking timeline, in order. */
export const JOURNEY_STAGES = [
  { key: 'REQUESTED', label: 'Delivery requested', at: STATUS.PENDING },
  { key: 'ASSIGNED', label: 'Pickup agent assigned', at: STATUS.ASSIGNED },
  { key: 'PICKED_UP', label: 'Parcel picked up', at: STATUS.PICKED_UP },
  { key: 'DISPATCHED', label: 'Parcel dispatched', at: STATUS.IN_TRANSIT },
  { key: 'IN_TRANSIT', label: 'In transit', at: STATUS.IN_TRANSIT },
  { key: 'ARRIVING', label: 'Arriving', at: STATUS.IN_TRANSIT },
  { key: 'DELIVERED', label: 'Delivered', at: STATUS.DELIVERED }
];

/**
 * The timeline, resolved against one order: every stage tagged done / current / todo.
 * Dispatched, in transit and arriving all sit on IN_TRANSIT, so they are separated by
 * how far through the journey the parcel is.
 */
export function journeyStages(order, now = Date.now()) {
  const status = order?.status;
  const current = stepIndex(status);
  const progress = progressFor(order, now);
  const arriving = progress >= ARRIVING_AT;

  return JOURNEY_STAGES.map((stage) => {
    const at = stepIndex(stage.at);
    let state = at < current ? 'done' : at > current ? 'todo' : 'current';

    if (status === STATUS.IN_TRANSIT && at === current) {
      // Three rows share IN_TRANSIT; time decides which of them is live.
      if (stage.key === 'DISPATCHED') state = 'done';
      else if (stage.key === 'IN_TRANSIT') state = arriving ? 'done' : 'current';
      else state = arriving ? 'current' : 'todo';
    }

    return { ...stage, state };
  });
}

/**
 * Where the parcel is right now, in words. An admin can pin an explicit location
 * (§26); until then it is wherever the journey says it should be.
 */
export function currentLocationLabel(order) {
  if (!order) return '—';
  if (order.presentLocation?.label) return order.presentLocation.label;
  if (order.status === STATUS.DELIVERED) return order.destination?.name || order.destination?.label || '—';
  if (order.status === STATUS.CANCELLED) return '—';
  if (stepIndex(order.status) < stepIndex(STATUS.PICKED_UP)) {
    return order.pickup?.name || order.pickup?.label || '—';
  }
  return `En route to ${order.destination?.name || 'destination'}`;
}

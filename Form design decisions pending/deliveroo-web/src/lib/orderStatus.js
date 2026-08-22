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

// §19 — future-ready only. Templates and a local outbox exist so that wiring a real
// email provider later is a one-function change; nothing here surfaces in the MVP UI.

import { STATUS } from './orderStatus';
import { formatKes } from './pricing';
import { agentNoun, modeMeta, transportOf } from './transport';

export const NOTIFICATION_TEMPLATES = {
  // §25 — the noun follows the vehicle: a motorbike delivery sends a rider, and the
  // message a customer gets has to match the word the tracking screen is using.
  [STATUS.ASSIGNED]: (order) => {
    const mode = transportOf(order);
    const noun = agentNoun(mode);
    return order.courier?.name
      ? `${order.courier.name} is your ${noun} and is on the way to collect your package.`
      : `Your ${noun} has been assigned.`;
  },
  [STATUS.PICKED_UP]: 'Your package has been picked up.',
  [STATUS.IN_TRANSIT]: (order) =>
    `Your package is on its way by ${modeMeta(transportOf(order)).label.toLowerCase()}.`,
  [STATUS.DELIVERED]: 'Your package has been delivered.',
  DESTINATION_CHANGED: 'Your delivery location has been updated.',
  // §19 — the one template that has to quote figures: a fare that moved after
  // pickup is the message, so it takes the order rather than a fixed string.
  WEIGHT_VERIFIED: (order) =>
    `We weighed your package at pickup: ${order.parcel.verifiedWeightKg} kg. ` +
    `Your delivery fee is now ${formatKes(order.pricing.total)}` +
    `${order.quotedPricing && order.quotedPricing.total !== order.pricing.total ? ` (estimated ${formatKes(order.quotedPricing.total)})` : ''}.`
};

const OUTBOX_KEY = 'sendit.outbox';

const readOutbox = () => {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || [];
  } catch {
    return [];
  }
};

/**
 * Records a notification that a real backend would email. Swap the body of this
 * function for a POST to the mail service and every call site keeps working.
 */
export function notify(order, templateKey) {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template || !order) return null;
  // Templates may be functions when the message has to quote the order's own figures.
  const message = typeof template === 'function' ? template(order) : template;
  if (!message) return null;

  const entry = {
    id: `ntf_${Date.now().toString(36)}`,
    orderId: order.id,
    to: order.sender?.email || order.sender?.phone || 'unknown',
    message,
    sentAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify([entry, ...readOutbox()].slice(0, 50)));
  } catch {
    /* storage full or unavailable — notifications are best-effort */
  }
  return entry;
}

export const outbox = readOutbox;

/** §27 — the portal's demo reset empties the outbox with everything else. */
export function clearOutbox() {
  try {
    localStorage.removeItem(OUTBOX_KEY);
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

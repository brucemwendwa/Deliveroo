// §19 — future-ready only. Templates and a local outbox exist so that wiring a real
// email provider later is a one-function change; nothing here surfaces in the MVP UI.

import { STATUS } from './orderStatus';

export const NOTIFICATION_TEMPLATES = {
  [STATUS.ASSIGNED]: 'Your courier has been assigned.',
  [STATUS.PICKED_UP]: 'Your package has been picked up.',
  [STATUS.IN_TRANSIT]: 'Your package is currently in transit.',
  [STATUS.DELIVERED]: 'Your package has been delivered.',
  DESTINATION_CHANGED: 'Your delivery location has been updated.'
};

const OUTBOX_KEY = 'deliveroo.outbox';

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
  const message = NOTIFICATION_TEMPLATES[templateKey];
  if (!message || !order) return null;

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

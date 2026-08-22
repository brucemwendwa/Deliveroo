// localStorage-backed stand-in for the Flask API (§12–§19).
//
// It exists so the whole product is clickable and persistent before a backend is
// written. Every export here matches a REST call the real API will expose, so
// api/index.js can swap implementations without any UI change.
//
// Cross-tab sync (§18): writes fire the native `storage` event in *other* tabs, and
// we dispatch a matching in-tab event ourselves. That is what makes an admin status
// change move the customer's tracking screen live.

import { quote } from '../lib/pricing';
import { STATUS, isTerminal, allowedTransitions } from '../lib/orderStatus';
import { notify } from '../lib/notifications';

const ORDERS_KEY = 'deliveroo.orders';
const SESSION_KEY = 'deliveroo.session';
const CHANGE_EVENT = 'deliveroo:changed';

/** Feels like a network without being slow enough to annoy. */
const LATENCY = 140;
const wait = (ms = LATENCY) => new Promise((resolve) => setTimeout(resolve, ms));

const COURIERS = [
  { name: 'James K.', vehicle: 'Motorcycle', initial: 'J' },
  { name: 'Alex M.', vehicle: 'Motorcycle', initial: 'A' },
  { name: 'Grace W.', vehicle: 'Van', initial: 'G' },
  { name: 'Daniel O.', vehicle: 'Bicycle', initial: 'D' }
];

// --- storage plumbing -------------------------------------------------------

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota — the session simply won't survive a reload */
  }
  // `storage` only fires in other tabs, so tell this one directly.
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
};

/**
 * Calls `listener` whenever orders change, in this tab or any other.
 * Returns an unsubscribe function.
 */
export function subscribe(listener) {
  const onStorage = (event) => {
    if (!event.key || event.key === ORDERS_KEY) listener();
  };
  const onLocal = (event) => {
    if (event.detail?.key === ORDERS_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onLocal);
  };
}

const allOrders = () => read(ORDERS_KEY, []);
const saveOrders = (orders) => write(ORDERS_KEY, orders);

const newOrderId = () => `DLV-${Math.floor(10000 + Math.random() * 89999)}`;

const stamp = (order, status) => ({
  ...order,
  status,
  updatedAt: new Date().toISOString(),
  history: [...(order.history || []), { status, at: new Date().toISOString() }]
});

// --- auth (§12) -------------------------------------------------------------

/** Mock OTP. Any identifier works; the code is always this. */
export const MOCK_OTP = '000000';

export async function requestOtp({ identifier, channel }) {
  await wait();
  if (!identifier?.trim()) throw new Error('Enter an email address or phone number.');
  return { sent: true, channel };
}

export async function verifyOtp({ identifier, code, name }) {
  await wait();
  if (code !== MOCK_OTP) throw new Error('That code is not right. Check it and try again.');

  const isEmail = identifier.includes('@');
  const user = {
    id: `usr_${identifier.replace(/\W/g, '').slice(-8)}`,
    name: name?.trim() || (isEmail ? identifier.split('@')[0] : 'Customer'),
    email: isEmail ? identifier : null,
    phone: isEmail ? null : identifier,
    // Anyone signing in with this address gets the admin console (§18).
    isAdmin: identifier.trim().toLowerCase() === 'admin@deliveroo.co'
  };
  write(SESSION_KEY, user);
  return user;
}

export async function getSession() {
  return read(SESSION_KEY, null);
}

export async function signOut() {
  write(SESSION_KEY, null);
  return null;
}

// --- orders (§11, §13–§17) --------------------------------------------------

export async function createOrder(draft) {
  await wait();
  const now = new Date().toISOString();
  const order = {
    id: newOrderId(),
    userId: draft.userId || null,
    status: STATUS.PENDING,
    createdAt: now,
    updatedAt: now,
    pickup: draft.pickup,
    destination: draft.destination,
    route: draft.route,
    parcel: draft.parcel,
    pricing: quote({ weightKg: draft.parcel?.weightKg, distanceKm: draft.route?.distanceKm }),
    sender: draft.sender,
    recipient: draft.recipient,
    courier: null,
    history: [{ status: STATUS.PENDING, at: now }]
  };
  saveOrders([order, ...allOrders()]);
  return order;
}

export async function getOrder(id) {
  await wait(60);
  const order = allOrders().find((o) => o.id === id);
  if (!order) throw new Error(`Order ${id} not found.`);
  return order;
}

export async function listOrders(userId) {
  await wait(60);
  const orders = allOrders();
  return userId ? orders.filter((o) => o.userId === userId) : orders;
}

/** Admin view — every order regardless of owner (§18). */
export async function listAllOrders() {
  await wait(60);
  return allOrders();
}

function mutate(id, fn) {
  const orders = allOrders();
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) throw new Error(`Order ${id} not found.`);
  const updated = fn(orders[index]);
  orders[index] = updated;
  saveOrders(orders);
  return updated;
}

/** §18 — admin moves an order along. Assigns a courier on first transition. */
export async function updateOrderStatus(id, status) {
  await wait();
  return mutate(id, (order) => {
    if (!allowedTransitions(order.status).includes(status)) {
      throw new Error(`Cannot move ${order.status} → ${status}.`);
    }
    let next = stamp(order, status);
    if (status === STATUS.ASSIGNED && !next.courier) {
      const picked = COURIERS[Math.floor(Math.random() * COURIERS.length)];
      next = { ...next, courier: { ...picked, lat: order.pickup.lat, lng: order.pickup.lng } };
    }
    notify(next, status);
    return next;
  });
}

/** §18 — admin drags the courier marker. */
export async function updateCourierPosition(id, { lat, lng }) {
  await wait(60);
  return mutate(id, (order) => ({
    ...order,
    courier: order.courier ? { ...order.courier, lat, lng } : order.courier,
    updatedAt: new Date().toISOString()
  }));
}

/** §16 — only while the parcel is still moving. Re-routes and re-prices. */
export async function changeDestination(id, { destination, route }) {
  await wait();
  return mutate(id, (order) => {
    if (isTerminal(order.status)) throw new Error('This delivery can no longer be changed.');
    const next = {
      ...order,
      destination,
      route,
      pricing: quote({ weightKg: order.parcel?.weightKg, distanceKm: route.distanceKm }),
      updatedAt: new Date().toISOString()
    };
    notify(next, 'DESTINATION_CHANGED');
    return next;
  });
}

/** §17 — customer cancels, allowed until delivered. */
export async function cancelOrder(id) {
  await wait();
  return mutate(id, (order) => {
    if (isTerminal(order.status)) throw new Error('This delivery can no longer be cancelled.');
    return stamp(order, STATUS.CANCELLED);
  });
}

/** Gives a fresh browser something for the admin console to show. */
export function seedIfEmpty() {
  if (allOrders().length) return;
  const now = Date.now();
  const demo = [
    { from: 'Westlands · Nairobi', to: 'Kilimani · Nairobi', status: STATUS.IN_TRANSIT, weight: 3, km: 12.4, mins: 35 },
    { from: 'CBD · Nairobi', to: 'Karen · Nairobi', status: STATUS.PENDING, weight: 1, km: 18.2, mins: 47 },
    { from: 'Lavington · Nairobi', to: 'Parklands · Nairobi', status: STATUS.DELIVERED, weight: 5, km: 8.1, mins: 24 }
  ].map((row, index) => {
    const at = new Date(now - (index + 1) * 3600_000).toISOString();
    const pickup = { label: row.from, name: row.from.split(' · ')[0], lat: -1.2673 + index * 0.02, lng: 36.8065 + index * 0.01 };
    const destination = { label: row.to, name: row.to.split(' · ')[0], lat: -1.2921 - index * 0.02, lng: 36.7833 + index * 0.01 };
    return {
      id: newOrderId(),
      userId: null,
      status: row.status,
      createdAt: at,
      updatedAt: at,
      pickup,
      destination,
      route: {
        distanceKm: row.km,
        durationSeconds: row.mins * 60,
        coordinates: [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng]
        ],
        estimated: true
      },
      parcel: { weightKg: row.weight, description: 'Documents' },
      pricing: quote({ weightKg: row.weight, distanceKm: row.km }),
      sender: { name: 'Demo Sender', phone: '+254 700 000 001' },
      recipient: { name: 'Demo Recipient', phone: '+254 700 000 002' },
      courier:
        row.status === STATUS.IN_TRANSIT
          ? { ...COURIERS[0], lat: (pickup.lat + destination.lat) / 2, lng: (pickup.lng + destination.lng) / 2 }
          : null,
      history: [{ status: row.status, at }]
    };
  });
  saveOrders(demo);
}

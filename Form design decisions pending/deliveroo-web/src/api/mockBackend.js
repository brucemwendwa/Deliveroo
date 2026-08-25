// localStorage-backed stand-in for the Flask API (§12–§19).
//
// It exists so the whole product is clickable and persistent before a backend is
// written. Every export here matches a REST call the real API will expose, so
// api/index.js can swap implementations without any UI change.
//
// Cross-tab sync (§18): writes fire the native `storage` event in *other* tabs, and
// we dispatch a matching in-tab event ourselves. That is what makes an admin status
// change move the customer's tracking screen live.

import { MAX_WEIGHT_KG, priceOrder } from '../lib/pricing';
import { STATUS, allowedTransitions, canVerifyWeight, isTerminal, weightLockedReason } from '../lib/orderStatus';
import { DEFAULT_FLEET, DEFAULT_MODE, DEFAULT_PRIORITY, FLEET_STATUS, TRANSPORT } from '../lib/transport';
import { notify } from '../lib/notifications';

const ORDERS_KEY = 'deliveroo.orders';
const SESSION_KEY = 'deliveroo.session';
const FLEET_KEY = 'deliveroo.fleet';
const CHANGE_EVENT = 'deliveroo:changed';

/** Feels like a network without being slow enough to annoy. */
const LATENCY = 140;
const wait = (ms = LATENCY) => new Promise((resolve) => setTimeout(resolve, ms));

// Pickup agents are road couriers whatever the parcel goes on afterwards: something
// has to physically collect it before it can be put on a flight or a ship.
const COURIERS = [
  { name: 'James K.', vehicle: 'Honda CG 125', plate: 'KMEB 214X', initial: 'J', rating: 4.9 },
  { name: 'Alex M.', vehicle: 'TVS HLX 150', plate: 'KMFA 883J', initial: 'A', rating: 4.8 },
  { name: 'Grace W.', vehicle: 'Toyota Probox', plate: 'KDA 123A', initial: 'G', rating: 4.9 },
  { name: 'Daniel O.', vehicle: 'Nissan NV200', plate: 'KCX 907B', initial: 'D', rating: 4.7 }
];

/**
 * Dispatch (§25). Picks the agent, places them a plausible distance from the pickup
 * point and works out when they will be there — the figures the "agent assigned"
 * screen prints. A real backend would match on actual courier positions.
 */
function makeAgent(order) {
  const picked = COURIERS[Math.floor(Math.random() * COURIERS.length)];
  const distanceKm = Math.round((0.6 + Math.random() * 3.4) * 10) / 10;
  const bearing = Math.random() * 2 * Math.PI;
  const latRadians = (order.pickup.lat * Math.PI) / 180;

  return {
    ...picked,
    // Placed *away* from the pickup point rather than on it: the customer is told an
    // agent is 2.4 km out, so the marker has to be 2.4 km out. Offset from the same
    // figure the card prints, so the map and the copy can never disagree.
    lat: order.pickup.lat + (distanceKm / 111) * Math.cos(bearing),
    lng: order.pickup.lng + (distanceKm / (111 * Math.cos(latRadians))) * Math.sin(bearing),
    distanceKm,
    // ~22 km/h through city traffic, and never less than a minute.
    etaMinutes: Math.max(1, Math.round((distanceKm / 22) * 60)),
    assignedAt: new Date().toISOString()
  };
}

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
  const watched = [ORDERS_KEY, FLEET_KEY];
  const onStorage = (event) => {
    if (!event.key || watched.includes(event.key)) listener();
  };
  const onLocal = (event) => {
    if (watched.includes(event.detail?.key)) listener();
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
    // §25 — how it travels. Absent on orders placed before multi-modal shipped, which
    // is why every reader defaults to road at standard priority.
    transport: {
      mode: draft.transport?.mode || DEFAULT_MODE,
      priority: draft.transport?.priority || DEFAULT_PRIORITY
    },
    // The customer's weight is a declaration, not a measurement — `verifiedWeightKg`
    // stays null until an admin puts the parcel on a scale (§9).
    parcel: { ...draft.parcel, verifiedWeightKg: null, weighedAt: null, weighedBy: null },
    pricing: priceOrder({ parcel: draft.parcel, route: draft.route, transport: draft.transport }),
    /** The estimate as first quoted, kept so the customer can see what moved. */
    quotedPricing: priceOrder({ parcel: draft.parcel, route: draft.route, transport: draft.transport }),
    sender: draft.sender,
    recipient: draft.recipient,
    courier: null,
    /** Where the parcel is now, once dispatch starts reporting it (§26). */
    presentLocation: null,
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
    if (status === STATUS.ASSIGNED && !next.courier) next = { ...next, courier: makeAgent(order) };
    notify(next, status);
    return next;
  });
}

/**
 * §18 — the admin puts the parcel on a scale and records what it actually weighs.
 *
 * This is the trust boundary: the fare is re-derived from the measured weight, so a
 * customer who under-declared to shave the price simply pays the real one. Staff-only
 * and enforced here rather than in the console, because a check that lives only in the
 * UI is not a check at all — the Flask route this stands in for must do the same.
 */
export async function verifyWeight(id, { weightKg }) {
  await wait();

  const session = read(SESSION_KEY, null);
  if (!session?.isAdmin) throw new Error('Only staff can record a measured weight.');

  const measured = Number(weightKg);
  if (!Number.isFinite(measured) || measured <= 0) throw new Error('Enter the weight from the scale, in kilograms.');
  if (measured > MAX_WEIGHT_KG) throw new Error(`We cannot carry more than ${MAX_WEIGHT_KG} kg.`);

  return mutate(id, (order) => {
    const locked = weightLockedReason(order);
    if (!canVerifyWeight(order)) throw new Error(locked);

    const parcel = {
      ...order.parcel,
      verifiedWeightKg: Math.round(measured * 100) / 100,
      weighedAt: new Date().toISOString(),
      weighedBy: session.email || session.phone || session.id
    };
    const next = {
      ...order,
      parcel,
      // Preserved on first weigh-in only, so a second correction still compares
      // against the original estimate the customer accepted.
      quotedPricing: order.quotedPricing || order.pricing,
      pricing: priceOrder({ parcel, route: order.route, transport: order.transport }),
      updatedAt: new Date().toISOString()
    };
    notify(next, 'WEIGHT_VERIFIED');
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

/**
 * §25 — dispatch. The on-demand equivalent of an admin clicking "assigned": the
 * customer asks for a pickup and the platform finds them an agent. Idempotent, so
 * the confirmation screen can call it without racing itself, and it refuses to jump
 * an order that has already moved on.
 */
export async function assignAgent(id) {
  // Long enough to read as a search rather than a spinner blink.
  await wait(900);
  return mutate(id, (order) => {
    if (order.status !== STATUS.PENDING || order.courier) return order;
    const next = { ...stamp(order, STATUS.ASSIGNED), courier: makeAgent(order) };
    notify(next, STATUS.ASSIGNED);
    return next;
  });
}

/**
 * §26 — where the parcel is right now, as reported by dispatch. Distinct from the
 * courier marker: the marker is a point on a map, this is the place a customer is
 * told over the phone ("it's in Voi"), and long-haul legs have one without the other.
 */
export async function updatePresentLocation(id, { label, lat, lng } = {}) {
  await wait(60);
  const session = read(SESSION_KEY, null);
  if (!session?.isAdmin) throw new Error('Only staff can update a parcel location.');
  if (!label?.trim()) throw new Error('Give the location a name.');

  return mutate(id, (order) => ({
    ...order,
    presentLocation: {
      label: label.trim(),
      lat: Number.isFinite(lat) ? lat : (order.courier?.lat ?? order.pickup.lat),
      lng: Number.isFinite(lng) ? lng : (order.courier?.lng ?? order.pickup.lng),
      at: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }));
}

// --- transport capacity (§26) -----------------------------------------------
//
// Prototype: this records which partner capacity dispatch can book into today, not
// a fleet Deliveroo owns. Booking reads it, so taking a mode offline here removes it
// from the customer's options.

export async function getFleet() {
  await wait(40);
  return { ...DEFAULT_FLEET, ...read(FLEET_KEY, null) };
}

export async function setFleetStatus(mode, status) {
  await wait(60);
  const session = read(SESSION_KEY, null);
  if (!session?.isAdmin) throw new Error('Only staff can change transport availability.');
  if (!TRANSPORT[mode]) throw new Error(`Unknown transport mode ${mode}.`);
  if (!FLEET_STATUS[status]) throw new Error(`Unknown availability ${status}.`);

  const next = { ...DEFAULT_FLEET, ...read(FLEET_KEY, null), [mode]: status };
  write(FLEET_KEY, next);
  return next;
}

/**
 * §17 — a delivery belongs to the account that booked it. Enforced here rather than
 * in the screen, because a rule that lives only in the UI is not a rule: anyone could
 * call the endpoint directly. Staff pass, since dispatch acts on the customer's behalf,
 * and the seeded demo orders have no owner to protect.
 */
function assertOwner(order) {
  if (!order.userId) return;
  const session = read(SESSION_KEY, null);
  if (session?.isAdmin) return;
  if (session?.id !== order.userId) {
    throw new Error('Only the customer who booked this delivery can change or cancel it.');
  }
}

/** §16 — only while the parcel is still moving. Re-routes and re-prices. */
export async function changeDestination(id, { destination, route }) {
  await wait();
  return mutate(id, (order) => {
    if (isTerminal(order.status)) throw new Error('This delivery can no longer be changed.');
    assertOwner(order);
    const next = {
      ...order,
      destination,
      route,
      // priceOrder, not quote: on an already-weighed parcel this must keep billing
      // the measured weight, never fall back to the declaration.
      pricing: priceOrder({ parcel: order.parcel, route, transport: order.transport }),
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
    assertOwner(order);
    return stamp(order, STATUS.CANCELLED);
  });
}

/** Gives a fresh browser something for the admin console to show. */
export function seedIfEmpty() {
  if (allOrders().length) return;
  const now = Date.now();
  const demo = [
    {
      from: 'Westlands · Nairobi',
      to: 'Kilimani · Nairobi',
      status: STATUS.IN_TRANSIT,
      mode: TRANSPORT.ROAD,
      weight: 3,
      measured: 7.2,
      km: 12.4,
      mins: 35,
      pickup: { lat: -1.2673, lng: 36.8065 },
      drop: { lat: -1.2921, lng: 36.7833 }
    },
    {
      from: 'CBD · Nairobi',
      to: 'Mombasa',
      status: STATUS.IN_TRANSIT,
      mode: TRANSPORT.AIR,
      weight: 3,
      km: 485,
      mins: 137,
      pickup: { lat: -1.2864, lng: 36.8172 },
      drop: { lat: -4.0435, lng: 39.6682 },
      at: 'Nairobi · JKIA'
    },
    {
      from: 'CBD · Nairobi',
      to: 'Karen · Nairobi',
      status: STATUS.PENDING,
      mode: TRANSPORT.ROAD,
      weight: 1,
      km: 18.2,
      mins: 47,
      pickup: { lat: -1.2864, lng: 36.8172 },
      drop: { lat: -1.3191, lng: 36.7062 }
    },
    {
      from: 'Kilimani · Nairobi',
      to: 'Runda · Nairobi',
      status: STATUS.ASSIGNED,
      mode: TRANSPORT.DRONE,
      weight: 2,
      km: 9.4,
      mins: 20,
      pickup: { lat: -1.2921, lng: 36.7833 },
      drop: { lat: -1.2189, lng: 36.8172 }
    },
    {
      from: 'Industrial Area · Nairobi',
      to: 'Mombasa',
      status: STATUS.ASSIGNED,
      mode: TRANSPORT.SHIP,
      weight: 140,
      km: 485,
      mins: 1509,
      pickup: { lat: -1.3082, lng: 36.8506 },
      drop: { lat: -4.0435, lng: 39.6682 }
    },
    {
      from: 'Lavington · Nairobi',
      to: 'Parklands · Nairobi',
      status: STATUS.DELIVERED,
      mode: TRANSPORT.ROAD,
      weight: 5,
      measured: 5.1,
      km: 8.1,
      mins: 24,
      pickup: { lat: -1.2793, lng: 36.7684 },
      drop: { lat: -1.2634, lng: 36.8571 }
    }
  ].map((row, index) => {
    const at = new Date(now - (index + 1) * 3600_000).toISOString();
    const pickup = { label: row.from, name: row.from.split(' · ')[0], ...row.pickup };
    const destination = { label: row.to, name: row.to.split(' · ')[0], ...row.drop };
    const transport = { mode: row.mode, priority: DEFAULT_PRIORITY };
    const route = {
      distanceKm: row.km,
      durationSeconds: row.mins * 60,
      coordinates: [
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      ],
      estimated: true
    };
    const parcel = {
      weightKg: row.weight,
      description: 'Documents',
      packageType: 'DOCUMENTS',
      verifiedWeightKg: row.measured ?? null,
      weighedAt: row.measured ? at : null,
      weighedBy: row.measured ? 'admin@deliveroo.co' : null
    };
    const moving = row.status === STATUS.IN_TRANSIT;
    const assigned = moving || row.status === STATUS.ASSIGNED || row.status === STATUS.PICKED_UP;

    return {
      id: newOrderId(),
      userId: null,
      status: row.status,
      createdAt: at,
      updatedAt: at,
      pickup,
      destination,
      route,
      transport,
      parcel,
      pricing: priceOrder({ parcel, route, transport }),
      quotedPricing: priceOrder({ parcel: { weightKg: row.weight }, route, transport }),
      sender: { name: 'Demo Sender', phone: '+254 700 000 001' },
      recipient: { name: 'Demo Recipient', phone: '+254 700 000 002' },
      courier: assigned
        ? {
            ...COURIERS[index % COURIERS.length],
            lat: moving ? (pickup.lat + destination.lat) / 2 : pickup.lat,
            lng: moving ? (pickup.lng + destination.lng) / 2 : pickup.lng,
            distanceKm: 2.4,
            etaMinutes: 7,
            assignedAt: at
          }
        : null,
      presentLocation: row.at ? { label: row.at, lat: pickup.lat, lng: pickup.lng, at } : null,
      // In transit needs a timestamped entry: progress, the ETA and the "arriving"
      // stage are all worked out from when the leg actually started.
      history: moving
        ? [
            { status: STATUS.PENDING, at },
            { status: STATUS.ASSIGNED, at },
            { status: STATUS.PICKED_UP, at },
            { status: STATUS.IN_TRANSIT, at: new Date(now - 15 * 60_000).toISOString() }
          ]
        : [{ status: row.status, at }]
    };
  });
  saveOrders(demo);
}

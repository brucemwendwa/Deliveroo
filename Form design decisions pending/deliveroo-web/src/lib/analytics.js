// §27 — the numbers the admin portal reports on, derived from the orders themselves.
//
// Pure, like pricing.js and orderStatus.js, and for the same reason: a real backend
// would compute these as SQL aggregates, and the definitions have to be portable
// rather than tangled up in a screen. Everything here takes a plain array of orders
// and returns plain data — no React, no store, no formatting. The screens format.

import { STATUS, isTerminal, remainingSeconds, stepIndex } from './orderStatus';
import { billableWeightKg, isWeightVerified } from './pricing';
import { DEFAULT_MODE, TRANSPORT_MODES, transportOf } from './transport';

const MINUTE = 60_000;

const revenueOf = (order) => (order.status === STATUS.CANCELLED ? 0 : order.pricing?.total || 0);

const at = (order, status) => {
  const entry = (order.history || []).find((row) => row.status === status);
  return entry ? Date.parse(entry.at) : null;
};

const startedAt = (order) => at(order, STATUS.PENDING) ?? Date.parse(order.createdAt);

/** Door to door, in minutes, for a delivery that finished. Null for anything else. */
export function deliveryMinutes(order) {
  if (order.status !== STATUS.DELIVERED) return null;
  const from = startedAt(order);
  const to = at(order, STATUS.DELIVERED) ?? Date.parse(order.updatedAt);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return Math.round((to - from) / MINUTE);
}

/**
 * On time means: delivered no later than the duration it was quoted, counted from
 * the moment the parcel was actually collected. Counting from the booking would
 * charge the carrier for how long the customer took to hand the parcel over.
 */
export function isOnTime(order) {
  if (order.status !== STATUS.DELIVERED) return null;
  const quoted = order.pricing?.durationSeconds || order.route?.durationSeconds;
  if (!quoted) return null;
  const from = at(order, STATUS.PICKED_UP) ?? startedAt(order);
  const to = at(order, STATUS.DELIVERED) ?? Date.parse(order.updatedAt);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return to - from <= quoted * 1000;
}

const mean = (values) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const share = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/** The headline figures: one pass over the board. */
export function summarize(orders = []) {
  const counts = Object.fromEntries(Object.values(STATUS).map((status) => [status, 0]));
  let revenue = 0;
  let weighed = 0;
  const durations = [];
  const onTime = [];

  for (const order of orders) {
    counts[order.status] = (counts[order.status] || 0) + 1;
    revenue += revenueOf(order);
    if (isWeightVerified(order.parcel)) weighed += 1;
    const minutes = deliveryMinutes(order);
    if (minutes !== null) durations.push(minutes);
    const punctual = isOnTime(order);
    if (punctual !== null) onTime.push(punctual);
  }

  const active = orders.filter((order) => !isTerminal(order.status)).length;
  const billed = orders.filter((order) => order.status !== STATUS.CANCELLED).length;

  return {
    ...counts,
    total: orders.length,
    active,
    revenue,
    /** Average fare across everything that will actually be invoiced. */
    averageFare: billed ? Math.round(revenue / billed) : 0,
    completionRate: share(counts[STATUS.DELIVERED], orders.length),
    cancellationRate: share(counts[STATUS.CANCELLED], orders.length),
    weighedRate: share(weighed, orders.length),
    averageMinutes: mean(durations),
    onTimeRate: onTime.length ? share(onTime.filter(Boolean).length, onTime.length) : null,
    /** Weight actually being carried, on the best figure available per parcel. */
    tonnage: Math.round(orders.reduce((sum, order) => sum + billableWeightKg(order.parcel || {}), 0) * 10) / 10
  };
}

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * Booked volume and revenue per day, oldest first, with empty days kept — a gap in a
 * time series is information, and dropping it makes a quiet Sunday invisible.
 */
export function volumeByDay(orders = [], days = 14, now = Date.now()) {
  const buckets = new Map();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 24 * 3600_000);
    buckets.set(dayKey(date.getTime()), { key: dayKey(date.getTime()), date, count: 0, revenue: 0 });
  }

  for (const order of orders) {
    const bucket = buckets.get(dayKey(startedAt(order)));
    if (!bucket) continue;
    bucket.count += 1;
    bucket.revenue += revenueOf(order);
  }

  return [...buckets.values()];
}

/** Every mode in the catalogue, including the ones nobody booked — a zero is a fact. */
export function byMode(orders = []) {
  const rows = new Map(
    TRANSPORT_MODES.map((meta) => [meta.id, { mode: meta.id, count: 0, revenue: 0, active: 0, share: 0 }])
  );

  for (const order of orders) {
    const row = rows.get(transportOf(order)) || rows.get(DEFAULT_MODE);
    row.count += 1;
    row.revenue += revenueOf(order);
    if (!isTerminal(order.status)) row.active += 1;
  }

  const total = orders.length;
  for (const row of rows.values()) row.share = share(row.count, total);
  return [...rows.values()];
}

export function byStatus(orders = []) {
  const counts = Object.fromEntries(Object.values(STATUS).map((status) => [status, 0]));
  for (const order of orders) counts[order.status] = (counts[order.status] || 0) + 1;
  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    share: share(count, orders.length)
  }));
}

/** Where the work actually is, busiest first. */
export function topRoutes(orders = [], limit = 6) {
  const rows = new Map();
  for (const order of orders) {
    const label = `${order.pickup?.name || '—'} → ${order.destination?.name || '—'}`;
    const row = rows.get(label) || { label, count: 0, revenue: 0 };
    row.count += 1;
    row.revenue += revenueOf(order);
    rows.set(label, row);
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, limit);
}

/**
 * Courier workload, keyed on the plate rather than the name: two riders can share a
 * first name, and the registration is what the depot actually tracks.
 */
export function courierPerformance(orders = []) {
  const rows = new Map();
  for (const order of orders) {
    const courier = order.courier;
    if (!courier) continue;
    const key = courier.plate || courier.name;
    const row = rows.get(key) || {
      key,
      name: courier.name,
      plate: courier.plate,
      vehicle: courier.vehicle,
      rating: courier.rating,
      jobs: 0,
      delivered: 0,
      active: 0,
      revenue: 0,
      minutes: []
    };
    row.jobs += 1;
    row.revenue += revenueOf(order);
    if (order.status === STATUS.DELIVERED) row.delivered += 1;
    if (!isTerminal(order.status)) row.active += 1;
    const minutes = deliveryMinutes(order);
    if (minutes !== null) row.minutes.push(minutes);
    rows.set(key, row);
  }
  return [...rows.values()]
    .map(({ minutes, ...row }) => ({ ...row, averageMinutes: mean(minutes) }))
    .sort((a, b) => b.jobs - a.jobs);
}

// ---------------------------------------------------------------------------
// Exceptions. The point of an operations dashboard is not the total — it is the
// handful of deliveries that need a human this morning.
// ---------------------------------------------------------------------------

export const ISSUE = {
  UNASSIGNED: 'UNASSIGNED',
  OVERDUE: 'OVERDUE',
  UNWEIGHED: 'UNWEIGHED',
  STALLED: 'STALLED'
};

export const ISSUE_LABEL = {
  [ISSUE.UNASSIGNED]: 'Waiting for an agent',
  [ISSUE.OVERDUE]: 'Past its ETA',
  [ISSUE.UNWEIGHED]: 'Never put on a scale',
  [ISSUE.STALLED]: 'No movement'
};

export const ISSUE_NOTE = {
  [ISSUE.UNASSIGNED]: 'Requested a while ago and nobody has been matched to it yet.',
  [ISSUE.OVERDUE]: 'The quoted arrival time has passed and it has not been delivered.',
  [ISSUE.UNWEIGHED]: 'Collected without a measured weight — the fare is still the estimate.',
  [ISSUE.STALLED]: 'The status has not changed in hours while the parcel is still live.'
};

/** How long each of those is allowed to be true before it counts as a problem. */
export const THRESHOLD = {
  unassignedMinutes: 15,
  stalledHours: 6
};

/**
 * Everything wrong with the board right now, worst first. One order can raise more
 * than one issue, and each is a separate row: a parcel that is both late and never
 * weighed is two jobs for two different people.
 */
export function needsAttention(orders = [], now = Date.now()) {
  const rows = [];

  for (const order of orders) {
    if (isTerminal(order.status)) continue;
    const updated = Date.parse(order.updatedAt || order.createdAt);
    const waited = (now - startedAt(order)) / MINUTE;

    if (order.status === STATUS.PENDING && !order.courier && waited >= THRESHOLD.unassignedMinutes) {
      rows.push({ order, issue: ISSUE.UNASSIGNED, minutes: Math.round(waited) });
    }
    if (stepIndex(order.status) >= stepIndex(STATUS.PICKED_UP) && remainingSeconds(order, now) <= 0) {
      rows.push({ order, issue: ISSUE.OVERDUE, minutes: null });
    }
    if (order.status === STATUS.PICKED_UP && !isWeightVerified(order.parcel)) {
      rows.push({ order, issue: ISSUE.UNWEIGHED, minutes: null });
    }
    if (Number.isFinite(updated) && now - updated >= THRESHOLD.stalledHours * 3600_000) {
      rows.push({ order, issue: ISSUE.STALLED, minutes: Math.round((now - updated) / MINUTE) });
    }
  }

  const rank = [ISSUE.OVERDUE, ISSUE.UNASSIGNED, ISSUE.STALLED, ISSUE.UNWEIGHED];
  return rows.sort((a, b) => rank.indexOf(a.issue) - rank.indexOf(b.issue));
}

// ---------------------------------------------------------------------------
// Export. Operations lives in spreadsheets; a console that cannot hand its board to
// one is a console people re-type out of.
// ---------------------------------------------------------------------------

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (columns, rows) =>
  [columns.map((column) => csvCell(column.label)).join(',')]
    .concat(rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(',')))
    .join('\n');

export const ORDER_COLUMNS = [
  { label: 'Parcel', value: (order) => order.id },
  { label: 'Booked', value: (order) => order.createdAt },
  { label: 'Status', value: (order) => order.status },
  { label: 'Mode', value: (order) => transportOf(order) },
  { label: 'Priority', value: (order) => order.transport?.priority || 'STANDARD' },
  { label: 'Pickup', value: (order) => order.pickup?.label },
  { label: 'Destination', value: (order) => order.destination?.label },
  { label: 'Distance km', value: (order) => order.route?.distanceKm },
  { label: 'Declared kg', value: (order) => order.parcel?.weightKg },
  { label: 'Measured kg', value: (order) => order.parcel?.verifiedWeightKg ?? '' },
  { label: 'Fee KES', value: (order) => order.pricing?.total },
  { label: 'Basis', value: (order) => order.pricing?.basis },
  { label: 'Courier', value: (order) => order.courier?.name ?? '' },
  { label: 'Customer', value: (order) => order.sender?.name ?? '' },
  { label: 'Minutes', value: (order) => deliveryMinutes(order) ?? '' }
];

export const ordersCsv = (orders = []) => toCsv(ORDER_COLUMNS, orders);

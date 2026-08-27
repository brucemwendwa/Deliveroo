// §27 — the definitions behind every figure the portal prints. Pure in, pure out:
// these are the aggregates a real backend would compute in SQL, so they are tested
// the same way pricing and transport are.

import {
  ISSUE,
  byMode,
  courierPerformance,
  deliveryMinutes,
  isOnTime,
  needsAttention,
  ordersCsv,
  summarize,
  topRoutes,
  volumeByDay
} from '../lib/analytics';
import { STATUS } from '../lib/orderStatus';
import { TRANSPORT } from '../lib/transport';

const HOUR = 3600_000;

const makeOrder = ({
  id = 'DLV-10000',
  status = STATUS.DELIVERED,
  mode = TRANSPORT.ROAD,
  total = 650,
  weightKg = 3,
  verifiedWeightKg = null,
  distanceKm = 12.4,
  durationSeconds = 2100,
  bookedAgo = 2 * HOUR,
  history,
  courier = null,
  now = Date.now()
} = {}) => {
  const bookedAt = new Date(now - bookedAgo).toISOString();
  return {
    id,
    status,
    createdAt: bookedAt,
    updatedAt: bookedAt,
    pickup: { name: 'Westlands', label: 'Westlands · Nairobi' },
    destination: { name: 'Kilimani', label: 'Kilimani · Nairobi' },
    route: { distanceKm, durationSeconds },
    transport: { mode, priority: 'STANDARD' },
    parcel: { weightKg, verifiedWeightKg },
    pricing: { total, basis: verifiedWeightKg ? 'verified' : 'estimated', durationSeconds },
    sender: { name: 'Ada' },
    courier,
    presentLocation: null,
    history: history || [{ status: STATUS.PENDING, at: bookedAt }]
  };
};

describe('headline figures', () => {
  it('counts revenue on everything except the cancellations', () => {
    const stats = summarize([
      makeOrder({ id: 'A', total: 650 }),
      makeOrder({ id: 'B', total: 1350 }),
      makeOrder({ id: 'C', total: 900, status: STATUS.CANCELLED })
    ]);

    expect(stats.total).toBe(3);
    expect(stats.revenue).toBe(2000);
    // The average is per invoiced delivery, so the cancellation is out of both halves.
    expect(stats.averageFare).toBe(1000);
    expect(stats.cancellationRate).toBe(33.3);
  });

  it('bills the measured weight where there is one', () => {
    const stats = summarize([makeOrder({ weightKg: 3, verifiedWeightKg: 7.2 })]);
    expect(stats.tonnage).toBe(7.2);
    expect(stats.weighedRate).toBe(100);
  });

  it('has no opinion on punctuality until something has been delivered', () => {
    expect(summarize([makeOrder({ status: STATUS.PENDING })]).onTimeRate).toBeNull();
  });
});

describe('door to door', () => {
  const now = Date.now();
  const journey = (pickedUpAgo, deliveredAgo) => [
    { status: STATUS.PENDING, at: new Date(now - 4 * HOUR).toISOString() },
    { status: STATUS.PICKED_UP, at: new Date(now - pickedUpAgo).toISOString() },
    { status: STATUS.DELIVERED, at: new Date(now - deliveredAgo).toISOString() }
  ];

  it('measures from the booking to the drop', () => {
    const order = makeOrder({ history: journey(3 * HOUR, 1 * HOUR), now });
    expect(deliveryMinutes(order)).toBe(180);
  });

  it('judges punctuality from collection, not from the booking', () => {
    // Quoted 35 minutes. The customer took three hours to hand it over; the run
    // itself took half an hour, so the carrier was on time.
    const order = makeOrder({ history: journey(1 * HOUR, 0.5 * HOUR), durationSeconds: 2100, now });
    expect(isOnTime(order)).toBe(true);

    const late = makeOrder({ history: journey(2 * HOUR, 0.5 * HOUR), durationSeconds: 2100, now });
    expect(isOnTime(late)).toBe(false);
  });

  it('says nothing about a delivery still in flight', () => {
    expect(deliveryMinutes(makeOrder({ status: STATUS.IN_TRANSIT }))).toBeNull();
    expect(isOnTime(makeOrder({ status: STATUS.IN_TRANSIT }))).toBeNull();
  });
});

describe('series', () => {
  it('keeps the empty days — a quiet Sunday is a fact, not a gap', () => {
    const now = Date.now();
    const days = volumeByDay([makeOrder({ bookedAgo: 0, now })], 7, now);

    expect(days).toHaveLength(7);
    expect(days[days.length - 1].count).toBe(1);
    expect(days.slice(0, -1).every((day) => day.count === 0)).toBe(true);
  });

  it('drops nothing off the end of the range it was given', () => {
    const now = Date.now();
    const days = volumeByDay([makeOrder({ bookedAgo: 30 * 24 * HOUR, now })], 7, now);
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(0);
  });

  it('reports every mode in the catalogue, including the unbooked ones', () => {
    const rows = byMode([makeOrder({ mode: TRANSPORT.AIR, total: 2000 })]);
    expect(rows).toHaveLength(5);
    expect(rows.find((row) => row.mode === TRANSPORT.AIR)).toMatchObject({ count: 1, revenue: 2000, share: 100 });
    expect(rows.find((row) => row.mode === TRANSPORT.SHIP)).toMatchObject({ count: 0, share: 0 });
  });

  it('ranks routes by how much work they are', () => {
    const [busiest] = topRoutes([
      makeOrder({ id: 'A' }),
      makeOrder({ id: 'B' }),
      { ...makeOrder({ id: 'C' }), destination: { name: 'Karen', label: 'Karen · Nairobi' } }
    ]);
    expect(busiest).toMatchObject({ label: 'Westlands → Kilimani', count: 2 });
  });

  it('keys courier figures on the registration, not the first name', () => {
    const rows = courierPerformance([
      makeOrder({ id: 'A', courier: { name: 'John M.', plate: 'KDA 123A', vehicle: 'Boxer' } }),
      makeOrder({ id: 'B', courier: { name: 'John M.', plate: 'KCP 441M', vehicle: 'Probox' } })
    ]);
    expect(rows).toHaveLength(2);
  });
});

describe('exceptions', () => {
  const now = Date.now();

  it('flags a request nobody has picked up', () => {
    const rows = needsAttention([makeOrder({ status: STATUS.PENDING, bookedAgo: 40 * 60_000, now })], now);
    expect(rows.map((row) => row.issue)).toContain(ISSUE.UNASSIGNED);
  });

  it('leaves a request that has only just come in alone', () => {
    const rows = needsAttention([makeOrder({ status: STATUS.PENDING, bookedAgo: 60_000, now })], now);
    expect(rows.map((row) => row.issue)).not.toContain(ISSUE.UNASSIGNED);
  });

  it('flags a parcel that should have arrived by now', () => {
    // Quoted 35 minutes, moving for two hours.
    const late = makeOrder({
      status: STATUS.IN_TRANSIT,
      durationSeconds: 2100,
      history: [
        { status: STATUS.PENDING, at: new Date(now - 3 * HOUR).toISOString() },
        { status: STATUS.PICKED_UP, at: new Date(now - 2.5 * HOUR).toISOString() },
        { status: STATUS.IN_TRANSIT, at: new Date(now - 2 * HOUR).toISOString() }
      ],
      now
    });
    const rows = needsAttention([late], now);
    expect(rows.map((row) => row.issue)).toContain(ISSUE.OVERDUE);
    expect(rows.find((row) => row.issue === ISSUE.OVERDUE).minutes).toBe(85);
  });

  it('does not call a parcel late while it is still inside its quoted time', () => {
    const moving = makeOrder({
      status: STATUS.IN_TRANSIT,
      durationSeconds: 2100,
      history: [
        { status: STATUS.PENDING, at: new Date(now - 40 * 60_000).toISOString() },
        { status: STATUS.PICKED_UP, at: new Date(now - 20 * 60_000).toISOString() },
        { status: STATUS.IN_TRANSIT, at: new Date(now - 10 * 60_000).toISOString() }
      ],
      now
    });
    expect(needsAttention([moving], now).map((row) => row.issue)).not.toContain(ISSUE.OVERDUE);
  });

  it('will not call a parcel late before anyone has collected it', () => {
    const waiting = makeOrder({ status: STATUS.ASSIGNED, bookedAgo: 5 * HOUR, now });
    expect(needsAttention([waiting], now).map((row) => row.issue)).not.toContain(ISSUE.OVERDUE);
  });

  it('flags a parcel collected without going on a scale', () => {
    const rows = needsAttention([makeOrder({ status: STATUS.PICKED_UP, bookedAgo: 30 * 60_000, now })], now);
    expect(rows.map((row) => row.issue)).toContain(ISSUE.UNWEIGHED);
  });

  it('raises one row per problem, because they are different jobs', () => {
    const stale = makeOrder({ status: STATUS.PICKED_UP, bookedAgo: 12 * HOUR, now });
    const rows = needsAttention([stale], now);
    expect(new Set(rows.map((row) => row.issue)).size).toBeGreaterThan(1);
    expect(rows.every((row) => row.order.id === stale.id)).toBe(true);
  });

  it('has nothing to say about a finished delivery', () => {
    expect(needsAttention([makeOrder({ status: STATUS.DELIVERED, bookedAgo: 40 * HOUR, now })], now)).toEqual([]);
  });
});

describe('export', () => {
  it('writes a header row and one line per delivery', () => {
    const csv = ordersCsv([makeOrder({ id: 'DLV-11111' })]);
    const [header, row] = csv.split('\n');

    expect(header).toMatch(/^Parcel,Booked,Status,Mode/);
    expect(row).toMatch(/^DLV-11111,/);
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('quotes a field that would otherwise break the columns', () => {
    const order = makeOrder({});
    order.pickup = { name: 'Westlands', label: 'Westlands, Nairobi' };
    expect(ordersCsv([order])).toContain('"Westlands, Nairobi"');
  });
});

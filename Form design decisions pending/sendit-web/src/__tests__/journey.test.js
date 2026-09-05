import { measurePath, pointAlong, vehicleLeg } from '../lib/journey';
import { STATUS, agentHasArrived, journeyStages, remainingKm } from '../lib/orderStatus';

const NOW = new Date('2025-01-01T12:00:00Z').getTime();

// A straight two-kilometre run due east, so a fraction reads off as a coordinate.
const LINE = [
  [-1.29, 36.8],
  [-1.29, 36.81],
  [-1.29, 36.82]
];

describe('walking a path', () => {
  it('lands on the ends and interpolates between them', () => {
    const measured = measurePath(LINE);
    expect(pointAlong(measured, 0)).toEqual(LINE[0]);
    expect(pointAlong(measured, 1)[1]).toBeCloseTo(36.82, 6);
    expect(pointAlong(measured, 0.5)[1]).toBeCloseTo(36.81, 6);
    expect(pointAlong(measured, 0.25)[1]).toBeCloseTo(36.805, 6);
  });

  it('clamps rather than running off either end', () => {
    const measured = measurePath(LINE);
    expect(pointAlong(measured, -3)).toEqual(LINE[0]);
    expect(pointAlong(measured, 9)[1]).toBeCloseTo(36.82, 6);
  });

  it('has nothing to say about an empty or single-point path', () => {
    expect(pointAlong(measurePath([]), 0.5)).toBeNull();
    expect(pointAlong(measurePath([[1, 2]]), 0.5)).toEqual([1, 2]);
  });
});

describe('the vehicle on the map', () => {
  const assigned = (minutesAgo, etaMinutes) => ({
    status: STATUS.ASSIGNED,
    courier: { lat: -1.3, lng: 36.79, assignedAt: new Date(NOW - minutesAgo * 60_000).toISOString(), etaMinutes }
  });

  const inTransit = (minutesAgo) => ({
    status: STATUS.IN_TRANSIT,
    route: { durationSeconds: 3600, distanceKm: 40 },
    history: [{ status: STATUS.IN_TRANSIT, at: new Date(NOW - minutesAgo * 60_000).toISOString() }]
  });

  it('runs the approach across exactly the ETA the agent quoted', () => {
    expect(vehicleLeg(assigned(0, 8), NOW)).toEqual({ leg: 'approach', fraction: 0, moving: true });
    expect(vehicleLeg(assigned(4, 8), NOW).fraction).toBeCloseTo(0.5, 6);
  });

  // The whole point of deriving both from one clock: the marker touching the pickup
  // pin and the timeline row lighting up have to be the same event.
  it('reaches the pickup at the instant the timeline says the agent arrived', () => {
    const nearly = assigned(7, 8);
    expect(vehicleLeg(nearly, NOW).fraction).toBeLessThan(1);
    expect(agentHasArrived(nearly, NOW)).toBe(false);

    const there = assigned(8, 8);
    expect(vehicleLeg(there, NOW)).toEqual({ leg: 'approach', fraction: 1, moving: false });
    expect(agentHasArrived(there, NOW)).toBe(true);
  });

  it('waits at the pickup once the parcel is aboard but not yet dispatched', () => {
    expect(vehicleLeg({ status: STATUS.PICKED_UP }, NOW)).toEqual({ leg: 'route', fraction: 0, moving: false });
  });

  it('runs the route on the same share that moves the timeline and the distance left', () => {
    const halfway = inTransit(30);
    const leg = vehicleLeg(halfway, NOW);

    expect(leg.leg).toBe('route');
    expect(leg.fraction).toBeCloseTo(0.5, 6);
    expect(leg.moving).toBe(true);
    // Half the route walked is half the route left; the two figures are one figure.
    expect(remainingKm(halfway, NOW)).toBeCloseTo(20, 6);
  });

  it('is at the destination once the timeline reads delivered, and stationary', () => {
    const done = { status: STATUS.DELIVERED, route: { durationSeconds: 3600, distanceKm: 40 } };
    expect(vehicleLeg(done, NOW)).toEqual({ leg: 'route', fraction: 1, moving: false });
    expect(remainingKm(done, NOW)).toBe(0);
  });

  it('has the marker past the "Arriving" mark exactly when that row goes live', () => {
    const stageState = (order, key) => journeyStages(order, NOW).find((stage) => stage.key === key).state;

    const midway = inTransit(20);
    expect(stageState(midway, 'ARRIVING')).toBe('todo');

    const nearlyThere = inTransit(50);
    expect(stageState(nearlyThere, 'ARRIVING')).toBe('current');
    // Both sides of that switch come from transitShare, so the marker is always
    // further along when the row is live than when it is not.
    expect(vehicleLeg(nearlyThere, NOW).fraction).toBeGreaterThan(vehicleLeg(midway, NOW).fraction);
  });

  it('sits still for an order with no agent, and for a cancelled one', () => {
    expect(vehicleLeg({ status: STATUS.PENDING }, NOW).moving).toBe(false);
    expect(vehicleLeg({ status: STATUS.CANCELLED, courier: { lat: 1, lng: 2 } }, NOW)).toEqual({
      leg: 'idle',
      fraction: 0,
      moving: false
    });
  });
});

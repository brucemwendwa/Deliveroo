import {
  STATUS,
  allowedTransitions,
  blockedReason,
  canCancel,
  canChangeDestination,
  currentLocationLabel,
  isArriving,
  isComplete,
  isTerminal,
  journeyStages,
  progressFor,
  remainingKm,
  remainingSeconds
} from '../lib/orderStatus';

const order = (status) => ({ id: 'DLV-10000', status });

describe('order status guards', () => {
  it('allows cancelling and re-routing while the parcel is still moving', () => {
    for (const status of [STATUS.PENDING, STATUS.ASSIGNED, STATUS.PICKED_UP, STATUS.IN_TRANSIT]) {
      expect(canCancel(order(status))).toBe(true);
      expect(canChangeDestination(order(status))).toBe(true);
      expect(blockedReason(order(status))).toBeNull();
    }
  });

  it('blocks both actions once delivered — §16 and §17', () => {
    const delivered = order(STATUS.DELIVERED);
    expect(canCancel(delivered)).toBe(false);
    expect(canChangeDestination(delivered)).toBe(false);
    expect(blockedReason(delivered)).toMatch(/already been completed/i);
  });

  it('blocks both actions once cancelled', () => {
    const cancelled = order(STATUS.CANCELLED);
    expect(canCancel(cancelled)).toBe(false);
    expect(canChangeDestination(cancelled)).toBe(false);
    expect(blockedReason(cancelled)).toMatch(/cancelled/i);
  });

  it('treats a missing order as blocked rather than throwing', () => {
    expect(canCancel(null)).toBe(false);
    expect(canChangeDestination(undefined)).toBe(false);
  });

  it('only offers forward transitions, plus cancellation', () => {
    expect(allowedTransitions(STATUS.PENDING)).toEqual([
      STATUS.ASSIGNED,
      STATUS.PICKED_UP,
      STATUS.IN_TRANSIT,
      STATUS.DELIVERED,
      STATUS.CANCELLED
    ]);
    expect(allowedTransitions(STATUS.IN_TRANSIT)).toEqual([STATUS.DELIVERED, STATUS.CANCELLED]);
    expect(allowedTransitions(STATUS.DELIVERED)).toEqual([]);
    expect(allowedTransitions(STATUS.CANCELLED)).toEqual([]);
  });

  it('marks earlier timeline steps complete', () => {
    expect(isComplete(STATUS.IN_TRANSIT, STATUS.PICKED_UP)).toBe(true);
    expect(isComplete(STATUS.IN_TRANSIT, STATUS.DELIVERED)).toBe(false);
    expect(isTerminal(STATUS.DELIVERED)).toBe(true);
    expect(isTerminal(STATUS.PENDING)).toBe(false);
  });
});

// §25 — the customer-facing journey view, derived from the six statuses above.
describe('journey stages', () => {
  const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
  const inTransit = (minutesAgo, journeyMinutes = 60) => ({
    status: STATUS.IN_TRANSIT,
    route: { distanceKm: 100, durationSeconds: journeyMinutes * 60 },
    pickup: { name: 'Nairobi' },
    destination: { name: 'Mombasa' },
    history: [{ status: STATUS.IN_TRANSIT, at: new Date(NOW - minutesAgo * 60_000).toISOString() }]
  });

  const stageState = (order, key) => journeyStages(order, NOW).find((stage) => stage.key === key).state;

  it('shows seven steps without adding a single status to the API', () => {
    expect(journeyStages({ status: STATUS.PENDING }, NOW).map((stage) => stage.key)).toEqual([
      'REQUESTED',
      'ASSIGNED',
      'PICKED_UP',
      'DISPATCHED',
      'IN_TRANSIT',
      'ARRIVING',
      'DELIVERED'
    ]);
  });

  it('marks the steps behind the current one done, and the rest to come', () => {
    const order = { status: STATUS.PICKED_UP };
    expect(stageState(order, 'REQUESTED')).toBe('done');
    expect(stageState(order, 'PICKED_UP')).toBe('current');
    expect(stageState(order, 'IN_TRANSIT')).toBe('todo');
  });

  it('moves from in transit to arriving on the clock, not on an admin click', () => {
    const early = inTransit(6);
    expect(stageState(early, 'DISPATCHED')).toBe('done');
    expect(stageState(early, 'IN_TRANSIT')).toBe('current');
    expect(stageState(early, 'ARRIVING')).toBe('todo');
    expect(isArriving(early, NOW)).toBe(false);

    const nearlyThere = inTransit(58);
    expect(stageState(nearlyThere, 'IN_TRANSIT')).toBe('done');
    expect(stageState(nearlyThere, 'ARRIVING')).toBe('current');
    expect(isArriving(nearlyThere, NOW)).toBe(true);
  });

  it('counts down the time and the distance left as the journey runs', () => {
    const start = inTransit(0);
    const halfway = inTransit(30);

    expect(remainingSeconds(halfway, NOW)).toBeLessThan(remainingSeconds(start, NOW));
    expect(remainingKm(halfway, NOW)).toBeLessThan(remainingKm(start, NOW));
    expect(progressFor(halfway, NOW)).toBeGreaterThan(progressFor(start, NOW));
    // Nothing is ever quite there until it is delivered.
    expect(progressFor(inTransit(600), NOW)).toBeLessThan(100);
    expect(remainingSeconds({ status: STATUS.DELIVERED, route: { durationSeconds: 600 } }, NOW)).toBe(0);
  });

  it('says where the parcel is, preferring what dispatch actually reported', () => {
    const order = inTransit(10);
    expect(currentLocationLabel(order)).toBe('En route to Mombasa');
    expect(currentLocationLabel({ ...order, presentLocation: { label: 'Voi' } })).toBe('Voi');
    expect(currentLocationLabel({ ...order, status: STATUS.ASSIGNED })).toBe('Nairobi');
  });
});

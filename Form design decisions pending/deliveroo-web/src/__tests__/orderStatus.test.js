import {
  STATUS,
  allowedTransitions,
  blockedReason,
  canCancel,
  canChangeDestination,
  isComplete,
  isTerminal
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

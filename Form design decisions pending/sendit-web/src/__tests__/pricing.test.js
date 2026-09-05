import {
  MINIMUM_FARE,
  billableWeightKg,
  formatDelta,
  formatDuration,
  formatKes,
  formatKm,
  priceOrder,
  quote,
  weightDiscrepancy
} from '../lib/pricing';

describe('pricing', () => {
  it('reproduces the worked example: 3 kg over 12.4 km costs KES 510', () => {
    // Road charges KES 2.5 a kilo, so weight is a rounding error next to distance
    // on a city hop. Distance is what a road fare is really made of.
    const result = quote({ weightKg: 3, distanceKm: 12.4 });
    expect(result.weightCost).toBeCloseTo(7.5);
    expect(result.distanceCost).toBeCloseTo(496);
    expect(result.total).toBe(510);
  });

  it('applies the minimum fare to very short, very light deliveries', () => {
    expect(quote({ weightKg: 0.5, distanceKm: 0.5 }).total).toBe(MINIMUM_FARE);
  });

  it('rounds up to the nearest ten rather than down', () => {
    // 1 kg (2.5) + 1.1 km (44) = 46.5 → 50, never 40.
    expect(quote({ weightKg: 1, distanceKm: 1.1 }).subtotal).toBeCloseTo(46.5);
    expect(quote({ weightKg: 10, distanceKm: 10 }).total).toBe(430);
  });

  it('treats missing or negative input as zero instead of producing NaN', () => {
    expect(quote().total).toBe(MINIMUM_FARE);
    expect(quote({ weightKg: -4, distanceKm: -2 }).subtotal).toBe(0);
  });

  it('grows with both weight and distance', () => {
    const light = quote({ weightKg: 1, distanceKm: 10 }).total;
    expect(quote({ weightKg: 5, distanceKm: 10 }).total).toBeGreaterThan(light);
    expect(quote({ weightKg: 1, distanceKm: 40 }).total).toBeGreaterThan(light);
  });

  it('formats money, distance and duration the way the UI prints them', () => {
    expect(formatKes(650)).toBe('KES 650');
    expect(formatKm(12.4)).toBe('12.4 km');
    expect(formatDuration(2100)).toBe('35 min');
    expect(formatDuration(4320)).toBe('1 h 12 min');
  });
});

describe('declared vs verified weight', () => {
  it('bills the declared weight only until the parcel has been weighed', () => {
    expect(billableWeightKg({ weightKg: 3 })).toBe(3);
    expect(billableWeightKg({ weightKg: 3, verifiedWeightKg: null })).toBe(3);
    expect(billableWeightKg({ weightKg: 3, verifiedWeightKg: 7.2 })).toBe(7.2);
  });

  it('marks the quote as an estimate until an admin has measured it', () => {
    const route = { distanceKm: 12.4 };
    expect(priceOrder({ parcel: { weightKg: 3 }, route })).toMatchObject({ total: 510, basis: 'estimated' });
    expect(priceOrder({ parcel: { weightKg: 3, verifiedWeightKg: 7.2 }, route })).toMatchObject({
      total: 520,
      basis: 'verified',
      declaredWeightKg: 3
    });
  });

  it('flags a declaration that is under by more than the allowance', () => {
    expect(weightDiscrepancy({ weightKg: 3 })).toBeNull();
    // Within 20% of 3 kg.
    expect(weightDiscrepancy({ weightKg: 3, verifiedWeightKg: 3.4 }).flagged).toBe(false);
    expect(weightDiscrepancy({ weightKg: 3, verifiedWeightKg: 7.2 }).flagged).toBe(true);
    // Over-declaring costs the customer, not us — never flagged.
    expect(weightDiscrepancy({ weightKg: 10, verifiedWeightKg: 2 }).flagged).toBe(false);
  });

  it('keeps the small-parcel allowance absolute, not proportional', () => {
    // 20% of 0.5 kg is 0.1 kg, which every scale would trip; the 0.5 kg floor wins.
    expect(weightDiscrepancy({ weightKg: 0.5, verifiedWeightKg: 0.9 }).flagged).toBe(false);
    expect(weightDiscrepancy({ weightKg: 0.5, verifiedWeightKg: 4 }).flagged).toBe(true);
  });

  it('signs the delta, because the direction is the point', () => {
    expect(formatDelta(4.2)).toBe('+4.2 kg');
    expect(formatDelta(-0.8)).toBe('−0.8 kg');
    expect(formatDelta(0)).toBe('0.0 kg');
  });
});

import { MINIMUM_FARE, formatDuration, formatKes, formatKm, quote } from '../lib/pricing';

describe('pricing', () => {
  it('reproduces the specified worked example: 3 kg over 12.4 km costs KES 650', () => {
    const result = quote({ weightKg: 3, distanceKm: 12.4 });
    expect(result.weightCost).toBe(150);
    expect(result.distanceCost).toBeCloseTo(496);
    expect(result.total).toBe(650);
  });

  it('applies the minimum fare to very short, very light deliveries', () => {
    expect(quote({ weightKg: 0.5, distanceKm: 0.5 }).total).toBe(MINIMUM_FARE);
  });

  it('rounds up to the nearest ten rather than down', () => {
    // 1 kg (50) + 1.1 km (44) = 94 → 100, never 90.
    expect(quote({ weightKg: 1, distanceKm: 1.1 }).subtotal).toBeCloseTo(94);
    expect(quote({ weightKg: 10, distanceKm: 10 }).total).toBe(900);
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

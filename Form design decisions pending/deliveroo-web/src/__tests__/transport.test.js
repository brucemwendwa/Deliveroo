import {
  DEFAULT_FLEET,
  FLEET_STATUS,
  PRIORITY,
  TRANSPORT,
  chargeableWeightKg,
  defaultModeFor,
  estimateDurationSeconds,
  modeAvailability,
  quoteTransport,
  transportOptions,
  volumetricWeightKg
} from '../lib/transport';
import { quote } from '../lib/pricing';

const NAIROBI = { name: 'Nairobi CBD', lat: -1.2864, lng: 36.8172 };
const WESTLANDS = { name: 'Westlands', lat: -1.2673, lng: 36.8065 };
const MOMBASA = { name: 'Mombasa', lat: -4.0435, lng: 39.6682 };

const localRoute = { distanceKm: 8.2, durationSeconds: 22 * 60 };
const coastRoute = { distanceKm: 485, durationSeconds: 7.2 * 3600 };

const optionsFor = (pickup, destination, route, extra = {}) =>
  Object.fromEntries(
    transportOptions({ pickup, destination, route, parcel: { weightKg: 3 }, ...extra }).map((option) => [
      option.mode,
      option
    ])
  );

describe('mode eligibility (§25)', () => {
  it('offers road, motorbike and drone across town, and explains the two it cannot offer', () => {
    const options = optionsFor(NAIROBI, WESTLANDS, localRoute);

    expect(options.ROAD.available).toBe(true);
    expect(options.MOTORBIKE.available).toBe(true);
    expect(options.DRONE.available).toBe(true);
    expect(options.AIR.available).toBe(false);
    expect(options.SHIP.available).toBe(false);

    // §25 requires a reason, not just a disabled card.
    expect(options.AIR.reason).toMatch(/air freight starts at/i);
    expect(options.SHIP.reason).toMatch(/sea freight starts at/i);
  });

  it('offers road, air and sea to the coast, but neither a bike nor a drone', () => {
    const options = optionsFor(NAIROBI, MOMBASA, coastRoute);

    expect(options.ROAD.available).toBe(true);
    expect(options.AIR.available).toBe(true);
    expect(options.SHIP.available).toBe(true);
    expect(options.MOTORBIKE.available).toBe(false);
    expect(options.MOTORBIKE.reason).toMatch(/covers routes up to 45 km/i);
    expect(options.DRONE.available).toBe(false);
    expect(options.DRONE.reason).toMatch(/covers routes up to 30 km/i);
    // Sea freight names the port it would sail from.
    expect(options.SHIP.via).toBe('Mombasa');
  });

  it('will not sail a route that reaches no port, however long it is', () => {
    const inland = { name: 'Kampala', lat: 0.3476, lng: 32.5825 };
    const options = optionsFor(NAIROBI, inland, { distanceKm: 660, durationSeconds: 10 * 3600 });

    expect(options.SHIP.available).toBe(false);
    expect(options.SHIP.reason).toMatch(/runs between ports/i);
    expect(options.AIR.available).toBe(true);
  });

  it('turns the drone away on weight and on size, separately', () => {
    const heavy = modeAvailability({ mode: TRANSPORT.DRONE, distanceKm: 8, weightKg: 9 });
    expect(heavy.available).toBe(false);
    expect(heavy.reason).toMatch(/up to 5 kg/i);

    const bulky = modeAvailability({ mode: TRANSPORT.DRONE, distanceKm: 8, weightKg: 2, longestSideCm: 80 });
    expect(bulky.available).toBe(false);
    expect(bulky.reason).toMatch(/45 cm on the longest side/i);
  });

  it('withdraws a mode the console has taken offline (§26)', () => {
    const options = optionsFor(NAIROBI, WESTLANDS, localRoute, {
      fleet: { ...DEFAULT_FLEET, [TRANSPORT.DRONE]: FLEET_STATUS.OFFLINE }
    });

    expect(options.DRONE.available).toBe(false);
    expect(options.DRONE.reason).toMatch(/offline right now/i);
    expect(options.ROAD.available).toBe(true);
  });

  it('still books a busy mode, and says the wait is longer', () => {
    const busy = optionsFor(NAIROBI, WESTLANDS, localRoute, {
      fleet: { ...DEFAULT_FLEET, [TRANSPORT.DRONE]: FLEET_STATUS.BUSY }
    });
    const idle = optionsFor(NAIROBI, WESTLANDS, localRoute);

    expect(busy.DRONE.available).toBe(true);
    expect(busy.DRONE.busy).toBe(true);
    expect(busy.DRONE.quote.durationSeconds).toBeGreaterThan(idle.DRONE.quote.durationSeconds);
  });
});

describe('multi-modal pricing (§25)', () => {
  it('leaves the original road tariff exactly as it was', () => {
    // The §9 worked example, now going through the mode catalogue.
    expect(quoteTransport({ mode: TRANSPORT.ROAD, weightKg: 3, distanceKm: 12.4 })).toMatchObject({
      baseFare: 0,
      weightCost: 150,
      total: 650
    });
    expect(quote({ weightKg: 3, distanceKm: 12.4 }).total).toBe(650);
  });

  it('tapers road past the city band, because 40/km is a cross-town rate', () => {
    // Inside the band, nothing changes; beyond it the line-haul rate applies.
    expect(quoteTransport({ mode: TRANSPORT.ROAD, distanceKm: 50 }).distanceCost).toBe(2000);
    expect(quoteTransport({ mode: TRANSPORT.ROAD, distanceKm: 100 }).distanceCost).toBe(2000 + 50 * 6);
  });

  it('ranks the modes the way their economics do over a long haul', () => {
    const options = optionsFor(NAIROBI, MOMBASA, coastRoute);

    // Sea is the cheapest and the slowest; air the fastest and dearest; road between.
    expect(options.SHIP.quote.total).toBeLessThan(options.ROAD.quote.total);
    expect(options.ROAD.quote.total).toBeLessThan(options.AIR.quote.total);
    expect(options.AIR.quote.durationSeconds).toBeLessThan(options.ROAD.quote.durationSeconds);
    expect(options.ROAD.quote.durationSeconds).toBeLessThan(options.SHIP.quote.durationSeconds);
  });

  it('makes sea the cheap option for heavy freight and road the cheap one for a light parcel', () => {
    const light = optionsFor(NAIROBI, MOMBASA, coastRoute);
    const heavy = transportOptions({
      pickup: NAIROBI,
      destination: MOMBASA,
      route: coastRoute,
      parcel: { weightKg: 200 }
    });

    expect(defaultModeFor(Object.values(light))).toBe(TRANSPORT.SHIP);
    expect(defaultModeFor(heavy)).toBe(TRANSPORT.SHIP);
    // …and across town a bike undercuts the van it replaces, which is the whole
    // reason a small local parcel goes out on one.
    expect(defaultModeFor(Object.values(optionsFor(NAIROBI, WESTLANDS, localRoute)))).toBe(
      TRANSPORT.MOTORBIKE
    );
  });

  it('charges more and arrives sooner on express', () => {
    const standard = quoteTransport({ mode: TRANSPORT.AIR, weightKg: 3, distanceKm: 485 });
    const express = quoteTransport({
      mode: TRANSPORT.AIR,
      weightKg: 3,
      distanceKm: 485,
      priority: PRIORITY.EXPRESS
    });

    expect(express.total).toBeGreaterThan(standard.total);
    expect(express.priorityCost).toBeGreaterThan(0);
    expect(express.durationSeconds).toBeLessThan(standard.durationSeconds);
  });

  it('never quotes below the floor a mode sets for itself', () => {
    expect(quoteTransport({ mode: TRANSPORT.DRONE, weightKg: 0.2, distanceKm: 0.4 }).total).toBe(700);
    expect(quoteTransport({ mode: TRANSPORT.ROAD, weightKg: 0.2, distanceKm: 0.4 }).total).toBe(200);
  });

  it('prefers the measured driving time to an average speed, for road only', () => {
    const measured = estimateDurationSeconds({ mode: TRANSPORT.ROAD, distanceKm: 12.4, durationSeconds: 2100 });
    expect(measured).toBe(2100 + 15 * 60);

    // A flight does not care how long the drive would have taken.
    const flight = estimateDurationSeconds({ mode: TRANSPORT.AIR, distanceKm: 485, durationSeconds: 2100 });
    expect(flight).toBeGreaterThan(2 * 3600);
    expect(flight).toBeLessThan(2.6 * 3600);
  });
});

describe('parcel measurements', () => {
  it('charges the space a light, bulky parcel occupies', () => {
    expect(volumetricWeightKg({ lengthCm: 60, widthCm: 40, heightCm: 30 })).toBe(14.4);
    expect(chargeableWeightKg({ weightKg: 2, lengthCm: 60, widthCm: 40, heightCm: 30 })).toBe(14.4);
  });

  it('ignores dimensions when the parcel is heavier than its volume suggests', () => {
    expect(chargeableWeightKg({ weightKg: 30, lengthCm: 20, widthCm: 20, heightCm: 20 })).toBe(30);
  });

  it('treats missing dimensions as no volumetric charge at all', () => {
    expect(volumetricWeightKg({})).toBe(0);
    expect(chargeableWeightKg({ weightKg: 3 })).toBe(3);
  });
});

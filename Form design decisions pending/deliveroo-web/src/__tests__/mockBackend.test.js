import {
  MOCK_OTP,
  assignAgent,
  cancelOrder,
  changeDestination,
  createOrder,
  getFleet,
  getOrder,
  setFleetStatus,
  subscribe,
  updateCourierPosition,
  updateOrderStatus,
  updatePresentLocation,
  verifyOtp,
  verifyWeight
} from '../api/mockBackend';
import { STATUS } from '../lib/orderStatus';
import { FLEET_STATUS, TRANSPORT } from '../lib/transport';

const PICKUP = { id: 'a', label: 'Westlands · Nairobi', name: 'Westlands', lat: -1.2673, lng: 36.8065 };
const DESTINATION = { id: 'b', label: 'Kilimani · Nairobi', name: 'Kilimani', lat: -1.2921, lng: 36.7833 };

const draft = {
  userId: 'usr_test',
  pickup: PICKUP,
  destination: DESTINATION,
  route: { distanceKm: 12.4, durationSeconds: 2100, coordinates: [], estimated: false },
  parcel: { weightKg: 3, description: 'Documents' },
  sender: { name: 'Sender', phone: '+254700000001' },
  recipient: { name: 'Recipient', phone: '+254700000002' }
};

beforeEach(() => {
  localStorage.clear();
});

describe('mock backend', () => {
  it('prices an order on creation from its own weight and distance', async () => {
    const order = await createOrder(draft);
    expect(order.id).toMatch(/^DLV-\d{5}$/);
    expect(order.status).toBe(STATUS.PENDING);
    expect(order.pricing.total).toBe(650);
  });

  it('assigns a pickup agent the moment the order moves off pending', async () => {
    const order = await createOrder(draft);
    const assigned = await updateOrderStatus(order.id, STATUS.ASSIGNED);

    expect(assigned.courier).toMatchObject({
      name: expect.any(String),
      vehicle: expect.any(String),
      plate: expect.any(String),
      distanceKm: expect.any(Number),
      etaMinutes: expect.any(Number)
    });
    // §25 — the agent is dispatched *towards* the pickup, so they start short of it.
    // The marker sits exactly as far out as the distance the customer is quoted:
    // one degree of latitude is ~111 km.
    const offsetKm = Math.abs(assigned.courier.lat - PICKUP.lat) * 111;
    expect(offsetKm).toBeLessThanOrEqual(assigned.courier.distanceKm + 0.01);
    expect(assigned.courier.distanceKm).toBeLessThanOrEqual(4);
  });

  it('notifies subscribers on every write — this is what drives live tracking (§18)', async () => {
    const order = await createOrder(draft);
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    await updateOrderStatus(order.id, STATUS.ASSIGNED);
    expect(listener).toHaveBeenCalled();

    const callsAfterStatus = listener.mock.calls.length;
    await updateCourierPosition(order.id, { lat: -1.28, lng: 36.79 });
    expect(listener.mock.calls.length).toBeGreaterThan(callsAfterStatus);

    unsubscribe();
    await updateOrderStatus(order.id, STATUS.PICKED_UP);
    expect(listener.mock.calls.length).toBe(listener.mock.calls.length);
  });

  it('re-prices when the destination changes mid-flight (§16)', async () => {
    const owner = await verifyOtp({ identifier: 'owner@one.co', code: MOCK_OTP });
    const order = await createOrder({ ...draft, userId: owner.id });
    await updateOrderStatus(order.id, STATUS.ASSIGNED);

    const updated = await changeDestination(order.id, {
      destination: { ...DESTINATION, label: 'Karen · Nairobi', name: 'Karen' },
      route: { distanceKm: 24.8, durationSeconds: 3600, coordinates: [], estimated: false }
    });

    expect(updated.destination.name).toBe('Karen');
    // 3 kg (150) + 24.8 km (992) = 1142 → 1150
    expect(updated.pricing.total).toBe(1150);
  });

  it('refuses to cancel or re-route a delivered order (§16, §17)', async () => {
    const order = await createOrder(draft);
    for (const status of [STATUS.ASSIGNED, STATUS.PICKED_UP, STATUS.IN_TRANSIT, STATUS.DELIVERED]) {
      await updateOrderStatus(order.id, status);
    }

    await expect(cancelOrder(order.id)).rejects.toThrow(/no longer be cancelled/i);
    await expect(
      changeDestination(order.id, { destination: DESTINATION, route: draft.route })
    ).rejects.toThrow(/no longer be changed/i);
  });

  it('records a cancellation in the order history', async () => {
    // §17 — cancelling is the owner's to do, so the order is booked under a real session.
    const owner = await verifyOtp({ identifier: 'owner@one.co', code: MOCK_OTP });
    const order = await createOrder({ ...draft, userId: owner.id });
    const cancelled = await cancelOrder(order.id);

    expect(cancelled.status).toBe(STATUS.CANCELLED);
    expect(cancelled.history.map((entry) => entry.status)).toEqual([STATUS.PENDING, STATUS.CANCELLED]);
    expect((await getOrder(order.id)).status).toBe(STATUS.CANCELLED);
  });

  it('refuses to let anyone but the owner cancel or re-route a delivery (§17)', async () => {
    // Ids are derived from the identifier, so these two must differ in their tail.
    const owner = await verifyOtp({ identifier: 'owner@one.co', code: MOCK_OTP });
    const order = await createOrder({ ...draft, userId: owner.id });

    await verifyOtp({ identifier: 'other@two.co', code: MOCK_OTP });
    await expect(cancelOrder(order.id)).rejects.toThrow(/only the customer who booked/i);
    await expect(
      changeDestination(order.id, { destination: DESTINATION, route: draft.route })
    ).rejects.toThrow(/only the customer who booked/i);

    // Back as the owner, both work.
    await verifyOtp({ identifier: 'owner@one.co', code: MOCK_OTP });
    expect((await cancelOrder(order.id)).status).toBe(STATUS.CANCELLED);
  });

  // §25 — the on-demand half: the customer asks, the platform matches.
  describe('dispatch', () => {
    it('matches a pending order with a pickup agent', async () => {
      const order = await createOrder(draft);
      const assigned = await assignAgent(order.id);

      expect(assigned.status).toBe(STATUS.ASSIGNED);
      expect(assigned.courier).toMatchObject({
        name: expect.any(String),
        vehicle: expect.any(String),
        plate: expect.any(String),
        distanceKm: expect.any(Number),
        etaMinutes: expect.any(Number)
      });
    });

    it('sends a rider, on a bike, to a motorbike delivery', async () => {
      // §25 — the bike carries this one the whole way, so the agent who collects it
      // has to be someone who can. Run it enough times to catch a random pick that
      // reaches outside the rider pool.
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const order = await createOrder({ ...draft, transport: { mode: TRANSPORT.MOTORBIKE } });
        const { courier } = await assignAgent(order.id);
        expect(courier.vehicleMode).toBe(TRANSPORT.MOTORBIKE);
      }
    });

    it('prices and stores a motorbike delivery as one', async () => {
      const order = await createOrder({ ...draft, transport: { mode: TRANSPORT.MOTORBIKE } });

      expect(order.transport.mode).toBe(TRANSPORT.MOTORBIKE);
      // The bike's own tariff, not the van's — road would charge 650 for this parcel.
      expect(order.pricing.mode).toBe(TRANSPORT.MOTORBIKE);
      expect(order.pricing.total).toBeLessThan(650);
      expect(order.pricing.baseFare).toBe(60);
    });

    it('is idempotent, so a retry or a second tab cannot double-assign', async () => {
      const order = await createOrder(draft);
      const first = await assignAgent(order.id);
      const second = await assignAgent(order.id);

      expect(second.courier).toEqual(first.courier);
      expect(second.history.filter((entry) => entry.status === STATUS.ASSIGNED)).toHaveLength(1);
    });

    it('will not drag an order that has already moved on back to assigned', async () => {
      const order = await createOrder(draft);
      await updateOrderStatus(order.id, STATUS.ASSIGNED);
      await updateOrderStatus(order.id, STATUS.PICKED_UP);

      expect((await assignAgent(order.id)).status).toBe(STATUS.PICKED_UP);
    });
  });

  // §26 — the console's two staff-only levers.
  describe('dispatch console', () => {
    const signInAsAdmin = () => verifyOtp({ identifier: 'admin@deliveroo.co', code: MOCK_OTP });

    it('records where the parcel currently is, staff only', async () => {
      const order = await createOrder(draft);
      await expect(updatePresentLocation(order.id, { label: 'Voi' })).rejects.toThrow(/only staff/i);

      await signInAsAdmin();
      const updated = await updatePresentLocation(order.id, { label: 'Voi' });
      expect(updated.presentLocation).toMatchObject({ label: 'Voi', at: expect.any(String) });
    });

    it('opens with every mode available, and only staff may change that', async () => {
      expect(await getFleet()).toMatchObject({ [TRANSPORT.DRONE]: FLEET_STATUS.AVAILABLE });
      await expect(setFleetStatus(TRANSPORT.DRONE, FLEET_STATUS.OFFLINE)).rejects.toThrow(/only staff/i);

      await signInAsAdmin();
      await setFleetStatus(TRANSPORT.DRONE, FLEET_STATUS.OFFLINE);
      expect((await getFleet())[TRANSPORT.DRONE]).toBe(FLEET_STATUS.OFFLINE);
      // The rest of the network is untouched.
      expect((await getFleet())[TRANSPORT.ROAD]).toBe(FLEET_STATUS.AVAILABLE);
    });

    it('refuses an availability it does not recognise', async () => {
      await signInAsAdmin();
      await expect(setFleetStatus('TELEPORT', FLEET_STATUS.AVAILABLE)).rejects.toThrow(/unknown transport mode/i);
      await expect(setFleetStatus(TRANSPORT.AIR, 'MAYBE')).rejects.toThrow(/unknown availability/i);
    });
  });

  it('rejects backwards status transitions', async () => {
    const order = await createOrder(draft);
    await updateOrderStatus(order.id, STATUS.IN_TRANSIT);
    await expect(updateOrderStatus(order.id, STATUS.ASSIGNED)).rejects.toThrow(/Cannot move/i);
  });

  it('grants the admin flag only to the admin address', async () => {
    const customer = await verifyOtp({ identifier: 'someone@example.com', code: MOCK_OTP });
    expect(customer.isAdmin).toBe(false);

    const admin = await verifyOtp({ identifier: 'admin@deliveroo.co', code: MOCK_OTP });
    expect(admin.isAdmin).toBe(true);
  });

  it('rejects a wrong verification code', async () => {
    await expect(verifyOtp({ identifier: 'someone@example.com', code: '123456' })).rejects.toThrow(/not right/i);
  });
  // §9/§18 — the customer's weight is a declaration; the fare is settled on our scale.
  describe('weight verification', () => {
    const signInAsAdmin = () => verifyOtp({ identifier: 'admin@deliveroo.co', code: MOCK_OTP });
    const signInAsCustomer = () => verifyOtp({ identifier: 'someone@example.com', code: MOCK_OTP });

    it('prices a new order as an estimate off the declared weight', async () => {
      const order = await createOrder(draft);
      expect(order.parcel.verifiedWeightKg).toBeNull();
      expect(order.pricing.basis).toBe('estimated');
    });

    it('refuses a customer trying to record a weight — this is the whole point', async () => {
      const order = await createOrder(draft);
      await signInAsCustomer();
      await expect(verifyWeight(order.id, { weightKg: 1 })).rejects.toThrow(/only staff/i);

      // …and with no session at all.
      localStorage.removeItem('deliveroo.session');
      await expect(verifyWeight(order.id, { weightKg: 1 })).rejects.toThrow(/only staff/i);
      expect((await getOrder(order.id)).parcel.verifiedWeightKg).toBeNull();
    });

    it('re-prices on the measured weight and keeps the original estimate', async () => {
      const order = await createOrder(draft);
      await signInAsAdmin();
      // Declared 3 kg (KES 650); it is really 7.2 kg.
      const weighed = await verifyWeight(order.id, { weightKg: 7.2 });

      expect(weighed.parcel.verifiedWeightKg).toBe(7.2);
      expect(weighed.parcel.weightKg).toBe(3);
      expect(weighed.parcel.weighedBy).toBe('admin@deliveroo.co');
      // 7.2 kg (360) + 12.4 km (496) = 856 → 860
      expect(weighed.pricing.total).toBe(860);
      expect(weighed.pricing.basis).toBe('verified');
      expect(weighed.quotedPricing.total).toBe(650);
    });

    it('bills the measured weight when the destination changes afterwards (§16)', async () => {
      const order = await createOrder(draft);
      await signInAsAdmin();
      await verifyWeight(order.id, { weightKg: 7.2 });

      const rerouted = await changeDestination(order.id, {
        destination: { ...DESTINATION, label: 'Karen · Nairobi', name: 'Karen' },
        route: { distanceKm: 24.8, durationSeconds: 3600, coordinates: [], estimated: false }
      });

      // 7.2 kg (360) + 24.8 km (992) = 1352 → 1360, not the 1150 the declaration would give.
      expect(rerouted.pricing.total).toBe(1360);
      expect(rerouted.pricing.basis).toBe('verified');
    });

    it('closes the scale once the parcel is in transit', async () => {
      const order = await createOrder(draft);
      await signInAsAdmin();
      await updateOrderStatus(order.id, STATUS.IN_TRANSIT);

      await expect(verifyWeight(order.id, { weightKg: 7.2 })).rejects.toThrow(/in transit/i);
    });

    it('rejects weights that are not a reading off a scale', async () => {
      const order = await createOrder(draft);
      await signInAsAdmin();

      await expect(verifyWeight(order.id, { weightKg: 0 })).rejects.toThrow(/kilograms/i);
      await expect(verifyWeight(order.id, { weightKg: -4 })).rejects.toThrow(/kilograms/i);
      await expect(verifyWeight(order.id, { weightKg: 'heavy' })).rejects.toThrow(/kilograms/i);
      await expect(verifyWeight(order.id, { weightKg: 5000 })).rejects.toThrow(/cannot carry/i);
    });

    it('compares a re-weigh against the original estimate, not the last correction', async () => {
      const order = await createOrder(draft);
      await signInAsAdmin();
      await verifyWeight(order.id, { weightKg: 7.2 });
      const corrected = await verifyWeight(order.id, { weightKg: 6 });

      expect(corrected.pricing.total).toBe(800);
      expect(corrected.quotedPricing.total).toBe(650);
    });
  });
});

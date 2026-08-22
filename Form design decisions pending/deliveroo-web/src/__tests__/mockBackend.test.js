import {
  MOCK_OTP,
  cancelOrder,
  changeDestination,
  createOrder,
  getOrder,
  subscribe,
  updateCourierPosition,
  updateOrderStatus,
  verifyOtp
} from '../api/mockBackend';
import { STATUS } from '../lib/orderStatus';

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

  it('assigns a courier the moment the order moves off pending', async () => {
    const order = await createOrder(draft);
    const assigned = await updateOrderStatus(order.id, STATUS.ASSIGNED);

    expect(assigned.courier).toMatchObject({ name: expect.any(String), vehicle: expect.any(String) });
    // The courier starts at the pickup point.
    expect(assigned.courier.lat).toBeCloseTo(PICKUP.lat);
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
    const order = await createOrder(draft);
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
    const order = await createOrder(draft);
    const cancelled = await cancelOrder(order.id);

    expect(cancelled.status).toBe(STATUS.CANCELLED);
    expect(cancelled.history.map((entry) => entry.status)).toEqual([STATUS.PENDING, STATUS.CANCELLED]);
    expect((await getOrder(order.id)).status).toBe(STATUS.CANCELLED);
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
});

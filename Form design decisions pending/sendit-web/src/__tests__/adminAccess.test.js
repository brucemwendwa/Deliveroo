// §27 — the rules the admin portal is built on, tested where they are enforced.
//
// The console can hide a button; only the backend can refuse the call behind it.
// Everything here goes straight at the data layer, with no screen involved.

import {
  MOCK_OTP,
  assignAgent,
  createOrder,
  getSettings,
  listAuditLog,
  listCouriers,
  listUsers,
  resetDemoData,
  seedIfEmpty,
  setCourierShift,
  setUserRole,
  setUserSuspended,
  updateOrderStatus,
  updatePresentLocation,
  updateSettings,
  userIdFor,
  verifyOtp
} from '../api/mockBackend';
import { ROLE } from '../lib/roles';
import { STATUS } from '../lib/orderStatus';
import { TRANSPORT } from '../lib/transport';

const draft = {
  userId: 'usr_test',
  pickup: { id: 'a', label: 'Westlands · Nairobi', name: 'Westlands', lat: -1.2673, lng: 36.8065 },
  destination: { id: 'b', label: 'Kilimani · Nairobi', name: 'Kilimani', lat: -1.2921, lng: 36.7833 },
  route: { distanceKm: 12.4, durationSeconds: 2100, coordinates: [], estimated: false },
  parcel: { weightKg: 3, description: 'Documents' },
  sender: { name: 'Sender', phone: '+254700000001' },
  recipient: { name: 'Recipient', phone: '+254700000002' }
};

const asAdmin = () => verifyOtp({ identifier: 'admin@sendit.co', code: MOCK_OTP });
const asCustomer = () => verifyOtp({ identifier: 'buyer@one.co', code: MOCK_OTP });

beforeEach(() => {
  localStorage.clear();
});

describe('roles', () => {
  it('makes the founding address an administrator and everyone else a customer', async () => {
    expect((await asCustomer()).role).toBe(ROLE.CUSTOMER);
    expect((await asAdmin()).role).toBe(ROLE.ADMIN);
  });

  it('remembers a promotion the next time that person signs in', async () => {
    const customer = await asCustomer();
    await asAdmin();
    await setUserRole(customer.id, ROLE.DISPATCHER);

    const back = await asCustomer();
    expect(back.role).toBe(ROLE.DISPATCHER);
    // The old boolean still answers the old question, so nothing that reads it breaks.
    expect(back.isAdmin).toBe(true);
  });

  it('lets a dispatcher run the board but not the directory', async () => {
    const colleague = await asCustomer();
    await asAdmin();
    await setUserRole(colleague.id, ROLE.DISPATCHER);
    const order = await createOrder(draft);

    await asCustomer();
    await expect(updateOrderStatus(order.id, STATUS.ASSIGNED)).resolves.toMatchObject({
      status: STATUS.ASSIGNED
    });
    await expect(updatePresentLocation(order.id, { label: 'Voi' })).resolves.toBeTruthy();
    await expect(setUserRole(colleague.id, ROLE.ADMIN)).rejects.toThrow(/only an administrator/i);
  });

  it('refuses dispatch to a customer, which is the whole point of the boundary', async () => {
    const order = await createOrder(draft);
    await asCustomer();
    await expect(updateOrderStatus(order.id, STATUS.ASSIGNED)).rejects.toThrow(/only staff/i);
    await expect(listUsers()).rejects.toThrow(/only staff/i);
  });

  it('will not let an administrator lock themselves out', async () => {
    const admin = await asAdmin();
    await expect(setUserRole(admin.id, ROLE.CUSTOMER)).rejects.toThrow(/your own role/i);
    await expect(setUserSuspended(admin.id, true)).rejects.toThrow(/your own account/i);
  });

  it('stops a suspended account signing in at all', async () => {
    const customer = await asCustomer();
    await asAdmin();
    await setUserSuspended(customer.id, true);

    await expect(asCustomer()).rejects.toThrow(/suspended/i);

    await asAdmin();
    await setUserSuspended(customer.id, false);
    await expect(asCustomer()).resolves.toMatchObject({ id: customer.id });
  });
});

describe('platform settings', () => {
  it('opens accepting bookings, and only an administrator may change that', async () => {
    expect((await getSettings()).acceptingOrders).toBe(true);
    await expect(updateSettings({ acceptingOrders: false })).rejects.toThrow(/only an administrator/i);
  });

  it('turns customers away while bookings are paused', async () => {
    await asAdmin();
    await updateSettings({ acceptingOrders: false });

    await asCustomer();
    await expect(createOrder(draft)).rejects.toThrow(/not accepting new bookings/i);

    await asAdmin();
    await updateSettings({ acceptingOrders: true });
    await expect(createOrder(draft)).resolves.toMatchObject({ status: STATUS.PENDING });
  });
});

describe('courier roster', () => {
  it('opens with everyone on shift', async () => {
    await asAdmin();
    const couriers = await listCouriers();
    expect(couriers.length).toBeGreaterThan(0);
    expect(couriers.every((courier) => courier.onShift)).toBe(true);
  });

  it('stops dispatch handing new work to someone who is off shift', async () => {
    await asAdmin();
    const riders = (await listCouriers()).filter((courier) => courier.vehicleMode === TRANSPORT.MOTORBIKE);
    const [keep, ...rest] = riders;
    for (const rider of rest) await setCourierShift(rider.id, false);

    const order = await createOrder({ ...draft, transport: { mode: TRANSPORT.MOTORBIKE, priority: 'STANDARD' } });
    const assigned = await assignAgent(order.id);
    expect(assigned.courier.name).toBe(keep.name);
  });

  it('refuses a courier it does not have', async () => {
    await asAdmin();
    await expect(setCourierShift('crr_nobody', false)).rejects.toThrow(/unknown courier/i);
  });
});

describe('audit trail', () => {
  it('records who moved the delivery, and what they changed it to', async () => {
    const order = await createOrder(draft);
    await asAdmin();
    await updateOrderStatus(order.id, STATUS.ASSIGNED);

    const [entry] = await listAuditLog();
    expect(entry).toMatchObject({
      actor: 'admin@sendit.co',
      actorRole: ROLE.ADMIN,
      action: 'ORDER_STATUS',
      target: order.id
    });
    expect(entry.detail).toMatch(/PENDING → ASSIGNED/);
  });

  it('is closed to customers — it is the record of what staff did to their parcel', async () => {
    await asCustomer();
    await expect(listAuditLog()).rejects.toThrow(/only staff/i);
  });
});

describe('demo data', () => {
  it('re-seeds the board without touching the directory or the session', async () => {
    seedIfEmpty();
    const admin = await asAdmin();
    await createOrder(draft);

    const orders = await resetDemoData();
    expect(orders).toHaveLength(7);
    expect((await listUsers()).some((user) => user.id === admin.id)).toBe(true);
    expect(userIdFor('admin@sendit.co')).toBe(admin.id);
  });

  it('is administrator-only', async () => {
    await asCustomer();
    await expect(resetDemoData()).rejects.toThrow(/only an administrator/i);
  });
});

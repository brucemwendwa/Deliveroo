import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import { AppRoutes } from '../App';
import { verifyOtp } from '../store/authSlice';
import { MOCK_OTP, createOrder, seedIfEmpty, updateOrderStatus } from '../api/mockBackend';
import { STATUS } from '../lib/orderStatus';
import { TRANSPORT, transportOf } from '../lib/transport';

const seeded = () => {
  seedIfEmpty();
  return JSON.parse(localStorage.getItem('deliveroo.orders'));
};

const renderAt = (path, store = makeStore()) => ({
  store,
  ...render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>
  )
});

/**
 * AppLayout reads the real viewport width on mount, so the narrow layout has to be
 * set on the window rather than pushed straight into the store.
 */
const setViewport = (width) => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  window.dispatchEvent(new Event('resize'));
};

beforeEach(() => {
  localStorage.clear();
  setViewport(1024);
});

// §25 — the Uber moment: request, search, matched.
describe('requesting a pickup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('goes looking for an agent, then shows who is coming', async () => {
    const pending = seeded().find((order) => order.status === STATUS.PENDING);
    renderAt(`/orders/${pending.id}/confirmation`);

    expect(await screen.findByText(/finding a pickup agent near you/i)).toBeInTheDocument();

    // Dispatch answers on its own — no button, no reload. The wait is the search
    // delay plus the backend's own latency, in fake-timer milliseconds.
    expect(await screen.findByText('Pickup agent assigned.', {}, { timeout: 8000 })).toBeInTheDocument();
    // Who is coming, how far out, and the way to watch them arrive.
    expect(screen.getByText(/away/)).toBeInTheDocument();
    expect(screen.getByText(/arriving in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track pickup/i })).toBeInTheDocument();
  });

});

// §25 — a motorbike delivery is tracked by the same screen as every other mode.
describe('tracking a motorbike delivery', () => {
  it('names the vehicle, the rider and the stage the rider is at', async () => {
    const bike = seeded().find((order) => transportOf(order) === TRANSPORT.MOTORBIKE);
    expect(bike).toBeDefined();

    renderAt(`/track/${bike.id}`);

    expect(await screen.findByText(/on the way by motorbike/i)).toBeInTheDocument();
    // The transport figure under the map, and the timeline wording above it.
    // Once in the badge beside the parcel number, once as the transport figure.
    expect(screen.getAllByText('Motorbike').length).toBeGreaterThan(1);
    expect(screen.getByText('Rider assigned')).toBeInTheDocument();
    expect(screen.getByText('Rider arrived')).toBeInTheDocument();
    expect(screen.getByText(bike.presentLocation.label)).toBeInTheDocument();
  });
});

// §23 — the phone layout is a different arrangement of the same screens, not a
// stripped-down one.
describe('mobile layout', () => {
  const renderNarrow = (path, store = makeStore()) => {
    setViewport(420);
    return renderAt(path, store);
  };

  it('puts the request action in the bottom navigation', async () => {
    renderNarrow('/');
    const nav = await screen.findByRole('navigation', { name: 'Primary' });

    expect(within(nav).getByRole('link', { name: 'Request a delivery' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /track/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /deliveries/i })).toBeInTheDocument();
  });

  it('keeps the bottom bar out of the booking flow, which has its own', async () => {
    const store = makeStore();
    await store.dispatch(verifyOtp({ identifier: 'sender@one.co', code: MOCK_OTP }));
    renderNarrow('/book', store);

    expect(await screen.findByText('Where should we pick it up?')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
  });

  it('turns the dispatch table into cards', async () => {
    const orders = seeded();
    const store = makeStore();
    await store.dispatch(verifyOtp({ identifier: 'admin@deliveroo.co', code: MOCK_OTP }));
    renderNarrow('/admin', store);

    // Every delivery is still there, as a card each rather than a row each.
    expect(await screen.findByRole('button', { name: new RegExp(orders[0].id) })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

// §15 — the customer dashboard: the live delivery first, the history under it.
describe('customer dashboard', () => {
  const book = async (store, overrides = {}) => {
    const user = (await store.dispatch(verifyOtp({ identifier: 'ada@one.co', code: MOCK_OTP }))).payload;
    return createOrder({
      userId: user.id,
      pickup: { id: 'a', label: 'Westlands · Nairobi', name: 'Westlands', lat: -1.2673, lng: 36.8065 },
      destination: { id: 'b', label: 'Mombasa', name: 'Mombasa', lat: -4.0435, lng: 39.6682 },
      route: { distanceKm: 485, durationSeconds: 7.2 * 3600, coordinates: [], estimated: false },
      transport: { mode: 'AIR', priority: 'STANDARD' },
      parcel: { weightKg: 3, description: 'Documents' },
      sender: { name: 'Ada', phone: '+254700000001' },
      recipient: { name: 'Grace', phone: '+254700000002' },
      ...overrides
    });
  };

  it('leads with the delivery in progress, and how it is travelling', async () => {
    const store = makeStore();
    const order = await book(store);
    await updateOrderStatus(order.id, STATUS.ASSIGNED);

    renderAt('/orders', store);

    const active = await screen.findByRole('region', { name: 'Active delivery' });
    expect(within(active).getByText('Westlands → Mombasa')).toBeInTheDocument();
    // Named twice on purpose: on the badge, and again in the row of live facts.
    expect(within(active).getAllByText('Air').length).toBeGreaterThan(0);
    expect(within(active).getByText(/km away · arriving in/i)).toBeInTheDocument();
    expect(within(active).getByRole('link', { name: /track live/i })).toBeInTheDocument();

    // …and the primary action is to send another one — in the page header as well as
    // the nav, which is why there is more than one of them.
    expect(screen.getAllByRole('link', { name: /request delivery/i }).length).toBeGreaterThan(0);
  });

  it('filters the history by transport mode', async () => {
    const store = makeStore();
    await book(store);
    renderAt('/orders', store);

    await screen.findByRole('region', { name: 'Active delivery' });
    expect(screen.getByText('Total deliveries')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ship' }));
    expect(await screen.findByText(/no deliveries match that/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Air' }));
    expect(screen.queryByText(/no deliveries match that/i)).not.toBeInTheDocument();
  });
});

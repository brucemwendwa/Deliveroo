import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import { AppRoutes } from '../App';
import { verifyOtp } from '../store/authSlice';
import { MOCK_OTP, assignAgent, createOrder, seedIfEmpty } from '../api/mockBackend';
import { STATUS } from '../lib/orderStatus';
import { TRANSPORT, transportOf } from '../lib/transport';

const seeded = () => {
  seedIfEmpty();
  return JSON.parse(localStorage.getItem('sendit.orders'));
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

    // A road booking is out looking for a driver — the noun follows the vehicle.
    expect(await screen.findByText(/finding a driver near you/i)).toBeInTheDocument();

    // Dispatch answers on its own — no button, no reload. The wait is the search
    // delay plus the backend's own latency, in fake-timer milliseconds. Dispatch may
    // send a van or a bike to collect a road parcel, so the headline names whichever
    // of the two actually turned up.
    expect(await screen.findByText(/^(driver|rider) assigned\.$/i, {}, { timeout: 8000 })).toBeInTheDocument();
    // Who is coming, how far out, and the way to watch them arrive.
    expect(screen.getByText(/away/)).toBeInTheDocument();
    expect(screen.getByText(/arriving in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track (driver|rider)/i })).toBeInTheDocument();
  });

});

// §25 — the same Uber moment, in the words a motorbike delivery uses.
describe('requesting a motorbike pickup', () => {
  let order;

  // Created before the clock is frozen: the backend's own latency is a real timer,
  // and a fake one would never let createOrder resolve.
  beforeEach(async () => {
    order = await createOrder({
      pickup: { label: 'CBD \u00b7 Nairobi', name: 'CBD', lat: -1.2864, lng: 36.8172 },
      destination: { label: 'Westlands \u00b7 Nairobi', name: 'Westlands', lat: -1.2673, lng: 36.8065 },
      route: { distanceKm: 12, durationSeconds: 1800, coordinates: [], estimated: false },
      parcel: { weightKg: 2, description: 'Documents' },
      transport: { mode: TRANSPORT.MOTORBIKE },
      sender: { name: 'Sender', phone: '+254700000001' },
      recipient: { name: 'Recipient', phone: '+254700000002' }
    });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('goes looking for a rider, then shows which rider is coming', async () => {
    renderAt(`/orders/${order.id}/confirmation`);

    // The word follows the vehicle, all the way through the match.
    expect(await screen.findByText(/finding a rider near you/i)).toBeInTheDocument();
    expect(await screen.findByText('Rider assigned.', {}, { timeout: 8000 })).toBeInTheDocument();
    // On the agent card and on the status line above the timeline.
    expect(screen.getAllByText(/rider heading to pickup/i).length).toBeGreaterThan(1);
    expect(screen.getByRole('link', { name: /track rider/i })).toBeInTheDocument();
  });
});

// §25 — the screen a customer who asked for a plane actually sees. A road courier
// collects the parcel, so the agent on the card is a rider or a driver; the screen has
// to say why, or an order badged "Air" simply contradicts itself.
describe('requesting an air freight pickup', () => {
  let order;

  beforeEach(async () => {
    order = await createOrder({
      pickup: { label: 'CBD \u00b7 Nairobi', name: 'CBD', lat: -1.2864, lng: 36.8172 },
      destination: { label: 'Mombasa', name: 'Mombasa', lat: -4.0435, lng: 39.6682 },
      route: { distanceKm: 485, durationSeconds: 26_000, coordinates: [], estimated: false },
      parcel: { weightKg: 3, description: 'Documents' },
      transport: { mode: TRANSPORT.AIR },
      sender: { name: 'Sender', phone: '+254700000001' },
      recipient: { name: 'Recipient', phone: '+254700000002' }
    });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('explains the road leg rather than showing a rider for a flight with no reason', async () => {
    renderAt(`/orders/${order.id}/confirmation`);

    // The hand-over is said while the search is still running, not sprung afterwards.
    expect(await screen.findByText(/finding a pickup agent near you/i)).toBeInTheDocument();
    expect(screen.getByText(/runs the road leg/i)).toBeInTheDocument();

    // Whoever turns up, the card names them and the note says where they are taking it.
    expect(await screen.findByText(/^(rider|driver) assigned\.$/i, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/take it to the air cargo terminal, where air freight takes over/i)).toBeInTheDocument();

    // And the journey itself is the flight, not a generic dispatch.
    expect(screen.getByText('Loaded onto the flight')).toBeInTheDocument();
    expect(screen.getByText('In the air')).toBeInTheDocument();
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
    await store.dispatch(verifyOtp({ identifier: 'admin@sendit.co', code: MOCK_OTP }));
    renderNarrow('/admin/deliveries', store);

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
    // The customer's own request is what finds them an agent (§25) — moving an
    // order along by hand is dispatch's job, and this test is not signed in as staff.
    await assignAgent(order.id);

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

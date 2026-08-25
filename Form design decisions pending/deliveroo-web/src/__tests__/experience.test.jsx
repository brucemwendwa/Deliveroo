import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import { AppRoutes } from '../App';
import { verifyOtp } from '../store/authSlice';
import { MOCK_OTP, seedIfEmpty } from '../api/mockBackend';
import { STATUS } from '../lib/orderStatus';

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
    expect(screen.getByText(/km/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track pickup/i })).toBeInTheDocument();
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

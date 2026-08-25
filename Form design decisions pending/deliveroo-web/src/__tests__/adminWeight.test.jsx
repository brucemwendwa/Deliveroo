import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/** Renders /admin with a real admin session already established (§18). */
const renderAdmin = async () => {
  const store = makeStore();
  await store.dispatch(verifyOtp({ identifier: 'admin@deliveroo.co', code: MOCK_OTP }));
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

/** The console defaults to the first order; click through to a specific one. */
const select = async (order) => {
  await userEvent.click(await screen.findByText(`${order.pickup.name} → ${order.destination.name}`));
};

beforeEach(() => {
  localStorage.clear();
});

// §9/§18 — the scale lives here and nowhere else. These cover the console side of it;
// mockBackend.test.js covers the rule that actually enforces it.
describe('admin scale', () => {
  it('shows the declared weight as a declaration, not a fact', async () => {
    const pending = seeded().find((order) => order.status === STATUS.PENDING);
    await renderAdmin();
    await select(pending);

    expect(await screen.findByText('Weigh the parcel')).toBeInTheDocument();
    expect(screen.getByText('Declared by customer')).toBeInTheDocument();
    expect(screen.getByText('Estimated fee')).toBeInTheDocument();
  });

  it('previews the new fare before anything is confirmed', async () => {
    const pending = seeded().find((order) => order.status === STATUS.PENDING);
    await renderAdmin();
    await select(pending);

    // Declared 1 kg over 18.2 km → KES 780. On the scale it is 9 kg.
    await userEvent.type(await screen.findByLabelText(/weight from the scale/i), '9');

    expect(await screen.findByText('Fee at 9 kg')).toBeInTheDocument();
    expect(screen.getByText('KES 1,180')).toBeInTheDocument();
    expect(screen.getByText(/\+KES 400 vs estimate/)).toBeInTheDocument();
  });

  it('records the weight and re-prices the order', async () => {
    const pending = seeded().find((order) => order.status === STATUS.PENDING);
    const store = await renderAdmin();
    await select(pending);

    await userEvent.type(await screen.findByLabelText(/weight from the scale/i), '9');
    await userEvent.click(screen.getByRole('button', { name: /confirm weight/i }));

    await waitFor(() => {
      const order = store.getState().orders.entities[pending.id];
      expect(order.parcel.verifiedWeightKg).toBe(9);
      expect(order.pricing.total).toBe(1180);
      expect(order.quotedPricing.total).toBe(780);
    });

    expect(await screen.findByText('Weight · verified')).toBeInTheDocument();
    expect(screen.getByText('Under-declared by +8.0 kg.', { exact: false })).toBeInTheDocument();
  });

  it('closes the scale once the parcel is in transit, and says why', async () => {
    const [inTransit] = seeded();
    expect(inTransit.status).toBe(STATUS.IN_TRANSIT);
    await renderAdmin();
    await select(inTransit);

    expect(await screen.findByText(/already in transit/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/weight from the scale/i)).not.toBeInTheDocument();
  });

  it('marks unweighed orders in the list so nothing ships on a guess', async () => {
    seeded();
    await renderAdmin();

    // The PENDING fixture is the only one still on its declared weight.
    await waitFor(() => expect(screen.getAllByText('EST.')).toHaveLength(1));
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import { AppRoutes } from '../App';
import { verifyOtp } from '../store/authSlice';
import { MOCK_OTP, seedIfEmpty } from '../api/mockBackend';
import { STATUS } from '../lib/orderStatus';
import { TRANSPORT, transportOf } from '../lib/transport';

const seeded = () => {
  seedIfEmpty();
  return JSON.parse(localStorage.getItem('sendit.orders'));
};

/** Renders a portal section with a real admin session already established (§18). */
const renderPortal = async (path = '/admin/deliveries') => {
  const store = makeStore();
  await store.dispatch(verifyOtp({ identifier: 'admin@sendit.co', code: MOCK_OTP }));
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

const renderAdmin = () => renderPortal('/admin/deliveries');

/**
 * The console defaults to the first order; click through to a specific one. The
 * board is a table now, and each row's parcel id is the button that selects it.
 */
const select = async (order) => {
  // The console loads its board, its capacity panel and the selected order's detail
  // column before the rows are clickable, which is more than the default one second
  // allows for on a cold suite.
  await userEvent.click(await screen.findByRole('button', { name: order.id }, { timeout: 5000 }));
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

    // Declared 1 kg over 18.2 km → KES 740. On the scale it is 9 kg, and at KES 2.5
    // a kilo the extra eight kilos move the fare by KES 20.
    await userEvent.type(await screen.findByLabelText(/weight from the scale/i), '9');

    expect(await screen.findByText('Fee at 9 kg')).toBeInTheDocument();
    expect(screen.getByText('KES 760')).toBeInTheDocument();
    expect(screen.getByText(/\+KES 20 vs estimate/)).toBeInTheDocument();
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
      expect(order.pricing.total).toBe(760);
      expect(order.quotedPricing.total).toBe(740);
    });

    expect(await screen.findByText('Weight · verified')).toBeInTheDocument();
    expect(screen.getByText('Declared light by +8.0 kg.', { exact: false })).toBeInTheDocument();
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
    // Counted from the fixtures rather than hardcoded: the seed carries one order per
    // transport mode now, and most of them have never been near a scale.
    const unweighed = seeded().filter((order) => !order.parcel.verifiedWeightKg).length;
    await renderAdmin();

    await waitFor(() => expect(screen.getAllByText('EST.')).toHaveLength(unweighed));
  });
});


// §26 — the console has to recognise a motorbike delivery as one: who is riding it,
// and how much rider capacity there is to book into.
describe('admin motorbike handling', () => {
  it('shows the rider, the bike and its registration on a motorbike delivery', async () => {
    const bike = seeded().find((order) => transportOf(order) === TRANSPORT.MOTORBIKE);
    await renderAdmin();
    await select(bike);

    expect(await screen.findByText('Rider assignment')).toBeInTheDocument();
    // The assignment record names the person and the machine, not just the mode.
    expect(screen.getAllByText(new RegExp(bike.courier.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(bike.courier.plate).length).toBeGreaterThan(0);
    expect(screen.getByText('Registration')).toBeInTheDocument();
    // A parcel already moving is a rider out delivering, not one sitting available.
    expect(screen.getByText('Delivering')).toBeInTheDocument();
  });

  it('counts motorbike capacity alongside every other mode', async () => {
    seeded();
    // §27 — availability moved out of the board and into its own portal section.
    await renderPortal('/admin/capacity');

    expect(await screen.findByText('Motorbike fleet')).toBeInTheDocument();
    // Every mode reports the same three figures, motorbike included.
    const capacity = screen.getByLabelText('Motorbike capacity');
    expect(capacity).toHaveTextContent('Available');
    expect(capacity).toHaveTextContent('Assigned');
    expect(capacity).toHaveTextContent('Offline');
  });
});

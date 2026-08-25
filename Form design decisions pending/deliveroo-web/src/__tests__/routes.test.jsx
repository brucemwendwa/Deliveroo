import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import { AppRoutes } from '../App';
import { seedIfEmpty } from '../api/mockBackend';
import { STATUS } from '../lib/orderStatus';

/** Reads the seeded fixtures straight out of the mock backend's store. */
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

beforeEach(() => {
  localStorage.clear();
});

describe('routes', () => {
  it('renders the tracking lookup', () => {
    renderAt('/track');
    expect(screen.getByText('Where is my package?')).toBeInTheDocument();
  });

  it('renders live tracking for a real order', async () => {
    const [inTransit] = seeded();
    renderAt(`/track/${inTransit.id}`);
    expect(await screen.findByText(`Order #${inTransit.id}`)).toBeInTheDocument();
    expect(screen.getByText('Your package is on the way.')).toBeInTheDocument();
  });

  it('tells the customer plainly when an order id is unknown', async () => {
    renderAt('/track/DLV-00000');
    expect(await screen.findByText("We can't find that order.")).toBeInTheDocument();
  });

  it('renders the confirmation screen', async () => {
    const [order] = seeded();
    renderAt(`/orders/${order.id}/confirmation`);
    expect(await screen.findByText('Delivery confirmed')).toBeInTheDocument();
  });

  it('offers both actions while a delivery is still in transit (§16, §17)', async () => {
    const [inTransit] = seeded();
    expect(inTransit.status).toBe(STATUS.IN_TRANSIT);
    renderAt(`/orders/${inTransit.id}`);

    expect(await screen.findByRole('button', { name: /change destination/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /cancel delivery/i })).toBeEnabled();
  });

  it('disables both actions once delivered, and says why', async () => {
    const delivered = seeded().find((order) => order.status === STATUS.DELIVERED);
    renderAt(`/orders/${delivered.id}`);

    expect(await screen.findByRole('button', { name: /change destination/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel delivery/i })).toBeDisabled();
    expect(screen.getByText(/already been completed/i)).toBeInTheDocument();
  });

  it('opens the cancel confirmation and can back out of it', async () => {
    const [inTransit] = seeded();
    renderAt(`/orders/${inTransit.id}`);

    await userEvent.click(await screen.findByRole('button', { name: /cancel delivery/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to cancel it\?/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Keep Delivery' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('gates the admin console behind an admin session', async () => {
    renderAt('/admin');
    expect(await screen.findByText('Admin access required.')).toBeInTheDocument();
  });

  it('asks for sign-in before listing personal deliveries', async () => {
    renderAt('/orders');
    expect(await screen.findByText('Sign in to see your deliveries.')).toBeInTheDocument();
  });

  it('falls through to a 404 for unknown paths', async () => {
    renderAt('/nowhere');
    expect(await screen.findByText('That page has moved on.')).toBeInTheDocument();
  });

  it('gates the booking page behind a session, even on a direct visit', async () => {
    renderAt('/book');
    expect(await screen.findByText('Sign in to send a package.')).toBeInTheDocument();
    // The form itself must not be reachable by typing the URL.
    expect(screen.queryByText('Where should we pick it up?')).not.toBeInTheDocument();
  });

  it('opens the booking form on /book once signed in', async () => {
    // Seed the stored session rather than the store: AppLayout dispatches
    // loadSession() on mount, which would overwrite a directly-set user.
    localStorage.setItem(
      'deliveroo.session',
      JSON.stringify({ id: 'u1', name: 'Ada', phone: '+254700000000' })
    );
    renderAt('/book');
    expect(await screen.findByText('Where should we pick it up?')).toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign-in rather than to booking', async () => {
    const { store } = renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: 'Send a package' }));

    expect(store.getState().ui.authModal).toEqual({ open: true, returnTo: '/book' });
    expect(screen.queryByText('Where should we pick it up?')).not.toBeInTheDocument();
  });
});

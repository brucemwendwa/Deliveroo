// §27 — the portal itself: who gets in, what each section shows, and the two levers
// that are administrator-only. The rules live in the backend (adminAccess.test.js);
// these are the screens that have to obey them.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import { AppRoutes } from '../App';
import { verifyOtp } from '../store/authSlice';
import {
  MOCK_OTP,
  seedIfEmpty,
  setUserRole,
  updateSettings,
  userIdFor,
  verifyOtp as apiVerifyOtp
} from '../api/mockBackend';
import { ROLE } from '../lib/roles';

const seeded = () => {
  seedIfEmpty();
  return JSON.parse(localStorage.getItem('deliveroo.orders'));
};

const renderPortal = async (path = '/admin', identifier = 'admin@deliveroo.co') => {
  const store = makeStore();
  await store.dispatch(verifyOtp({ identifier, code: MOCK_OTP }));
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

/** Promotes someone to dispatcher through the API, as an administrator would. */
const makeDispatcher = async (identifier) => {
  seedIfEmpty();
  await apiVerifyOtp({ identifier, code: MOCK_OTP });
  await apiVerifyOtp({ identifier: 'admin@deliveroo.co', code: MOCK_OTP });
  await setUserRole(userIdFor(identifier), ROLE.DISPATCHER);
  localStorage.removeItem('deliveroo.session');
};

beforeEach(() => {
  localStorage.clear();
});

describe('who gets in', () => {
  it('turns a customer away from the portal', async () => {
    await renderPortal('/admin', 'buyer@one.co');
    expect(await screen.findByText('Admin access required.')).toBeInTheDocument();
  });

  it('opens on the overview, with the sections beside it', async () => {
    seeded();
    await renderPortal('/admin');

    expect(await screen.findByText('Operations at a glance')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Admin sections' });
    expect(within(nav).getByRole('link', { name: 'Deliveries' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    // The figures a shift lead acts on, not a wall of totals.
    expect(screen.getByText('Live now')).toBeInTheDocument();
    expect(screen.getByText(/Needs attention/)).toBeInTheDocument();
  });

  it('names the signed-in person and their role in the header', async () => {
    await renderPortal('/admin');
    expect(await screen.findByText(/Administrator/)).toBeInTheDocument();
  });
});

describe('a dispatcher', () => {
  it('runs the board without being offered the settings', async () => {
    seeded();
    await makeDispatcher('peter@deliveroo.co');
    await renderPortal('/admin', 'peter@deliveroo.co');

    const nav = await screen.findByRole('navigation', { name: 'Admin sections' });
    expect(within(nav).getByRole('link', { name: 'Deliveries' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('is refused the settings even by typing the URL — the sidebar is not the control', async () => {
    await makeDispatcher('peter@deliveroo.co');
    await renderPortal('/admin/settings', 'peter@deliveroo.co');

    expect(await screen.findByText('Not your section')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Accepting new bookings' })).not.toBeInTheDocument();
  });
});

describe('sections', () => {
  it('moves from the overview to the board', async () => {
    const orders = seeded();
    await renderPortal('/admin');

    const nav = await screen.findByRole('navigation', { name: 'Admin sections' });
    await userEvent.click(within(nav).getByRole('link', { name: 'Deliveries' }));

    expect(await screen.findByText('Dispatch console')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: orders[0].id }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('takes a courier off shift from the roster', async () => {
    seeded();
    await renderPortal('/admin/couriers');

    const toggle = await screen.findByRole('switch', { name: 'James K. on shift' }, { timeout: 5000 });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(toggle);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'James K. on shift' })).toHaveAttribute('aria-checked', 'false')
    );
  });

  it('promotes a customer to dispatcher from the accounts screen', async () => {
    seeded();
    await renderPortal('/admin/accounts');

    const role = await screen.findByRole('combobox', { name: 'Role for Ada Kimani' }, { timeout: 5000 });
    expect(role).toHaveValue(ROLE.CUSTOMER);

    await userEvent.selectOptions(role, ROLE.DISPATCHER);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Role for Ada Kimani' })).toHaveValue(ROLE.DISPATCHER)
    );
  });

  it('will not let an administrator change their own role', async () => {
    seeded();
    await renderPortal('/admin/accounts');

    // Their own row prints the role rather than offering the control that could
    // strand the install with nobody able to grant one.
    await screen.findByText('People and access');
    expect(screen.queryByRole('combobox', { name: /Role for Amina/ })).not.toBeInTheDocument();
    expect(screen.getByText('· you')).toBeInTheDocument();
  });

  it('lists what the platform has told customers', async () => {
    seeded();
    await renderPortal('/admin/notifications');
    expect(await screen.findByText(/Outbox ·/)).toBeInTheDocument();
  });

  it('reports the tariff a mode is actually charged at', async () => {
    seeded();
    await renderPortal('/admin/capacity');

    expect(await screen.findByText('Tariffs and eligibility')).toBeInTheDocument();
    expect(screen.getByText(/KES 200 minimum/)).toBeInTheDocument();
  });
});

describe('platform settings', () => {
  it('pauses bookings, and says so on the switch', async () => {
    await renderPortal('/admin/settings');

    const toggle = await screen.findByRole('switch', { name: 'Accepting new bookings' }, { timeout: 5000 });
    expect(screen.getByText('Customers can request a delivery.')).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(await screen.findByText(/being turned away/i)).toBeInTheDocument();
  });

  it('shows a posted notice at the top of every portal screen', async () => {
    await apiVerifyOtp({ identifier: 'admin@deliveroo.co', code: MOCK_OTP });
    await updateSettings({ noticeToStaff: 'Drone capacity is grounded until 14:00.' });

    await renderPortal('/admin/reports');
    expect(await screen.findByText('Drone capacity is grounded until 14:00.')).toBeInTheDocument();
  });
});

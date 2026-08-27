import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import App from '../App';
import Nav from '../components/Nav';
import { setNarrow } from '../store/uiSlice';

const withStore = (ui, store = makeStore()) => ({
  store,
  ...render(<Provider store={store}>{ui}</Provider>)
});

// Nav is rendered inside the router by App; on its own it needs one supplied.
const renderNav = (store = makeStore()) => withStore(<MemoryRouter><Nav /></MemoryRouter>, store);

describe('landing page', () => {
  it('opens on the first hero slide', () => {
    withStore(<App />);
    // The carousel starts on the drone: it is the slide that says "technology" first.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The future ofdelivery is here');
    expect(screen.getByText('Watch It')).toBeInTheDocument();
  });

  it('renders the landing sections, booking now living on its own route', () => {
    const { container } = withStore(<App />);
    for (const id of ['top', 'services', 'footer']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
    // Booking moved to /book, so the landing page must not still carry it.
    expect(container.querySelector('#book')).toBeNull();
    // The sections cut in §2 must not come back.
    for (const id of ['trust', 'how', 'tracking', 'business', 'final']) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }
  });

  it('points the hero CTA at the booking route, not a scroll anchor', () => {
    const { container } = withStore(<App />);
    expect(container.querySelector('a[href="/book"]')).not.toBeNull();
    expect(container.querySelector('a[href="#book"]')).toBeNull();
  });

  it('shows the hamburger below the breakpoint', () => {
    const store = makeStore();
    store.dispatch(setNarrow(true));
    renderNav(store);
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('offers the grouped nav above the breakpoint', () => {
    renderNav();
    for (const label of ['Services', 'Track Delivery', 'Contact', 'Get Started']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('opens a nav menu on hover, without a click', async () => {
    renderNav();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.hover(screen.getByRole('button', { name: /^Services/ }));

    expect(await screen.findByRole('menu', { name: 'Services' })).toBeInTheDocument();
    for (const label of ['Same-day courier', 'Package delivery', 'Business logistics']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    }
  });

  it('keeps the menu open while the pointer moves onto its items', async () => {
    renderNav();
    await userEvent.hover(screen.getByRole('button', { name: /^Contact/ }));
    const item = await screen.findByRole('menuitem', { name: 'Talk to sales' });

    // The gap between trigger and panel is padding inside the hover area, so
    // travelling to an item must not close the menu.
    await userEvent.hover(item);
    expect(screen.getByRole('menu', { name: 'Contact' })).toBeInTheDocument();
  });

  it('swaps Get Started for the profile once signed in', async () => {
    const store = makeStore();
    store.dispatch({
      type: 'auth/verifyOtp/fulfilled',
      payload: { id: 'u1', name: 'Ada Lovelace', phone: '+254700000000' }
    });
    renderNav(store);

    expect(screen.queryByText('Get Started')).not.toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('offers deliveries and sign-out under the profile', async () => {
    const store = makeStore();
    store.dispatch({
      type: 'auth/verifyOtp/fulfilled',
      payload: { id: 'u1', name: 'Ada Lovelace', phone: '+254700000000' }
    });
    renderNav(store);

    await userEvent.hover(screen.getByRole('button', { name: /Ada Lovelace/ }));
    expect(await screen.findByRole('menuitem', { name: 'My deliveries' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    // The dispatch console belongs to admins only.
    expect(screen.queryByRole('menuitem', { name: 'Dispatch console' })).not.toBeInTheDocument();
  });

  it('shows the dispatch console to an admin', async () => {
    const store = makeStore();
    store.dispatch({
      type: 'auth/verifyOtp/fulfilled',
      payload: { id: 'u2', name: 'Grace', phone: '+254700000001', isAdmin: true }
    });
    renderNav(store);

    await userEvent.hover(screen.getByRole('button', { name: /Grace/ }));
    expect(await screen.findByRole('menuitem', { name: 'Dispatch console' })).toBeInTheDocument();
  });

  it('closes an open nav menu on Escape', async () => {
    renderNav();
    await userEvent.hover(screen.getByRole('button', { name: /^Contact/ }));
    expect(await screen.findByRole('menu', { name: 'Contact' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});

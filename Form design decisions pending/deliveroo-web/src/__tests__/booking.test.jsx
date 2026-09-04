import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import BookDelivery from '../components/booking/BookDelivery';
import { goToStep, setDestination, setPickup, setWeight } from '../store/bookingSlice';

const WESTLANDS = { id: 'a', label: 'Westlands · Nairobi', name: 'Westlands', lat: -1.2673, lng: 36.8065 };
const KILIMANI = { id: 'b', label: 'Kilimani · Nairobi', name: 'Kilimani', lat: -1.2921, lng: 36.7833 };

const renderBooking = (store = makeStore()) => ({
  store,
  ...render(
    <Provider store={store}>
      <MemoryRouter>
        <BookDelivery />
      </MemoryRouter>
    </Provider>
  )
});

describe('booking flow', () => {
  it('opens on the pickup step', () => {
    renderBooking();
    expect(screen.getByText('Where should we pick it up?')).toBeInTheDocument();
    expect(screen.queryByText('Where should we deliver it?')).not.toBeInTheDocument();
  });

  it('will not advance past pickup until a location is chosen', async () => {
    const { store } = renderBooking();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();

    store.dispatch(setPickup(WESTLANDS));
    const advance = await screen.findByRole('button', { name: /continue/i });

    await userEvent.click(advance);
    expect(store.getState().booking.step).toBe(1);
  });

  it('collapses a completed step to a summary that can be reopened', async () => {
    const { store } = renderBooking();
    store.dispatch(setPickup(WESTLANDS));
    await userEvent.click(await screen.findByRole('button', { name: /continue/i }));

    expect(screen.getByText('Westlands · Nairobi')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(store.getState().booking.step).toBe(0);
  });

  /** Both endpoints and a resolved route — everything the transport step needs. */
  const withRoute = (store) => {
    store.dispatch(setPickup(WESTLANDS));
    store.dispatch(setDestination(KILIMANI));
    store.dispatch(setWeight(3));
    store.dispatch({
      type: 'booking/resolveRoute/fulfilled',
      payload: { distanceKm: 12.4, durationSeconds: 2100, coordinates: [], estimated: false }
    });
  };

  it('offers every mode on the transport step, and says why two of them cannot run this route', async () => {
    const { store } = renderBooking();
    withRoute(store);
    store.dispatch(goToStep(3));

    // A 12 km hop across town: a bike, a van or a drone can do it; a plane and a
    // ship cannot.
    expect(await screen.findByRole('button', { name: /^Road, KES/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Motorbike, KES/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Drone, KES/ })).toBeEnabled();

    const air = screen.getByRole('button', { name: /^Air unavailable/ });
    expect(air).toBeDisabled();
    expect(air).toHaveAccessibleName(/air freight starts at 120 km/i);
    expect(screen.getByRole('button', { name: /^Ship unavailable/ })).toBeDisabled();
    // §25 requires the reason to be on screen, not only in the label.
    expect(screen.getByText(/sea freight starts at 200 km/i)).toBeInTheDocument();
  });

  it('re-prices the delivery when a different mode is chosen', async () => {
    const { store, container } = renderBooking();
    // The running total the price card announces.
    const total = () => container.querySelector('[aria-live="polite"]').textContent;

    withRoute(store);
    store.dispatch(goToStep(3));

    // The step lands on the cheapest option that can run the route — across town
    // that is the bike, which undercuts the van on the same roads.
    const road = await screen.findByRole('button', { name: /^Road, KES/ });
    const motorbike = screen.getByRole('button', { name: /^Motorbike, KES/ });
    expect(store.getState().booking.transport.mode).toBe('MOTORBIKE');
    expect(motorbike).toHaveAttribute('aria-pressed', 'true');
    const bikeTotal = motorbike.getAttribute('aria-label').split(', ')[1];
    expect(total()).toBe(bikeTotal);

    await userEvent.click(road);

    expect(store.getState().booking.transport.mode).toBe('ROAD');
    expect(road).toHaveAttribute('aria-pressed', 'true');
    // The van costs more than the bike it replaced, and the quote follows.
    expect(total()).toBe('KES 510');
    expect(total()).not.toBe(bikeTotal);
  });

  it('prices the delivery from weight and route distance', async () => {
    const { store } = renderBooking();
    store.dispatch(setPickup(WESTLANDS));
    store.dispatch(setDestination(KILIMANI));
    store.dispatch(setWeight(3));
    store.dispatch({
      type: 'booking/resolveRoute/fulfilled',
      payload: { distanceKm: 12.4, durationSeconds: 2100, coordinates: [], estimated: false }
    });

    expect(await screen.findByText('KES 510')).toBeInTheDocument();
    // Distance shows in both the stat tile and the price breakdown — both are correct.
    expect(screen.getAllByText('12.4 km').length).toBeGreaterThan(0);
    expect(screen.getAllByText('35 min').length).toBeGreaterThan(0);
  });

  // Two different quantities used to carry the same name: the tile called the router's
  // driving time an "estimated time" and the quote called the door-to-door promise an
  // "estimated delivery time", so 35 min and 50 min sat on one screen contradicting
  // each other with nothing to say why. Both figures were right; only the labels lied.
  it('tells the drive time apart from the door-to-door promise', async () => {
    const { store } = renderBooking();
    store.dispatch(setPickup(WESTLANDS));
    store.dispatch(setDestination(KILIMANI));
    store.dispatch(setWeight(3));
    store.dispatch({
      type: 'booking/resolveRoute/fulfilled',
      payload: { distanceKm: 12.4, durationSeconds: 2100, coordinates: [], estimated: false }
    });

    // The route's own driving time, named for what it is and sitting beside the distance.
    expect(await screen.findByText('Drive time')).toBeInTheDocument();
    expect(screen.getAllByText('35 min').length).toBeGreaterThan(0);

    // The figure the customer is actually promised, under the name the tracking screen
    // and the admin console already use, and showing where the extra 15 minutes go.
    expect(screen.getByText('Door to door')).toBeInTheDocument();
    expect(screen.getByText('50 min')).toBeInTheDocument();
    expect(screen.getByText('Travel plus 15 min handling')).toBeInTheDocument();

    // And neither one is called simply an "estimated time" any more.
    expect(screen.queryByText('Estimated time')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated delivery time')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import BookDelivery from '../components/booking/BookDelivery';
import { setDestination, setPickup, setWeight } from '../store/bookingSlice';

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

  it('prices the delivery from weight and route distance', async () => {
    const { store } = renderBooking();
    store.dispatch(setPickup(WESTLANDS));
    store.dispatch(setDestination(KILIMANI));
    store.dispatch(setWeight(3));
    store.dispatch({
      type: 'booking/resolveRoute/fulfilled',
      payload: { distanceKm: 12.4, durationSeconds: 2100, coordinates: [], estimated: false }
    });

    expect(await screen.findByText('KES 650')).toBeInTheDocument();
    // Distance shows in both the stat tile and the price breakdown — both are correct.
    expect(screen.getAllByText('12.4 km').length).toBeGreaterThan(0);
    expect(screen.getAllByText('35 min').length).toBeGreaterThan(0);
  });
});

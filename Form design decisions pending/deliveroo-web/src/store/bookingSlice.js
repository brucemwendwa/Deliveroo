// §5–§11 — the booking wizard. Holds the draft delivery as the customer builds it;
// the price is never stored, only derived (see selectQuote), so it cannot drift out
// of step with the weight and distance it came from.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { routeBetween } from '../api/geo';
import { createOrder } from '../api';
import { quote } from '../lib/pricing';

export const STEPS = ['pickup', 'destination', 'parcel', 'details', 'summary'];

/** Recomputes the route whenever either endpoint changes. */
export const resolveRoute = createAsyncThunk(
  'booking/resolveRoute',
  async (_, { getState, rejectWithValue }) => {
    const { pickup, destination } = getState().booking;
    if (!pickup || !destination) return null;
    try {
      return await routeBetween(pickup, destination);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitBooking = createAsyncThunk(
  'booking/submit',
  async (_, { getState, rejectWithValue }) => {
    const { booking, auth } = getState();
    try {
      return await createOrder({
        userId: auth.user?.id || null,
        pickup: booking.pickup,
        destination: booking.destination,
        route: booking.route,
        parcel: booking.parcel,
        sender: booking.sender,
        recipient: booking.recipient
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  step: 0,
  pickup: null,
  destination: null,
  route: null,
  routeStatus: 'idle',
  parcel: { weightKg: 1, description: '' },
  sender: { name: '', phone: '' },
  recipient: { name: '', phone: '' },
  submitStatus: 'idle',
  error: null
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setPickup(state, action) {
      state.pickup = action.payload;
      state.route = null;
    },
    setDestination(state, action) {
      state.destination = action.payload;
      state.route = null;
    },
    setWeight(state, action) {
      state.parcel.weightKg = action.payload;
    },
    setDescription(state, action) {
      state.parcel.description = action.payload;
    },
    setSenderField(state, action) {
      state.sender[action.payload.field] = action.payload.value;
    },
    setRecipientField(state, action) {
      state.recipient[action.payload.field] = action.payload.value;
    },
    goToStep(state, action) {
      state.step = Math.max(0, Math.min(STEPS.length - 1, action.payload));
    },
    nextStep(state) {
      state.step = Math.min(STEPS.length - 1, state.step + 1);
    },
    resetBooking: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(resolveRoute.pending, (state) => {
        state.routeStatus = 'loading';
      })
      .addCase(resolveRoute.fulfilled, (state, action) => {
        state.routeStatus = action.payload ? 'ready' : 'idle';
        state.route = action.payload;
      })
      .addCase(resolveRoute.rejected, (state, action) => {
        state.routeStatus = 'error';
        state.error = action.payload || 'Could not work out a route.';
      })
      .addCase(submitBooking.pending, (state) => {
        state.submitStatus = 'loading';
        state.error = null;
      })
      .addCase(submitBooking.fulfilled, (state) => {
        state.submitStatus = 'succeeded';
      })
      .addCase(submitBooking.rejected, (state, action) => {
        state.submitStatus = 'idle';
        state.error = action.payload || 'Could not place the delivery.';
      });
  }
});

export const {
  setPickup,
  setDestination,
  setWeight,
  setDescription,
  setSenderField,
  setRecipientField,
  goToStep,
  nextStep,
  resetBooking
} = bookingSlice.actions;

// --- selectors --------------------------------------------------------------

export const selectBooking = (state) => state.booking;

/**
 * §9 — always derived from current weight + distance, never stored. Memoized because
 * quote() builds a fresh object: without this every unrelated dispatch would re-render
 * the price card.
 */
export const selectQuote = createSelector(
  [(state) => state.booking.parcel.weightKg, (state) => state.booking.route?.distanceKm || 0],
  (weightKg, distanceKm) => quote({ weightKg, distanceKm })
);

const filled = (person) => Boolean(person.name.trim() && person.phone.trim());

/** Which steps the customer may advance past — drives the stepper's disabled states. */
export const selectStepComplete = createSelector(
  [
    (state) => state.booking.pickup,
    (state) => state.booking.destination,
    (state) => state.booking.route,
    (state) => state.booking.parcel.weightKg,
    (state) => state.booking.sender,
    (state) => state.booking.recipient
  ],
  (pickup, destination, route, weightKg, sender, recipient) => ({
    pickup: Boolean(pickup),
    destination: Boolean(destination),
    parcel: Boolean(weightKg > 0 && route),
    details: filled(sender) && filled(recipient),
    summary: false
  })
);

export const selectCanSubmit = createSelector([selectStepComplete], (complete) =>
  Boolean(complete.pickup && complete.destination && complete.parcel && complete.details)
);

export default bookingSlice.reducer;

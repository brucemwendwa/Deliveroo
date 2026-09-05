// §5–§11 — the booking wizard. Holds the draft delivery as the customer builds it;
// the price is never stored, only derived (see selectQuote), so it cannot drift out
// of step with the weight and distance it came from.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { routeBetween } from '../api/geo';
import { createOrder } from '../api';
import { priceOrder } from '../lib/pricing';
import { DEFAULT_FLEET, DEFAULT_PRIORITY, defaultModeFor, transportOptions } from '../lib/transport';

// §25 — "how should it travel?" sits between what is being sent and who is sending it,
// because the price and the ETA both fall out of the answer.
export const STEPS = ['pickup', 'destination', 'parcel', 'transport', 'details', 'summary'];

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
        transport: booking.transport,
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
  parcel: { weightKg: 1, description: '', packageType: '', lengthCm: '', widthCm: '', heightCm: '' },
  /** null mode = the customer hasn't chosen yet; the transport step picks a default. */
  transport: { mode: null, priority: DEFAULT_PRIORITY },
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
      // A new route can make the chosen vehicle ineligible — drone across the country,
      // ship to somewhere landlocked. Clearing it forces a re-pick against real options.
      state.transport.mode = null;
    },
    setDestination(state, action) {
      state.destination = action.payload;
      state.route = null;
      state.transport.mode = null;
    },
    setWeight(state, action) {
      state.parcel.weightKg = action.payload;
    },
    setDescription(state, action) {
      state.parcel.description = action.payload;
    },
    setPackageType(state, action) {
      state.parcel.packageType = action.payload;
    },
    /** Optional dimensions in cm. Bulky-but-light parcels price on the space they take. */
    setDimension(state, action) {
      state.parcel[action.payload.field] = action.payload.value;
    },
    setTransportMode(state, action) {
      state.transport.mode = action.payload;
    },
    setPriority(state, action) {
      state.transport.priority = action.payload;
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
  setPackageType,
  setDimension,
  setTransportMode,
  setPriority,
  setSenderField,
  setRecipientField,
  goToStep,
  nextStep,
  resetBooking
} = bookingSlice.actions;

// --- selectors --------------------------------------------------------------

export const selectBooking = (state) => state.booking;

/**
 * §25 — every mode priced against this route and this parcel, eligible or not.
 * Memoized: it builds a fresh array of quotes, so an unmemoized version would
 * re-render the whole transport step on every keystroke elsewhere in the form.
 */
export const selectTransportOptions = createSelector(
  [
    (state) => state.booking.pickup,
    (state) => state.booking.destination,
    (state) => state.booking.route,
    (state) => state.booking.parcel,
    (state) => state.booking.transport.priority,
    (state) => state.fleet?.status || DEFAULT_FLEET
  ],
  (pickup, destination, route, parcel, priority, fleet) =>
    transportOptions({ pickup, destination, route, parcel, priority, fleet })
);

/** The option the customer is actually on, once they have chosen one. */
export const selectSelectedOption = createSelector(
  [selectTransportOptions, (state) => state.booking.transport.mode],
  (options, mode) => options.find((option) => option.mode === mode && option.available) || null
);

/**
 * §9 — always derived from current weight + distance + mode, never stored. Falls back
 * to the road tariff before a mode is chosen, which is what the price card shows while
 * the customer is still filling in the parcel.
 */
export const selectQuote = createSelector(
  [
    (state) => state.booking.parcel,
    (state) => state.booking.route,
    (state) => state.booking.transport
  ],
  (parcel, route, transport) =>
    priceOrder({ parcel, route, transport: transport.mode ? transport : undefined })
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
    (state) => state.booking.recipient,
    (state) => state.booking.transport.mode
  ],
  (pickup, destination, route, weightKg, sender, recipient, mode) => ({
    pickup: Boolean(pickup),
    destination: Boolean(destination),
    parcel: Boolean(weightKg > 0 && route),
    transport: Boolean(mode),
    details: filled(sender) && filled(recipient),
    summary: false
  })
);

export const selectCanSubmit = createSelector([selectStepComplete], (complete) =>
  Boolean(complete.pickup && complete.destination && complete.parcel && complete.transport && complete.details)
);

/** Cheapest eligible mode — what the transport step pre-selects. */
export const selectDefaultMode = createSelector([selectTransportOptions], (options) =>
  defaultModeFor(options)
);

export default bookingSlice.reducer;

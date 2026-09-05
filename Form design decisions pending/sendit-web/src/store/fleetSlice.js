// §26 — which transport capacity dispatch can book into today. Its own slice because
// it is neither UI state nor an order: it is a property of the network, read by the
// booking flow and written by the admin console.

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as apiClient from '../api';
import { DEFAULT_FLEET } from '../lib/transport';

export const fetchFleet = createAsyncThunk('fleet/fetch', () => apiClient.getFleet());

export const setFleetStatus = createAsyncThunk(
  'fleet/setStatus',
  async ({ mode, status }, { rejectWithValue }) => {
    try {
      return await apiClient.setFleetStatus(mode, status);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const fleetSlice = createSlice({
  name: 'fleet',
  // Everything available until told otherwise — a network hiccup reading availability
  // must not silently strip the customer's options down to nothing.
  initialState: { status: DEFAULT_FLEET, error: null },
  reducers: {
    clearFleetError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    for (const thunk of [fetchFleet, setFleetStatus]) {
      builder.addCase(thunk.fulfilled, (state, action) => {
        if (action.payload) state.status = { ...DEFAULT_FLEET, ...action.payload };
        state.error = null;
      });
    }
    builder.addCase(setFleetStatus.rejected, (state, action) => {
      state.error = action.payload || 'Could not change availability.';
    });
  }
});

export const { clearFleetError } = fleetSlice.actions;

export const selectFleet = (state) => state.fleet.status;
export const selectFleetError = (state) => state.fleet.error;

export default fleetSlice.reducer;

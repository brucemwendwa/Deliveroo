// §13–§18 — placed orders. One record per id keyed in `entities`, so the tracking
// screen, the order-details screen and the admin table all read the same object and
// a live update from any of them is reflected everywhere at once.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as apiClient from '../api';
import { STATUS, isTerminal, stepIndex } from '../lib/orderStatus';
import { transportOf } from '../lib/transport';

export const fetchOrder = createAsyncThunk('orders/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await apiClient.getOrder(id);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchOrders = createAsyncThunk('orders/fetchMine', async (userId) => apiClient.listOrders(userId));

export const fetchAllOrders = createAsyncThunk('orders/fetchAll', async () => apiClient.listAllOrders());

export const changeStatus = createAsyncThunk(
  'orders/changeStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await apiClient.updateOrderStatus(id, status);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const moveCourier = createAsyncThunk('orders/moveCourier', async ({ id, lat, lng }) =>
  apiClient.updateCourierPosition(id, { lat, lng })
);

/**
 * §25 — ask dispatch for a pickup agent. This is the on-demand half of the product:
 * the customer requests, the platform matches. Idempotent on the backend, so a retry
 * or a second mounted screen cannot double-assign.
 */
export const dispatchAgent = createAsyncThunk('orders/dispatchAgent', async (id, { rejectWithValue }) => {
  try {
    return await apiClient.assignAgent(id);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

/** §26 — admin pins where the parcel actually is. */
export const setPresentLocation = createAsyncThunk(
  'orders/setPresentLocation',
  async ({ id, label, lat, lng }, { rejectWithValue }) => {
    try {
      return await apiClient.updatePresentLocation(id, { label, lat, lng });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/** §18 — admin records the measured weight; the backend re-prices off it. */
export const verifyWeight = createAsyncThunk(
  'orders/verifyWeight',
  async ({ id, weightKg }, { rejectWithValue }) => {
    try {
      return await apiClient.verifyWeight(id, { weightKg });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const changeDestination = createAsyncThunk(
  'orders/changeDestination',
  async ({ id, destination, route }, { rejectWithValue }) => {
    try {
      return await apiClient.changeDestination(id, { destination, route });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelOrder = createAsyncThunk('orders/cancel', async (id, { rejectWithValue }) => {
  try {
    return await apiClient.cancelOrder(id);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  entities: {},
  ids: [],
  status: 'idle',
  error: null,
  /** id of the order the admin console currently has selected */
  selectedId: null
};

const upsert = (state, order) => {
  if (!order) return;
  state.entities[order.id] = order;
  if (!state.ids.includes(order.id)) state.ids.unshift(order.id);
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    selectOrder(state, action) {
      state.selectedId = action.payload;
    },
    clearOrderError(state) {
      state.error = null;
    },
    /** Applied when the mock backend broadcasts a change from another tab (§18). */
    ordersReplaced(state, action) {
      const list = action.payload || [];
      state.entities = Object.fromEntries(list.map((order) => [order.id, order]));
      state.ids = list.map((order) => order.id);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrder.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        upsert(state, action.payload);
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Could not load that order.';
      });

    for (const thunk of [fetchOrders, fetchAllOrders]) {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const list = action.payload || [];
        for (const order of list) upsert(state, order);
        state.ids = list.map((order) => order.id);
      });
    }

    for (const thunk of [
      changeStatus,
      moveCourier,
      dispatchAgent,
      setPresentLocation,
      verifyWeight,
      changeDestination,
      cancelOrder
    ]) {
      builder
        .addCase(thunk.fulfilled, (state, action) => {
          upsert(state, action.payload);
          state.error = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.error = action.payload || 'That action could not be completed.';
        });
    }
  }
});

export const { selectOrder, clearOrderError, ordersReplaced } = ordersSlice.actions;

export const selectOrderById = (id) => (state) => state.orders.entities[id] || null;
// Memoized: it builds a new array, so an unmemoized version would re-render the admin
// table and order list on every unrelated dispatch.
export const selectAllOrders = createSelector(
  [(state) => state.orders.ids, (state) => state.orders.entities],
  (ids, entities) => ids.map((id) => entities[id]).filter(Boolean)
);
export const selectOrdersError = (state) => state.orders.error;

// --- dashboard selectors (§15) ----------------------------------------------

/**
 * The delivery the customer is actually watching: the one furthest along that hasn't
 * finished. Memoized — like selectAllOrders, it derives rather than reads.
 */
export const selectActiveOrder = createSelector([selectAllOrders], (orders) => {
  const live = orders.filter((order) => !isTerminal(order.status));
  if (!live.length) return null;
  return live.reduce((best, order) => (stepIndex(order.status) > stepIndex(best.status) ? order : best), live[0]);
});

/** Counts behind the dashboard and the console's tiles. */
export const selectOrderStats = createSelector([selectAllOrders], (orders) => {
  const counts = Object.fromEntries(Object.values(STATUS).map((status) => [status, 0]));
  for (const order of orders) counts[order.status] = (counts[order.status] || 0) + 1;
  return {
    ...counts,
    total: orders.length,
    active: orders.filter((order) => !isTerminal(order.status)).length,
    spend: orders
      .filter((order) => order.status !== STATUS.CANCELLED)
      .reduce((sum, order) => sum + (order.pricing?.total || 0), 0)
  };
});

/** Counts by transport mode, for the console's capacity panel. */
export const selectModeLoad = createSelector([selectAllOrders], (orders) => {
  const load = {};
  for (const order of orders) {
    if (isTerminal(order.status)) continue;
    const mode = transportOf(order);
    load[mode] = (load[mode] || 0) + 1;
  }
  return load;
});

export default ordersSlice.reducer;

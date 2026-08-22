// §13–§18 — placed orders. One record per id keyed in `entities`, so the tracking
// screen, the order-details screen and the admin table all read the same object and
// a live update from any of them is reflected everywhere at once.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as apiClient from '../api';

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

    for (const thunk of [changeStatus, moveCourier, changeDestination, cancelOrder]) {
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

export default ordersSlice.reducer;

// §27 — everything the admin portal owns that is not an order and not the fleet:
// the account directory, the courier roster, the audit trail, the notification
// outbox and the platform settings. One slice because they are one screen group
// with one refresh cycle, and splitting them would give five reducers that are
// always fetched together.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as apiClient from '../api';
import { DEFAULT_SETTINGS } from '../api';
import { ROLE, isStaffRole, roleOf } from '../lib/roles';

/** Every mutation reports its failure the same way — AppLayout turns it into a toast. */
const failable = (name, fn) =>
  createAsyncThunk(name, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const fetchUsers = failable('admin/fetchUsers', () => apiClient.listUsers());
export const fetchCouriers = failable('admin/fetchCouriers', () => apiClient.listCouriers());
export const fetchAuditLog = failable('admin/fetchAuditLog', () => apiClient.listAuditLog());
export const fetchNotifications = failable('admin/fetchNotifications', () => apiClient.listNotifications());
export const fetchSettings = failable('admin/fetchSettings', () => apiClient.getSettings());

export const setUserRole = failable('admin/setUserRole', ({ id, role }) => apiClient.setUserRole(id, role));
export const setUserSuspended = failable('admin/setUserSuspended', ({ id, suspended }) =>
  apiClient.setUserSuspended(id, suspended)
);
export const setCourierShift = failable('admin/setCourierShift', ({ id, onShift }) =>
  apiClient.setCourierShift(id, onShift)
);
export const updateSettings = failable('admin/updateSettings', (patch) => apiClient.updateSettings(patch));

const initialState = {
  users: [],
  couriers: [],
  audit: [],
  notifications: [],
  settings: DEFAULT_SETTINGS,
  status: 'idle',
  error: null
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload || [];
        state.status = 'succeeded';
      })
      .addCase(fetchCouriers.fulfilled, (state, action) => {
        state.couriers = action.payload || [];
        state.status = 'succeeded';
      })
      .addCase(fetchAuditLog.fulfilled, (state, action) => {
        state.audit = action.payload || [];
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload || [];
      })
      // setCourierShift returns the whole roster: a shift change moves one row's
      // status and every row's share of the workload, so the list is re-read rather
      // than patched.
      .addCase(setCourierShift.fulfilled, (state, action) => {
        state.couriers = action.payload || [];
        state.error = null;
      });

    for (const thunk of [setUserRole, setUserSuspended]) {
      builder.addCase(thunk.fulfilled, (state, action) => {
        const updated = action.payload;
        state.users = state.users.map((user) => (user.id === updated.id ? updated : user));
        state.error = null;
      });
    }

    for (const thunk of [fetchSettings, updateSettings]) {
      builder.addCase(thunk.fulfilled, (state, action) => {
        if (action.payload) state.settings = { ...DEFAULT_SETTINGS, ...action.payload };
        state.error = null;
      });
    }

    builder.addMatcher(
      (action) => action.type.startsWith('admin/') && action.type.endsWith('/rejected'),
      (state, action) => {
        // A staff member who simply cannot see a screen is not an error worth
        // shouting about; a refused *action* is. The screens gate themselves, so
        // anything that reaches here after a click deserves the toast.
        state.error = action.payload || 'That action could not be completed.';
      }
    );
  }
});

export const { clearAdminError } = adminSlice.actions;

export const selectUsers = (state) => state.admin.users;
export const selectCouriers = (state) => state.admin.couriers;
export const selectAuditLog = (state) => state.admin.audit;
export const selectNotifications = (state) => state.admin.notifications;
export const selectSettings = (state) => state.admin.settings;
export const selectAdminError = (state) => state.admin.error;

/** Colleagues first: the accounts screen is mostly used to check who has what. */
export const selectStaff = createSelector([selectUsers], (users) =>
  users.filter((user) => isStaffRole(roleOf(user)))
);

export const selectCustomers = createSelector([selectUsers], (users) =>
  users.filter((user) => roleOf(user) === ROLE.CUSTOMER)
);

export const selectOnShiftCount = createSelector([selectCouriers], (couriers) =>
  couriers.filter((courier) => courier.onShift).length
);

export default adminSlice.reducer;

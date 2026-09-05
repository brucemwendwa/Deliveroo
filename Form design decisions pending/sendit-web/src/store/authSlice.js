// §12 — session state. The modal itself is UI state and lives in uiSlice; this slice
// owns who is signed in and the two-step OTP exchange.

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as apiClient from '../api';

export const loadSession = createAsyncThunk('auth/loadSession', () => apiClient.getSession());

export const requestOtp = createAsyncThunk('auth/requestOtp', async (payload, { rejectWithValue }) => {
  try {
    return await apiClient.requestOtp(payload);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async (payload, { rejectWithValue }) => {
  try {
    return await apiClient.verifyOtp(payload);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const signOut = createAsyncThunk('auth/signOut', () => apiClient.signOut());

const initialState = {
  user: null,
  /** 'identify' → collect email/phone, 'verify' → collect the code */
  stage: 'identify',
  /**
   * 'signin' or 'signup'. The exchange is identical either way — this is a
   * passwordless system, so an account is created by the first successful verify —
   * but the two intents want different copy and 'signup' also collects a name, which
   * verifyOtp accepts and stores on the account.
   */
  mode: 'signin',
  identifier: '',
  name: '',
  channel: 'email',
  status: 'idle',
  error: null,
  hint: null,
  /** When the last code went out, so the UI can hold the resend for a moment. */
  codeSentAt: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setChannel(state, action) {
      state.channel = action.payload;
      state.error = null;
    },
    setMode(state, action) {
      state.mode = action.payload;
      state.stage = 'identify';
      state.error = null;
      state.hint = null;
    },
    setName(state, action) {
      state.name = action.payload;
      state.error = null;
    },
    setIdentifier(state, action) {
      state.identifier = action.payload;
      state.error = null;
    },
    backToIdentify(state) {
      state.stage = 'identify';
      state.error = null;
    },
    resetAuthFlow(state) {
      state.stage = 'identify';
      state.status = 'idle';
      state.error = null;
      state.hint = null;
      state.codeSentAt = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSession.fulfilled, (state, action) => {
        state.user = action.payload || null;
      })
      .addCase(requestOtp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.status = 'idle';
        state.stage = 'verify';
        state.hint = action.payload?.hint || null;
        state.codeSentAt = Date.now();
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload || 'Could not send a code.';
      })
      .addCase(verifyOtp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload;
        state.stage = 'identify';
        state.hint = null;
        state.name = '';
        state.codeSentAt = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload || 'Could not verify that code.';
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
      });
  }
});

export const { setChannel, setMode, setName, setIdentifier, backToIdentify, resetAuthFlow } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectIsSignedIn = (state) => Boolean(state.auth.user);
export const selectIsAdmin = (state) => Boolean(state.auth.user?.isAdmin);

export default authSlice.reducer;

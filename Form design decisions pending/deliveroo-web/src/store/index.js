import { configureStore } from '@reduxjs/toolkit';
import ui from './uiSlice';
import auth from './authSlice';
import booking from './bookingSlice';
import orders from './ordersSlice';

export const makeStore = () => configureStore({ reducer: { ui, auth, booking, orders } });

export const store = makeStore();

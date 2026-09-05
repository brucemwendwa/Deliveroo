import { configureStore } from '@reduxjs/toolkit';
import ui from './uiSlice';
import auth from './authSlice';
import booking from './bookingSlice';
import orders from './ordersSlice';
import fleet from './fleetSlice';
import admin from './adminSlice';

export const makeStore = () => configureStore({ reducer: { ui, auth, booking, orders, fleet, admin } });

export const store = makeStore();

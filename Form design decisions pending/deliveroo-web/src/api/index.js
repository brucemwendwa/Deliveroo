// Single entry point for data access. Everything in the app imports from here —
// never from mockBackend or client directly — so switching to the real Flask API
// is a matter of setting VITE_API_URL and nothing else.

import { USE_MOCK_BACKEND } from './viteEnv';
import * as mock from './mockBackend';
import { api } from './client';

/** Which implementation is live. The admin console prints this so it's never a mystery. */
export const usingMockBackend = USE_MOCK_BACKEND;

// The HTTP side is written against the endpoints the Flask app is expected to expose.
// Shapes match the mock exactly, which is what makes the two interchangeable.
const http = {
  requestOtp: (payload) => api('/auth/otp', { method: 'POST', body: payload }),
  verifyOtp: (payload) => api('/auth/verify', { method: 'POST', body: payload }),
  getSession: () => api('/auth/session'),
  signOut: () => api('/auth/session', { method: 'DELETE' }),

  createOrder: (draft) => api('/orders', { method: 'POST', body: draft }),
  getOrder: (id) => api(`/orders/${id}`),
  listOrders: (userId) => api(`/orders${userId ? `?user=${encodeURIComponent(userId)}` : ''}`),
  listAllOrders: () => api('/admin/orders'),
  updateOrderStatus: (id, status) => api(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  updateCourierPosition: (id, position) => api(`/orders/${id}/courier`, { method: 'PATCH', body: position }),
  changeDestination: (id, payload) => api(`/orders/${id}/destination`, { method: 'PATCH', body: payload }),
  cancelOrder: (id) => api(`/orders/${id}/cancel`, { method: 'POST' }),

  seedIfEmpty: () => {},
  // No storage events across a network, so fall back to polling. Swap for SSE or a
  // websocket when the backend can push.
  subscribe: (listener) => {
    const timer = setInterval(listener, 5000);
    return () => clearInterval(timer);
  }
};

const impl = USE_MOCK_BACKEND ? mock : http;

export const requestOtp = (...args) => impl.requestOtp(...args);
export const verifyOtp = (...args) => impl.verifyOtp(...args);
export const getSession = (...args) => impl.getSession(...args);
export const signOut = (...args) => impl.signOut(...args);

export const createOrder = (...args) => impl.createOrder(...args);
export const getOrder = (...args) => impl.getOrder(...args);
export const listOrders = (...args) => impl.listOrders(...args);
export const listAllOrders = (...args) => impl.listAllOrders(...args);
export const updateOrderStatus = (...args) => impl.updateOrderStatus(...args);
export const updateCourierPosition = (...args) => impl.updateCourierPosition(...args);
export const changeDestination = (...args) => impl.changeDestination(...args);
export const cancelOrder = (...args) => impl.cancelOrder(...args);

export const seedIfEmpty = (...args) => impl.seedIfEmpty(...args);
export const subscribe = (...args) => impl.subscribe(...args);

export { MOCK_OTP } from './mockBackend';
export * from './geo';

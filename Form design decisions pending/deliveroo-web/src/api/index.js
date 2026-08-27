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
  // §25 — dispatch finds and attaches a pickup agent. The server owns the matching;
  // the client only asks. Must be idempotent: the confirmation screen may retry.
  assignAgent: (id) => api(`/orders/${id}/assign`, { method: 'POST' }),
  // §26 — staff-only: where the parcel currently is, in words.
  updatePresentLocation: (id, payload) => api(`/orders/${id}/location`, { method: 'PATCH', body: payload }),
  // §26 — which transport capacity dispatch can book into today.
  getFleet: () => api('/transport/availability'),
  setFleetStatus: (mode, status) =>
    api('/admin/transport/availability', { method: 'PATCH', body: { mode, status } }),
  // Staff-only on the server. The console gates the button, the route gates the data.
  verifyWeight: (id, payload) => api(`/admin/orders/${id}/weight`, { method: 'PATCH', body: payload }),

  // §27 — the rest of the admin portal. Everything under /admin is staff-only, and
  // the three account routes are administrator-only; see src/lib/roles.js for the
  // grant table the Flask side has to mirror.
  listUsers: () => api('/admin/users'),
  setUserRole: (id, role) => api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  setUserSuspended: (id, suspended) =>
    api(`/admin/users/${id}/suspension`, { method: 'PATCH', body: { suspended } }),
  listCouriers: () => api('/admin/couriers'),
  setCourierShift: (id, onShift) =>
    api(`/admin/couriers/${id}/shift`, { method: 'PATCH', body: { onShift } }),
  listAuditLog: () => api('/admin/audit'),
  listNotifications: () => api('/admin/notifications'),
  getSettings: () => api('/settings'),
  updateSettings: (patch) => api('/admin/settings', { method: 'PATCH', body: patch }),
  // Demo-only: there is nothing to re-seed on a real database, and a button that
  // wiped one would be the worst button in the product.
  resetDemoData: () => {
    throw new Error('Demo data can only be reset against the local demo backend.');
  },
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
export const assignAgent = (...args) => impl.assignAgent(...args);
export const updatePresentLocation = (...args) => impl.updatePresentLocation(...args);
export const getFleet = (...args) => impl.getFleet(...args);
export const setFleetStatus = (...args) => impl.setFleetStatus(...args);
export const verifyWeight = (...args) => impl.verifyWeight(...args);

export const listUsers = (...args) => impl.listUsers(...args);
export const setUserRole = (...args) => impl.setUserRole(...args);
export const setUserSuspended = (...args) => impl.setUserSuspended(...args);
export const listCouriers = (...args) => impl.listCouriers(...args);
export const setCourierShift = (...args) => impl.setCourierShift(...args);
export const listAuditLog = (...args) => impl.listAuditLog(...args);
export const listNotifications = (...args) => impl.listNotifications(...args);
export const getSettings = (...args) => impl.getSettings(...args);
export const updateSettings = (...args) => impl.updateSettings(...args);
export const resetDemoData = (...args) => impl.resetDemoData(...args);
export const changeDestination = (...args) => impl.changeDestination(...args);
export const cancelOrder = (...args) => impl.cancelOrder(...args);

export const seedIfEmpty = (...args) => impl.seedIfEmpty(...args);
export const subscribe = (...args) => impl.subscribe(...args);

export { MOCK_OTP, DEFAULT_SETTINGS } from './mockBackend';
export * from './geo';

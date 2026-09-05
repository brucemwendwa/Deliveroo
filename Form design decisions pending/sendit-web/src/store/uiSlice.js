import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  /** true once the page has scrolled past the hero top edge — drives the nav backdrop */
  scrolled: false,
  /** viewport under 980px: nav collapses into the hamburger */
  narrow: false,
  mobileMenuOpen: false,
  ctaHover: false,
  /** §12 — auth is a modal; `returnTo` remembers what the user was doing */
  authModal: { open: false, returnTo: null },
  /** §22 — transient confirmations: { id, message, tone } */
  toast: null
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setScrolled(state, action) {
      state.scrolled = action.payload;
    },
    setNarrow(state, action) {
      state.narrow = action.payload;
      if (!action.payload) state.mobileMenuOpen = false;
    },
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    closeMobileMenu(state) {
      state.mobileMenuOpen = false;
    },
    setCtaHover(state, action) {
      state.ctaHover = action.payload;
    },
    openAuthModal(state, action) {
      state.authModal = { open: true, returnTo: action.payload ?? null };
      state.mobileMenuOpen = false;
    },
    closeAuthModal(state) {
      state.authModal = { open: false, returnTo: null };
    },
    showToast(state, action) {
      const { message, tone = 'info' } = action.payload;
      state.toast = { id: Date.now(), message, tone };
    },
    dismissToast(state) {
      state.toast = null;
    }
  }
});

export const {
  setScrolled,
  setNarrow,
  toggleMobileMenu,
  closeMobileMenu,
  setCtaHover,
  openAuthModal,
  closeAuthModal,
  showToast,
  dismissToast
} = uiSlice.actions;

export const selectUi = (state) => state.ui;
export const selectMobileMenuOpen = (state) => state.ui.narrow && state.ui.mobileMenuOpen;
export const selectAuthModal = (state) => state.ui.authModal;
export const selectToast = (state) => state.ui.toast;

export default uiSlice.reducer;

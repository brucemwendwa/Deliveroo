import reducer, {
  closeAuthModal,
  closeMobileMenu,
  dismissToast,
  openAuthModal,
  setCtaHover,
  setNarrow,
  setScrolled,
  showToast,
  toggleMobileMenu
} from '../store/uiSlice';

const initial = reducer(undefined, { type: 'init' });

describe('uiSlice', () => {
  it('starts closed and unscrolled', () => {
    expect(initial).toEqual({
      scrolled: false,
      narrow: false,
      mobileMenuOpen: false,
      ctaHover: false,
      authModal: { open: false, returnTo: null },
      toast: null
    });
  });

  it('tracks the scrolled flag', () => {
    expect(reducer(initial, setScrolled(true)).scrolled).toBe(true);
  });

  it('toggles the mobile menu', () => {
    const open = reducer(initial, toggleMobileMenu());
    expect(open.mobileMenuOpen).toBe(true);
    expect(reducer(open, closeMobileMenu()).mobileMenuOpen).toBe(false);
  });

  it('closes the mobile menu when the viewport grows past the breakpoint', () => {
    const narrowOpen = reducer(reducer(initial, setNarrow(true)), toggleMobileMenu());
    expect(narrowOpen.mobileMenuOpen).toBe(true);
    const wide = reducer(narrowOpen, setNarrow(false));
    expect(wide.narrow).toBe(false);
    expect(wide.mobileMenuOpen).toBe(false);
  });

  it('records CTA hover', () => {
    expect(reducer(initial, setCtaHover(true)).ctaHover).toBe(true);
  });

  it('remembers where to send the user back to after signing in', () => {
    const open = reducer(initial, openAuthModal('book'));
    expect(open.authModal).toEqual({ open: true, returnTo: 'book' });
    expect(reducer(open, closeAuthModal()).authModal.open).toBe(false);
  });

  it('closes the mobile menu when the auth modal opens over it', () => {
    const menuOpen = reducer(initial, toggleMobileMenu());
    expect(reducer(menuOpen, openAuthModal(null)).mobileMenuOpen).toBe(false);
  });

  it('raises and dismisses a toast', () => {
    const withToast = reducer(initial, showToast({ message: 'Delivery confirmed.', tone: 'success' }));
    expect(withToast.toast).toMatchObject({ message: 'Delivery confirmed.', tone: 'success' });
    expect(reducer(withToast, dismissToast()).toast).toBeNull();
  });
});

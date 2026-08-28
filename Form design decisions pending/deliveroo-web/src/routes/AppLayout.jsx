import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadSession } from '../store/authSlice';
import { clearFleetError, fetchFleet, selectFleetError } from '../store/fleetSlice';
import { clearOrderError, selectOrdersError } from '../store/ordersSlice';
import { clearAdminError, fetchSettings, selectAdminError } from '../store/adminSlice';
import { showToast } from '../store/uiSlice';
import useNarrowViewport from '../hooks/useNarrowViewport';
import { seedIfEmpty } from '../api';
import { color, font } from '../theme';
import Nav from '../components/Nav';
import MobileMenu from '../components/MobileMenu';
import BottomNav, { BOTTOM_NAV_HEIGHT } from '../components/BottomNav';
import SiteFooter from '../components/SiteFooter';
import GooFilter from '../components/GooFilter';
import AuthModal from '../components/auth/AuthModal';
import Toast from '../components/ui/Toast';
import { BOOKING_PATH } from '../hooks/useStartBooking';

/** Anchor links carry a hash across routes; this does the scrolling on arrival. */
function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    // Wait a frame so the target section exists after a route change.
    const timer = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}

export default function AppLayout() {
  const dispatch = useDispatch();
  const narrow = useSelector((state) => state.ui.narrow);
  const { pathname } = useLocation();
  // Every failed mutation reports the same way, in one place, rather than each screen
  // inventing its own error strip — or worse, failing silently.
  const orderError = useSelector(selectOrdersError);
  const fleetError = useSelector(selectFleetError);
  const adminError = useSelector(selectAdminError);
  const failure = orderError || fleetError || adminError;
  useNarrowViewport();

  useEffect(() => {
    if (!failure) return;
    dispatch(showToast({ message: failure, tone: 'error' }));
    // Cleared once shown, or the same failure would toast again on the next render.
    dispatch(clearOrderError());
    dispatch(clearFleetError());
    dispatch(clearAdminError());
  }, [dispatch, failure]);

  useEffect(() => {
    dispatch(loadSession());
    seedIfEmpty();
    // Transport availability gates what booking may offer, so it is loaded once at
    // the top rather than by each screen that happens to need it. Platform settings
    // are read here for the same reason: a paused platform has to be visible on the
    // booking screen, not only inside the portal that paused it.
    dispatch(fetchFleet());
    dispatch(fetchSettings());
  }, [dispatch]);

  // The booking flow carries its own fixed quote bar; two stacked bars on a phone is
  // one too many, so the flow keeps the bottom edge to itself.
  const showBottomNav = narrow && pathname !== BOOKING_PATH;

  return (
    <div
      style={{
        background: color.paper,
        fontFamily: font.body,
        color: color.inkSoft,
        overflowX: 'hidden',
        paddingBottom: showBottomNav ? `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom,0px))` : undefined
      }}
    >
      <GooFilter />
      <ScrollToHash />
      <Nav />
      <MobileMenu />
      <Outlet />
      <SiteFooter brand="Send it" />
      {showBottomNav && <BottomNav />}
      <AuthModal />
      <Toast />
    </div>
  );
}

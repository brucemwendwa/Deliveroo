import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsSignedIn } from '../store/authSlice';
import { openAuthModal } from '../store/uiSlice';

export const BOOKING_PATH = '/book';

/**
 * Whether the "Request delivery" shortcut belongs in the nav on this route.
 *
 * On the booking form it points at the page you are already filling in, and on the
 * confirmation screen it invites you to start again the moment you finished. The
 * admin portal is a staff console, not a place to send a parcel from. Everywhere
 * else the shortcut is the fastest way back to booking, so it stays.
 */
export function showsBookingCta(pathname = '') {
  if (pathname === BOOKING_PATH) return false;
  if (/^\/orders\/[^/]+\/confirmation$/.test(pathname)) return false;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return false;
  return true;
}

/**
 * Every "send a package" CTA runs through here so the gate is identical wherever it
 * is pressed: signed in goes straight to the booking page, signed out opens the auth
 * modal first, which lands on /book once the code checks out.
 *
 * Returns a click handler. Attach it to a Link pointing at BOOKING_PATH so the
 * control is still a real link — middle-click, copy-link and Ctrl+click keep working,
 * and /book gates itself for anyone who arrives that way.
 */
export default function useStartBooking() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const signedIn = useSelector(selectIsSignedIn);

  return (event) => {
    if (event?.defaultPrevented) return;
    // Let the browser handle new-tab and download intents.
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return;

    event?.preventDefault();
    if (signedIn) {
      navigate(BOOKING_PATH);
      return;
    }
    dispatch(openAuthModal(BOOKING_PATH));
  };
}

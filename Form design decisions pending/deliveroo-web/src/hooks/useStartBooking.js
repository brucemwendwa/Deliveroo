import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsSignedIn } from '../store/authSlice';
import { openAuthModal } from '../store/uiSlice';

export const BOOKING_PATH = '/book';

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

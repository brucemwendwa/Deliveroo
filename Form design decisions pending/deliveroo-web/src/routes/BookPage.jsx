import { useDispatch, useSelector } from 'react-redux';
import { selectIsSignedIn } from '../store/authSlice';
import { openAuthModal } from '../store/uiSlice';
import { color } from '../theme';
import BookDelivery from '../components/booking/BookDelivery';
import Button from '../components/ui/Button';
import PageShell from './PageShell';

/**
 * Booking on its own route rather than a section of the landing page, so the CTAs
 * navigate somewhere instead of scrolling.
 *
 * The CTAs already ask for sign-in before sending anyone here, but this gate is the
 * one that actually holds: without it, typing /book straight into the address bar
 * would walk past the check.
 */
export default function BookPage() {
  const dispatch = useDispatch();
  const signedIn = useSelector(selectIsSignedIn);

  if (!signedIn) {
    return (
      <PageShell eyebrow="Book a delivery" title="Sign in to send a package.">
        <p style={{ margin: '0 0 24px', maxWidth: '46ch', fontSize: '16px', lineHeight: 1.6, color: color.body }}>
          We need to know who is sending, so we can keep you posted on the handover and the drop-off.
        </p>
        <Button onClick={() => dispatch(openAuthModal('/book'))} icon="arrow_forward">
          Sign in to continue
        </Button>
      </PageShell>
    );
  }

  return (
    <>
      {/*
        BookDelivery brings its own "Send a package." display heading, so PageShell
        here would compete with it. It still needs the dark strip PageShell exists to
        provide: the fixed nav is white text sized for the hero photo, and this
        section starts on light paper.
      */}
      <div style={{ background: color.greenDeep, height: '80px' }} />
      <BookDelivery />
    </>
  );
}

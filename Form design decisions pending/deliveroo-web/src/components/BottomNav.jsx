import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsSignedIn } from '../store/authSlice';
import { openAuthModal, toggleMobileMenu } from '../store/uiSlice';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, font, layout, radius } from '../theme';
import Icon from './Icon';

/** Height the layout has to leave clear beneath the footer. */
export const BOTTOM_NAV_HEIGHT = 68;

const ITEMS = [
  { to: '/', icon: 'home', label: 'Home', exact: true },
  { to: '/track', icon: 'near_me', label: 'Track' },
  { to: '/orders', icon: 'inventory_2', label: 'Deliveries' }
];

/**
 * §23 — phone navigation. Four destinations and the one action the whole product is
 * for, in the bottom third of the screen where a thumb actually reaches. Desktop keeps
 * the top nav; this is rendered only below the breakpoint.
 */
export default function BottomNav() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const signedIn = useSelector(selectIsSignedIn);
  const startBooking = useStartBooking();

  const isActive = (item) => (item.exact ? pathname === item.to : pathname.startsWith(item.to));

  const tab = (active) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    flex: 1,
    minWidth: 0,
    height: '100%',
    border: 'none',
    background: 'transparent',
    fontFamily: font.body,
    fontSize: '10.5px',
    fontWeight: 600,
    letterSpacing: '.01em',
    color: active ? color.ink : color.muted,
    cursor: 'pointer'
  });

  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 870,
        display: 'flex',
        alignItems: 'center',
        height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom,0px))`,
        paddingBottom: 'env(safe-area-inset-bottom,0px)',
        paddingInline: `max(8px, calc(${layout.gutter} - 16px))`,
        background: 'rgba(243,243,241,.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: `1px solid ${color.border}`
      }}
    >
      {ITEMS.slice(0, 2).map((item) => (
        <Link key={item.to} to={item.to} style={tab(isActive(item))}>
          <Icon name={item.icon} size={21} color={isActive(item) ? color.orangeDeep : color.muted} />
          {item.label}
        </Link>
      ))}

      {/* The request button is the reason the app exists, so it is the one control
          that leaves the row and carries the brand colour. */}
      <Link
        to={BOOKING_PATH}
        onClick={startBooking}
        aria-label="Request a delivery"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          width: '58px',
          height: '58px',
          margin: '0 6px',
          marginTop: '-20px',
          borderRadius: radius.pill,
          background: color.orange,
          color: color.ink,
          boxShadow: '0 14px 26px -12px rgba(28,32,31,.6)',
          transition: `transform .2s ${ease.spring}`
        }}
      >
        <Icon name="add" size={26} />
      </Link>

      {ITEMS.slice(2).map((item) => (
        <Link key={item.to} to={item.to} style={tab(isActive(item))}>
          <Icon name={item.icon} size={21} color={isActive(item) ? color.orangeDeep : color.muted} />
          {item.label}
        </Link>
      ))}

      <button
        type="button"
        onClick={() => (signedIn ? dispatch(toggleMobileMenu()) : dispatch(openAuthModal(null)))}
        style={tab(false)}
      >
        <Icon name={signedIn ? 'menu' : 'person'} size={21} color={color.muted} />
        {signedIn ? 'Menu' : 'Sign in'}
      </button>
    </nav>
  );
}

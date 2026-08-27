import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showToast, toggleMobileMenu } from '../store/uiSlice';
import { selectIsSignedIn, selectUser, signOut } from '../store/authSlice';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, hover, layout, radius } from '../theme';
import HoverLink from './HoverLink';
import NavDropdown from './NavDropdown';
import Wordmark from './Wordmark';
import Icon from './Icon';

// Three grouped menus. Section links carry the leading "/" so they work from the
// tracking and admin routes too; ScrollToHash does the scrolling. "Talk to sales",
// "About us" and "Help centre" have no pages of their own yet, so they point at the
// footer (which carries the phone, email and address) and the services section.
export const NAV_MENUS = [
  {
    label: 'Services',
    items: [
      { label: 'Same-day courier', to: '/#services' },
      { label: 'Package delivery', to: '/#services' },
      { label: 'Business logistics', to: '/#services' }
    ]
  },
  {
    label: 'Track Delivery',
    items: [{ label: 'Track a parcel', to: '/track' }]
  },
  {
    label: 'Contact',
    items: [
      { label: 'Talk to sales', to: '/#footer' },
      { label: 'About us', to: '/#services' },
      { label: 'Help centre', to: '/#footer' }
    ]
  }
];

const topLink = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: '16.5px',
  fontWeight: 700,
  color: color.white,
  letterSpacing: '-.012em',
  textShadow: '0 1px 12px rgba(17,17,17,.45)'
};

const initialOf = (name) => (name || '').trim().charAt(0).toUpperCase() || '?';

/** Signed-in replacement for the Get Started CTA. */
function ProfileMenu({ user }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = [
    { label: 'My deliveries', to: '/orders' },
    ...(user.isAdmin ? [{ label: 'Dispatch console', to: '/admin' }] : []),
    {
      label: 'Sign out',
      tone: 'quiet',
      onSelect: async () => {
        await dispatch(signOut());
        dispatch(showToast({ message: 'Signed out.', tone: 'info' }));
        // The account routes gate themselves, so leaving the user on one would
        // just swap the page for a sign-in prompt.
        navigate('/');
      }
    }
  ];

  return (
    <NavDropdown
      label={user.name}
      items={items}
      align="right"
      triggerContent={
        <>
          <span
            aria-hidden="true"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: radius.pill,
              background: color.orange,
              color: color.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: 0
            }}
          >
            {initialOf(user.name)}
          </span>
          <span style={{ maxWidth: '15ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </span>
        </>
      }
      triggerStyle={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        height: '44px',
        padding: '0 14px 0 7px',
        marginLeft: '8px',
        borderRadius: radius.pill,
        background: 'rgba(255,255,255,.13)',
        border: '1px solid rgba(255,255,255,.3)',
        color: color.white,
        fontSize: '14.5px',
        fontWeight: 700,
        letterSpacing: '-.012em'
      }}
    />
  );
}

export default function Nav() {
  const dispatch = useDispatch();
  const { scrolled, narrow, mobileMenuOpen } = useSelector((state) => state.ui);
  const signedIn = useSelector(selectIsSignedIn);
  const user = useSelector(selectUser);
  const startBooking = useStartBooking();

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900, height: '80px' }}>
      {/* Unchanged from the approved design: transparent over the hero, dark once scrolled. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: scrolled ? 1 : 0,
          transition: 'opacity .35s ease',
          background: 'rgba(17,17,17,.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,.14)'
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `0 ${layout.gutter}`,
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(14px,3vw,40px)'
        }}
      >
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
          <Link to="/" aria-label="Deliveroo — home" style={{ display: 'flex' }}>
            <Wordmark />
          </Link>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.5em',
              marginTop: '-2px',
              paddingLeft: '.1em',
              fontSize: 'clamp(9.5px,.78vw,11.5px)',
              fontWeight: 700,
              letterSpacing: '.19em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              color: color.white,
              textShadow: '0 1px 10px rgba(17,17,17,.6)'
            }}
          >
            <span>Ship It</span>
            <span aria-hidden="true" style={{ width: '3px', height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,.5)' }} />
            <span style={{ color: color.orange }}>Watch It</span>
            <span aria-hidden="true" style={{ width: '3px', height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,.5)' }} />
            <span>Land It</span>
          </div>
        </div>

        {!narrow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px,2vw,34px)', marginLeft: 'auto' }}>
            {NAV_MENUS.map((menu) => (
              <NavDropdown key={menu.label} label={menu.label} items={menu.items} triggerStyle={topLink} />
            ))}

            {/*
              Signed in, the profile takes the CTA slot: someone with an account does
              not need to be told to get started, and the account is what they came to
              the top-right corner looking for.
            */}
            {signedIn ? (
              <>
                {/* Signed in, the CTA changes job: not "get started" but the action
                    the account exists for. */}
                <HoverLink
                  as={Link}
                  to={BOOKING_PATH}
                  onClick={startBooking}
                  hoverStyle={hover.yellow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    height: '44px',
                    padding: '0 20px',
                    borderRadius: radius.pill,
                    background: color.orange,
                    color: color.ink,
                    fontSize: '14.5px',
                    fontWeight: 700,
                    transition: `transform .2s ${ease.out}, box-shadow .2s`
                  }}
                >
                  <Icon name="add" size={17} />
                  Request delivery
                </HoverLink>
                <ProfileMenu user={user} />
              </>
            ) : (
              <HoverLink
                as={Link}
                to={BOOKING_PATH}
                onClick={startBooking}
                hoverStyle={hover.yellow}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '44px',
                  padding: '0 22px',
                  borderRadius: radius.pill,
                  background: color.orange,
                  color: color.ink,
                  fontSize: '14.5px',
                  fontWeight: 700,
                  transition: `transform .2s ${ease.out}, box-shadow .2s`
                }}
              >
                Get Started
                <Icon name="arrow_outward" size={17} />
              </HoverLink>
            )}
          </div>
        )}

        {narrow && (
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => dispatch(toggleMobileMenu())}
            style={{
              marginLeft: 'auto',
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,.34)',
              background: 'rgba(17,17,17,.32)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={24} color={color.white} />
          </button>
        )}
      </div>
    </div>
  );
}

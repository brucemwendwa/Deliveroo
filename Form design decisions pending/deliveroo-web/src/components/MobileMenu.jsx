import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { closeMobileMenu, openAuthModal, selectMobileMenuOpen, showToast } from '../store/uiSlice';
import { selectIsSignedIn, selectUser, signOut } from '../store/authSlice';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, eyebrow, font, layout, radius } from '../theme';
import { NAV_MENUS } from './Nav';
import Icon from './Icon';

const outlineControl = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '56px',
  borderRadius: radius.pill,
  border: '1.5px solid rgba(17,17,17,.2)',
  fontFamily: font.body,
  fontSize: '16px',
  fontWeight: 700,
  color: color.ink
};

// §21 — full-screen panel rather than the old dropdown, with the items set large
// enough to hit comfortably (§23).
export default function MobileMenu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = useSelector(selectMobileMenuOpen);
  const signedIn = useSelector(selectIsSignedIn);
  const user = useSelector(selectUser);
  const startBooking = useStartBooking();

  if (!open) return null;
  const close = () => dispatch(closeMobileMenu());

  return (
    <div
      style={{
        position: 'fixed',
        inset: '80px 0 0',
        zIndex: 890,
        background: color.paper,
        padding: `clamp(18px,4vh,40px) ${layout.gutter} ${layout.gutter}`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        animation: `riseIn .28s ${ease.out} both`
      }}
    >
      {/*
        The desktop nav collapses its menus into click-to-open panels; on mobile a
        nested dropdown inside a full-screen panel is one tap too many, so each menu
        becomes a labelled group with its items listed flat beneath it.
      */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
        {NAV_MENUS.map((menu) => (
          <div key={menu.label}>
            <div style={{ ...eyebrow, marginBottom: '4px' }}>{menu.label}</div>
            {menu.items.map((item, index) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={close}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px 0',
                  borderBottom: index < menu.items.length - 1 ? '1px solid rgba(17,17,17,.09)' : undefined,
                  fontFamily: font.display,
                  fontWeight: 700,
                  fontSize: 'clamp(23px,6vw,32px)',
                  textTransform: 'uppercase',
                  letterSpacing: '.005em',
                  color: color.ink
                }}
              >
                {item.label}
                <Icon name="arrow_outward" size={22} color={color.orange} />
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Signed in, the account replaces the Get Started CTA — same rule as the
            desktop nav. */}
        {signedIn ? (
          <>
            <Link
              to={BOOKING_PATH}
              onClick={(event) => {
                close();
                startBooking(event);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '58px',
                borderRadius: radius.pill,
                background: color.orange,
                color: color.ink,
                fontSize: '16.5px',
                fontWeight: 700,
                fontFamily: font.body
              }}
            >
              <Icon name="add" size={20} />
              Request delivery
            </Link>
            <Link to="/orders" onClick={close} style={outlineControl}>
              {user.name} · My deliveries
            </Link>
            {/* §27 — staff get the portal here too: the desktop profile menu offers
                it, and a phone is where a shift lead actually reads the board. */}
            {user.isAdmin && (
              <Link to="/admin" onClick={close} style={outlineControl}>
                Admin portal
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                close();
                await dispatch(signOut());
                dispatch(showToast({ message: 'Signed out.', tone: 'info' }));
                navigate('/');
              }}
              style={{ ...outlineControl, background: 'transparent', cursor: 'pointer', color: color.muted }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                close();
                dispatch(openAuthModal(null));
              }}
              style={{ ...outlineControl, background: 'transparent', cursor: 'pointer' }}
            >
              Login
            </button>
            <Link
              to={BOOKING_PATH}
              onClick={(event) => {
                close();
                startBooking(event);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '58px',
                borderRadius: radius.pill,
                background: color.orange,
                color: color.ink,
                fontSize: '16.5px',
                fontWeight: 700,
                fontFamily: font.body
              }}
            >
              Get Started
              <Icon name="arrow_outward" size={19} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

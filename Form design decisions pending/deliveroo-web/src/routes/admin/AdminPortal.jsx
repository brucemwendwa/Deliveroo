import { useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, signOut } from '../../store/authSlice';
import { fetchAllOrders } from '../../store/ordersSlice';
import { fetchFleet } from '../../store/fleetSlice';
import {
  fetchAuditLog,
  fetchCouriers,
  fetchNotifications,
  fetchSettings,
  fetchUsers,
  selectSettings
} from '../../store/adminSlice';
import { openAuthModal, showToast } from '../../store/uiSlice';
import useOrderSync from '../../hooks/useOrderSync';
import { PERMISSION, ROLE_LABEL, can, isStaff, roleOf } from '../../lib/roles';
import { DEMO_STAFF, usingMockBackend } from '../../api';
import { color, eyebrow, font, radius } from '../../theme';
import AdminNav from '../../components/admin/AdminNav';
import { sectionForPath } from '../../components/admin/adminSections';
import Button from '../../components/ui/Button';
import Icon from '../../components/Icon';
import PageShell from '../PageShell';

/** Who is signed in and what that entitles them to, said plainly in the header. */
function Identity({ user }) {
  const role = roleOf(user);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '9px',
          height: '38px',
          padding: '0 16px',
          borderRadius: radius.pill,
          background: 'rgba(243,243,241,.1)',
          border: '1px solid rgba(243,243,241,.2)',
          color: color.paper,
          fontSize: '13.5px',
          fontWeight: 600
        }}
      >
        <Icon name="badge" size={17} color={color.orange} />
        {user.name} · {ROLE_LABEL[role]}
      </span>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: '10.5px',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'rgba(243,243,241,.55)'
        }}
      >
        {usingMockBackend ? 'Local demo data' : 'Live API'}
      </span>
    </div>
  );
}

/**
 * §27 — the admin portal.
 *
 * One shell around every staff screen: it decides whether the person may be here at
 * all, loads what the whole portal reads, keeps that data live through the same
 * cross-tab subscription the customer's tracking screen uses, and gives each section
 * its heading. The sections themselves are then free to be about their own subject.
 */
export default function AdminPortal() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const settings = useSelector(selectSettings);
  const { pathname } = useLocation();
  const staff = isStaff(user);
  const section = sectionForPath(pathname);

  // One place to (re)load everything the portal reads — on arrival, and again
  // whenever any tab writes. Each fetch is gated by the permission its endpoint
  // enforces, so a dispatcher opening the portal never fires a request the backend
  // will refuse and the layout will then toast about.
  const refresh = useCallback(() => {
    if (!staff) return;
    dispatch(fetchAllOrders());
    dispatch(fetchFleet());
    dispatch(fetchSettings());
    dispatch(fetchCouriers());
    if (can(user, PERMISSION.VIEW_ACCOUNTS)) dispatch(fetchUsers());
    if (can(user, PERMISSION.VIEW_AUDIT)) dispatch(fetchAuditLog());
    if (can(user, PERMISSION.VIEW_NOTIFICATIONS)) dispatch(fetchNotifications());
  }, [dispatch, staff, user]);

  useEffect(refresh, [refresh]);
  useOrderSync(refresh);

  // Refusal has to say which refusal it is. Being signed out and being signed in as a
  // customer are different problems with different fixes, and the old screen gave both
  // of them a "Sign in" button — which, for someone already signed in, opened a dialog
  // that said "you are already signed in" and went no further.
  if (!staff) {
    const signedIn = Boolean(user);
    return (
      <PageShell eyebrow="Admin" title={signedIn ? 'Not a staff account.' : 'Admin access required.'}>
        <p style={{ margin: '0 0 24px', maxWidth: '52ch', fontSize: '16px', lineHeight: 1.6, color: color.body }}>
          {signedIn ? (
            <>
              You are signed in as <strong style={{ color: color.ink }}>{user.name}</strong>, a{' '}
              {ROLE_LABEL[roleOf(user)].toLowerCase()}. The portal is for dispatchers and
              administrators, so there is nothing here for this account.
            </>
          ) : (
            'The admin portal is for staff accounts. Sign in to continue.'
          )}
        </p>
        {usingMockBackend && DEMO_STAFF.length ? (
          <p
            style={{
              margin: '0 0 24px',
              padding: '14px 18px',
              maxWidth: '52ch',
              borderRadius: radius.card,
              border: `1px dashed ${color.border}`,
              fontSize: '14px',
              lineHeight: 1.6,
              color: color.body
            }}
          >
            <strong style={{ color: color.ink }}>Running on demo data.</strong> Sign in as{' '}
            {DEMO_STAFF.map((person, index) => (
              <span key={person.identifier}>
                {index > 0 ? ' or ' : ''}
                <code style={{ color: color.ink }}>{person.identifier}</code> (
                {ROLE_LABEL[person.role].toLowerCase()})
              </span>
            ))}{' '}
            to see the portal. The sign-in dialog lists them.
          </p>
        ) : null}
        <Button
          onClick={async () => {
            if (signedIn) {
              await dispatch(signOut());
              dispatch(showToast({ message: 'Signed out. Sign in as staff to continue.', tone: 'info' }));
            }
            dispatch(openAuthModal(pathname));
          }}
          icon="arrow_forward"
        >
          {signedIn ? 'Switch account' : 'Sign in'}
        </Button>
      </PageShell>
    );
  }

  // A section reached by typing its URL is refused by the same table the sidebar is
  // built from — the navigation hiding a link is a convenience, not the control.
  const permitted = can(user, section.permission);

  return (
    <PageShell eyebrow="Admin portal" title={section.title} aside={<Identity user={user} />}>
      {settings.noticeToStaff ? (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '11px',
            marginBottom: '22px',
            padding: '14px 18px',
            borderRadius: '16px',
            border: `1px solid ${color.orange}`,
            background: 'rgba(248,135,53,.12)',
            fontSize: '14px',
            lineHeight: 1.5,
            color: color.ink
          }}
        >
          <Icon name="campaign" size={19} color={color.orangeDeep} style={{ flex: 'none', marginTop: '1px' }} />
          <span>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Notice to staff</strong>
            {settings.noticeToStaff}
          </span>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px,3vw,40px)', alignItems: 'flex-start' }}>
        <AdminNav />
        <div style={{ flex: '1 1 640px', minWidth: 'min(100%,300px)' }}>
          <p
            style={{
              margin: '0 0 clamp(18px,2.4vw,26px)',
              maxWidth: '62ch',
              fontSize: '14.5px',
              lineHeight: 1.6,
              color: color.body
            }}
          >
            {section.blurb}
          </p>
          {permitted ? (
            <Outlet />
          ) : (
            <div style={{ padding: '28px', borderRadius: radius.card, border: `1px dashed ${color.border}` }}>
              <div style={{ ...eyebrow, marginBottom: '10px' }}>Not your section</div>
              <p style={{ margin: 0, maxWidth: '46ch', fontSize: '14.5px', lineHeight: 1.6, color: color.body }}>
                {section.title} is restricted to administrators. Your account signs in as a{' '}
                {ROLE_LABEL[roleOf(user)].toLowerCase()}. Ask an administrator if you need it.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

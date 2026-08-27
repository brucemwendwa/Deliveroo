import { useDispatch, useSelector } from 'react-redux';
import { setUserRole, setUserSuspended } from '../../store/adminSlice';
import { selectUser } from '../../store/authSlice';
import { showToast } from '../../store/uiSlice';
import { PERMISSION, ROLE, ROLE_LABEL, can, roleOf } from '../../lib/roles';
import { color, control, font, radius } from '../../theme';

const HEADINGS = ['Person', 'Role', 'Deliveries', 'Joined', 'Last seen', 'Account'];

const cell = {
  padding: '12px 10px',
  fontSize: '13.5px',
  color: color.ink,
  verticalAlign: 'middle',
  borderTop: '1px solid rgba(17,17,17,.09)'
};

const quiet = { ...cell, color: color.body };

const day = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

const contact = (user) => user.email || user.phone || user.id;

/**
 * §27 — the account directory.
 *
 * Two powers live here and both are administrator-only: what someone may do, and
 * whether they may sign in at all. An administrator cannot demote or suspend
 * themselves — the backend refuses it, because an install whose last administrator
 * clicks the wrong row has nobody left who can undo it.
 */
export default function UserTable({ users = [], orderCounts = {} }) {
  const dispatch = useDispatch();
  const narrow = useSelector((state) => state.ui.narrow);
  const me = useSelector(selectUser);
  const mayManage = can(me, PERMISSION.MANAGE_ACCOUNTS);

  const changeRole = async (user, role) => {
    const result = await dispatch(setUserRole({ id: user.id, role }));
    if (setUserRole.fulfilled.match(result)) {
      dispatch(showToast({ message: `${user.name} is now a ${ROLE_LABEL[role].toLowerCase()}.`, tone: 'success' }));
    }
  };

  const changeSuspension = async (user, suspended) => {
    const result = await dispatch(setUserSuspended({ id: user.id, suspended }));
    if (setUserSuspended.fulfilled.match(result)) {
      dispatch(
        showToast({
          message: suspended ? `${user.name} can no longer sign in.` : `${user.name} can sign in again.`,
          tone: suspended ? 'info' : 'success'
        })
      );
    }
  };

  const RoleControl = ({ user }) => {
    const role = roleOf(user);
    const self = user.id === me?.id;

    if (!mayManage || self) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 600 }}>
          {ROLE_LABEL[role]}
          {self && <span style={{ fontSize: '12px', fontWeight: 400, color: color.muted }}>· you</span>}
        </span>
      );
    }

    return (
      <select
        value={role}
        aria-label={`Role for ${user.name}`}
        onChange={(event) => changeRole(user, event.target.value)}
        style={{ ...control.field, width: 'auto', height: '40px', fontSize: '13.5px', cursor: 'pointer' }}
      >
        {Object.values(ROLE).map((option) => (
          <option key={option} value={option}>
            {ROLE_LABEL[option]}
          </option>
        ))}
      </select>
    );
  };

  const AccountControl = ({ user }) => {
    const self = user.id === me?.id;
    if (!mayManage || self) {
      return (
        <span style={{ color: user.suspended ? color.orangeDeep : color.body, fontWeight: 600 }}>
          {user.suspended ? 'Suspended' : 'Active'}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => changeSuspension(user, !user.suspended)}
        style={{
          ...control.chip,
          minHeight: '40px',
          fontSize: '13px',
          padding: '0 14px',
          borderColor: user.suspended ? color.orangeDeep : 'rgba(17,17,17,.14)',
          color: user.suspended ? color.orangeDeep : color.ink
        }}
      >
        {user.suspended ? 'Restore access' : 'Suspend'}
      </button>
    );
  };

  if (narrow) {
    return (
      <div style={{ display: 'grid', gap: '10px' }}>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              display: 'grid',
              gap: '10px',
              padding: '14px',
              borderRadius: radius.card,
              border: '1.5px solid rgba(17,17,17,.1)',
              background: color.white
            }}
          >
            <span>
              <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: color.ink }}>{user.name}</span>
              <span style={{ display: 'block', marginTop: '2px', fontSize: '12.5px', color: color.muted }}>
                {contact(user)}
              </span>
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: '12.5px', color: color.body }}>
              <span>{orderCounts[user.id] || 0} deliveries</span>
              <span>Joined {day(user.createdAt)}</span>
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <RoleControl user={user} />
              <AccountControl user={user} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
        <thead>
          <tr>
            {HEADINGS.map((heading) => (
              <th
                key={heading}
                scope="col"
                style={{
                  padding: '0 10px 12px',
                  textAlign: 'left',
                  fontFamily: font.mono,
                  fontSize: '9.5px',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: color.muted,
                  whiteSpace: 'nowrap'
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{ background: user.suspended ? 'rgba(17,17,17,.03)' : 'transparent' }}>
              <td style={cell}>
                <span style={{ fontWeight: 700 }}>{user.name}</span>
                <span style={{ display: 'block', fontSize: '12px', color: color.muted }}>{contact(user)}</span>
              </td>
              <td style={cell}>
                <RoleControl user={user} />
              </td>
              <td style={quiet}>{orderCounts[user.id] || 0}</td>
              <td style={{ ...quiet, whiteSpace: 'nowrap' }}>{day(user.createdAt)}</td>
              <td style={{ ...quiet, whiteSpace: 'nowrap' }}>{day(user.lastSeenAt)}</td>
              <td style={cell}>
                <AccountControl user={user} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

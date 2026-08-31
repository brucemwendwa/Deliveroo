import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCustomers, selectStaff, selectUsers } from '../../store/adminSlice';
import { selectAllOrders } from '../../store/ordersSlice';
import { selectUser } from '../../store/authSlice';
import { PERMISSION, ROLE_NOTE, can } from '../../lib/roles';
import { color, control, eyebrow } from '../../theme';
import Panel from '../../components/admin/Panel';
import UserTable from '../../components/admin/UserTable';
import EmptyState from '../../components/ui/EmptyState';
import StatTile from '../../components/ui/StatTile';
import Icon from '../../components/Icon';

/** §27 — people and access: who has an account, and what it lets them do. */
export default function AdminAccounts() {
  const users = useSelector(selectUsers);
  const staff = useSelector(selectStaff);
  const customers = useSelector(selectCustomers);
  const orders = useSelector(selectAllOrders);
  const me = useSelector(selectUser);
  const [query, setQuery] = useState('');

  const orderCounts = useMemo(() => {
    const counts = {};
    for (const order of orders) {
      if (!order.userId) continue;
      counts[order.userId] = (counts[order.userId] || 0) + 1;
    }
    return counts;
  }, [orders]);

  const matches = (list) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((user) =>
      [user.name, user.email, user.phone].filter(Boolean).some((field) => field.toLowerCase().includes(needle))
    );
  };

  const suspended = users.filter((user) => user.suspended).length;

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <StatTile label="Accounts" value={users.length} icon="group" />
        <StatTile label="Colleagues" value={staff.length} icon="badge" />
        <StatTile label="Customers" value={customers.length} icon="person" />
        <StatTile label="Suspended" value={suspended} icon="block" />
      </div>

      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email or phone"
          aria-label="Search accounts"
          style={{ ...control.field, height: '48px', paddingLeft: '42px' }}
        />
        <Icon
          name="search"
          size={18}
          color={color.muted}
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
      </div>

      <Panel
        title={`Colleagues · ${staff.length}`}
        note={
          can(me, PERMISSION.MANAGE_ACCOUNTS)
            ? 'Changing a role takes effect the next time that person loads a page. You cannot change your own.'
            : 'Roles are set by an administrator.'
        }
      >
        {matches(staff).length === 0 ? (
          <EmptyState icon="badge" title="No colleagues match" body="Clear the search to see everyone with portal access." />
        ) : (
          <UserTable users={matches(staff)} orderCounts={orderCounts} />
        )}

        <div style={{ display: 'grid', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${color.border}` }}>
          <div style={eyebrow}>What each role can do</div>
          {Object.entries(ROLE_NOTE).map(([role, note]) => (
            <p key={role} style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: color.body }}>
              <strong style={{ color: color.ink }}>{role.charAt(0) + role.slice(1).toLowerCase()}</strong> — {note}
            </p>
          ))}
        </div>
      </Panel>

      <Panel title={`Customers · ${customers.length}`} note="Everyone who has signed in to book a delivery.">
        {matches(customers).length === 0 ? (
          <EmptyState
            icon="person"
            title={customers.length ? 'No customers match' : 'No customer accounts yet'}
            body={
              customers.length
                ? 'Clear the search to see the rest of the directory.'
                : 'An account is created the first time someone verifies a code to book a delivery.'
            }
          />
        ) : (
          <UserTable users={matches(customers)} orderCounts={orderCounts} />
        )}
      </Panel>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAuditLog } from '../../store/adminSlice';
import { ROLE_LABEL } from '../../lib/roles';
import { color, font } from '../../theme';
import Panel from '../../components/admin/Panel';
import Chip from '../../components/ui/Chip';
import EmptyState from '../../components/ui/EmptyState';

const ACTION_LABEL = {
  ORDER_STATUS: 'Status changed',
  WEIGHT_VERIFIED: 'Parcel weighed',
  LOCATION_REPORTED: 'Location reported',
  CAPACITY_CHANGED: 'Capacity changed',
  COURIER_SHIFT: 'Courier shift',
  ROLE_CHANGED: 'Role changed',
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_RESTORED: 'Account restored',
  SETTINGS_UPDATED: 'Settings updated',
  DEMO_DATA_RESET: 'Demo data reset'
};

const label = (action) => ACTION_LABEL[action] || action.toLowerCase().replace(/_/g, ' ');

const stamp = (iso) =>
  new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * §27 — the trail.
 *
 * Every staff action against someone else's delivery or account, with the account
 * that took it. It is append-only and nothing in the portal can edit it: a log a
 * portal can rewrite is not evidence of anything.
 */
export default function AdminAudit() {
  const entries = useSelector(selectAuditLog);
  const [action, setAction] = useState('ALL');

  const actions = useMemo(
    () => ['ALL', ...Array.from(new Set(entries.map((entry) => entry.action)))],
    [entries]
  );
  const visible = action === 'ALL' ? entries : entries.filter((entry) => entry.action === action);

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      {actions.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {actions.map((option) => (
            <Chip
              key={option}
              active={action === option}
              onClick={() => setAction(option)}
              style={{ minHeight: '38px', fontSize: '13px' }}
            >
              {option === 'ALL' ? 'Everything' : label(option)}
            </Chip>
          ))}
        </div>
      )}

      <Panel
        title={`Actions · ${visible.length}`}
        note="Newest first, capped at the last 300. A real deployment would keep these server-side and keep them for good."
      >
        {visible.length === 0 ? (
          <EmptyState
            icon="history"
            title="Nothing recorded yet"
            body="Moving a delivery along, weighing a parcel or changing someone's role all leave an entry here."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr>
                  {['When', 'Who', 'Action', 'Subject', 'Detail'].map((heading) => (
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
                {visible.map((entry) => (
                  <tr key={entry.id}>
                    <td
                      style={{
                        padding: '12px 10px',
                        borderTop: `1px solid ${color.border}`,
                        fontFamily: font.mono,
                        fontSize: '11.5px',
                        letterSpacing: '.04em',
                        color: color.muted,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {stamp(entry.at)}
                    </td>
                    <td style={{ padding: '12px 10px', borderTop: `1px solid ${color.border}`, fontSize: '13.5px' }}>
                      <span style={{ fontWeight: 600, color: color.ink }}>{entry.actor}</span>
                      <span style={{ display: 'block', fontSize: '11.5px', color: color.muted }}>
                        {ROLE_LABEL[entry.actorRole] || entry.actorRole}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        borderTop: `1px solid ${color.border}`,
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: color.ink,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {label(entry.action)}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        borderTop: `1px solid ${color.border}`,
                        fontSize: '13.5px',
                        color: color.body,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {entry.target || '—'}
                    </td>
                    <td style={{ padding: '12px 10px', borderTop: `1px solid ${color.border}`, fontSize: '13.5px', color: color.body }}>
                      {entry.detail || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

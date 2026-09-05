import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectNotifications } from '../../store/adminSlice';
import { color, control, font, radius, shadow } from '../../theme';
import Panel from '../../components/admin/Panel';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/Icon';

const stamp = (iso) =>
  new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * §19/§27 — the outbox.
 *
 * The platform writes a message every time something happens to a parcel: an agent
 * matched, a weight recorded, a destination changed. Nothing is emailed yet, which
 * is exactly why staff need to see the queue — it is the record of what a customer
 * would have been told, and the first place to look when one says nobody told them.
 */
export default function AdminNotifications() {
  const notifications = useSelector(selectNotifications);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notifications;
    return notifications.filter((entry) =>
      [entry.orderId, entry.to, entry.message].filter(Boolean).some((field) => field.toLowerCase().includes(needle))
    );
  }, [notifications, query]);

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search parcel, recipient or wording"
          aria-label="Search notifications"
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
        title={`Outbox · ${notifications.length}`}
        note="Held locally, newest first. Pointing this at a mail service is a change to a single function; until then, this is where a message can be read back to a customer."
      >
        {visible.length === 0 ? (
          <EmptyState
            icon="mail"
            title={notifications.length ? 'Nothing matches that search' : 'No messages sent yet'}
            body={
              notifications.length
                ? 'Clear the search to see the rest of the outbox.'
                : 'A message is written whenever a delivery is assigned, weighed, rerouted or completed.'
            }
          />
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
            {visible.map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: 'grid',
                  gap: '6px',
                  padding: '14px 16px',
                  borderRadius: radius.card,
                  border: `1px solid ${color.border}`,
                  background: color.card,
                  boxShadow: shadow.card
                }}
              >
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: font.mono, fontSize: '11.5px', letterSpacing: '.05em', color: color.orangeDeep }}>
                    {entry.orderId}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: color.ink }}>{entry.to}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: font.mono,
                      fontSize: '11px',
                      letterSpacing: '.04em',
                      color: color.muted,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {stamp(entry.sentAt)}
                  </span>
                </span>
                <span style={{ fontSize: '14px', lineHeight: 1.55, color: color.body }}>{entry.message}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

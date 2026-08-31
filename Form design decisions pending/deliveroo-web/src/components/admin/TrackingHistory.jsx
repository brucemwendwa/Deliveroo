import { STATUS_LABEL } from '../../lib/orderStatus';
import { color, eyebrow, font } from '../../theme';

const stamp = (iso) =>
  new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** §26 — the audit trail: every status this parcel has been through, and when. */
export default function TrackingHistory({ order }) {
  const rows = [...(order.history || [])].reverse();
  const location = order.presentLocation;

  return (
    <div>
      <div style={{ ...eyebrow, marginBottom: '12px' }}>Tracking history</div>
      {location && (
        <div style={{ marginBottom: '10px', fontSize: '13.5px', color: color.body }}>
          Reported at <strong style={{ color: color.ink }}>{location.label}</strong> · {stamp(location.at)}
        </div>
      )}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
        {rows.map((entry, index) => (
          <li
            key={`${entry.status}-${entry.at}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13.5px',
              color: index === 0 ? color.ink : color.muted
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '99px',
                background: index === 0 ? color.orange : 'rgba(28,32,31,.24)',
                flex: 'none'
              }}
            />
            <span style={{ fontWeight: index === 0 ? 700 : 500 }}>{STATUS_LABEL[entry.status]}</span>
            <span style={{ marginLeft: 'auto', fontFamily: font.mono, fontSize: '11.5px', letterSpacing: '.04em' }}>
              {stamp(entry.at)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

import { formatDuration, formatKes, formatKm } from '../../lib/pricing';
import { color, font, radius } from '../../theme';
import Icon from '../Icon';

const line = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '12px 0',
  fontSize: '14.5px',
  borderTop: '1px solid rgba(17,17,17,.1)'
};

/** §11 — the last look before committing. */
export default function OrderSummary({ pickup, destination, parcel, route, quote }) {
  return (
    <div
      style={{
        borderRadius: radius.card,
        border: '1px solid rgba(17,17,17,.12)',
        background: color.white,
        padding: 'clamp(20px,2.4vw,28px)'
      }}
    >
      <h3
        style={{
          margin: '0 0 20px',
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: 'clamp(22px,2.4vw,30px)',
          textTransform: 'uppercase',
          letterSpacing: '.005em',
          color: color.ink
        }}
      >
        Your delivery
      </h3>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
        <div
          aria-hidden="true"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '6px', flex: 'none' }}
        >
          <span style={{ width: '10px', height: '10px', borderRadius: '999px', border: `2px solid ${color.ink}` }} />
          <span style={{ flex: 1, width: '2px', minHeight: '30px', background: 'rgba(17,17,17,.2)', margin: '4px 0' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: color.orange }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <div style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '.16em', textTransform: 'uppercase', color: color.muted }}>
              Pickup
            </div>
            <div style={{ marginTop: '5px', fontSize: '15.5px', fontWeight: 600, color: color.ink }}>{pickup?.label}</div>
          </div>
          <div>
            <div style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '.16em', textTransform: 'uppercase', color: color.muted }}>
              Destination
            </div>
            <div style={{ marginTop: '5px', fontSize: '15.5px', fontWeight: 600, color: color.ink }}>{destination?.label}</div>
          </div>
        </div>
      </div>

      <div style={line}>
        <span style={{ color: color.muted }}>Package</span>
        <strong style={{ color: color.ink }}>
          {parcel.weightKg} kg declared{parcel.description ? ` · ${parcel.description}` : ''}
        </strong>
      </div>
      <div style={line}>
        <span style={{ color: color.muted }}>Distance</span>
        <strong style={{ color: color.ink }}>{route ? formatKm(route.distanceKm) : '—'}</strong>
      </div>
      <div style={line}>
        <span style={{ color: color.muted }}>Estimated time</span>
        <strong style={{ color: color.ink }}>{route ? formatDuration(route.durationSeconds) : '—'}</strong>
      </div>
      <div style={{ ...line, alignItems: 'center', paddingTop: '18px' }}>
        <span style={{ color: color.muted }}>Estimated fee</span>
        <strong style={{ fontFamily: font.display, fontWeight: 700, fontSize: 'clamp(26px,3vw,38px)', lineHeight: 1, color: color.ink }}>
          {formatKes(quote.total)}
        </strong>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: color.muted }}>
        Confirmed once we weigh the package at pickup. You can cancel at any point before
        it&apos;s delivered.
      </p>
    </div>
  );
}

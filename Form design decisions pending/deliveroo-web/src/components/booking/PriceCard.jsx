import { RATE_PER_KG, RATE_PER_KM, formatDuration, formatKes, formatKm } from '../../lib/pricing';
import { color, font, radius } from '../../theme';

const row = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '10px 0',
  fontSize: '14.5px'
};

/**
 * §9 — shows the arithmetic, not just the answer. Every figure comes from the same
 * quote() result the order is created with, so what the customer reads is what they pay.
 */
export default function PriceCard({ quote, route, weightKg }) {
  const hasRoute = Boolean(route);

  return (
    <div
      style={{
        borderRadius: radius.card,
        border: '1px solid rgba(17,17,17,.12)',
        background: color.white,
        padding: 'clamp(20px,2.4vw,28px)'
      }}
    >
      <div style={row}>
        <span style={{ color: color.muted }}>Declared weight</span>
        <strong style={{ color: color.ink }}>{weightKg} kg</strong>
      </div>
      <div style={row}>
        <span style={{ color: color.muted }}>Base rate</span>
        <strong style={{ color: color.ink }}>{formatKes(RATE_PER_KG)}/kg</strong>
      </div>
      <div style={{ ...row, borderBottom: '1px solid rgba(17,17,17,.1)', paddingBottom: '14px' }}>
        <span style={{ color: color.muted }}>Weight subtotal</span>
        <strong style={{ color: color.ink }}>{formatKes(quote.weightCost)}</strong>
      </div>

      <div style={{ ...row, paddingTop: '14px' }}>
        <span style={{ color: color.muted }}>Distance</span>
        <strong style={{ color: color.ink }}>{hasRoute ? formatKm(route.distanceKm) : '—'}</strong>
      </div>
      <div style={row}>
        <span style={{ color: color.muted }}>Distance adjustment</span>
        <strong style={{ color: color.ink }}>
          {hasRoute ? `${formatKes(RATE_PER_KM)}/km · ${formatKes(quote.distanceCost)}` : '—'}
        </strong>
      </div>
      <div style={{ ...row, borderBottom: '1px solid rgba(17,17,17,.1)', paddingBottom: '18px' }}>
        <span style={{ color: color.muted }}>Estimated journey</span>
        <strong style={{ color: color.ink }}>{hasRoute ? formatDuration(route.durationSeconds) : '—'}</strong>
      </div>

      <div style={{ paddingTop: '20px' }}>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: '10.5px',
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: color.muted,
            marginBottom: '10px'
          }}
        >
          Estimated delivery
        </div>
        <div
          aria-live="polite"
          style={{
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 'clamp(42px,5.6vw,72px)',
            lineHeight: 0.88,
            letterSpacing: '-.015em',
            color: color.ink
          }}
        >
          {hasRoute ? formatKes(quote.total) : '—'}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: color.muted }}>
          {route?.estimated && 'Route service unavailable — distance and time are approximate. '}
          This is an estimate. We weigh your package at pickup and confirm the final price from
          the measured weight.
        </p>
      </div>
    </div>
  );
}

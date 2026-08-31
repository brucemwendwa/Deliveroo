import { formatDuration, formatKes, formatKm } from '../../lib/pricing';
import { modeMeta, priorityOption } from '../../lib/transport';
import { color, eyebrow, font, radius, shadow } from '../../theme';
import Icon from '../Icon';
import TransportBadge from '../transport/TransportBadge';

const row = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '9px 0',
  fontSize: '14.5px'
};

/**
 * §9/§25 — shows the arithmetic, not just the answer. Every figure comes from the
 * same priceOrder() result the order is created with, so what the customer reads is
 * what they pay, and the breakdown changes shape with the mode: road has no base
 * fare, air and sea do.
 */
export default function PriceCard({ quote, route, parcel, mode, priority }) {
  const hasRoute = Boolean(route);
  const meta = mode ? modeMeta(mode) : null;
  const chargeable = quote.chargeableWeightKg ?? quote.weightKg;
  const volumetric = chargeable > (parcel?.weightKg || 0) + 0.001;

  const lines = [
    quote.baseFare > 0 && ['Base fare', formatKes(quote.baseFare), `${meta?.label} handling`],
    ['Distance charge', hasRoute ? formatKes(quote.distanceCost) : '—', hasRoute ? formatKm(route.distanceKm) : null],
    ['Weight charge', formatKes(quote.weightCost), `${chargeable} kg${volumetric ? ' volumetric' : ''}`],
    quote.priorityCost > 0 && [
      `${priorityOption(priority).label} priority`,
      formatKes(quote.priorityCost),
      `+${Math.round((priorityOption(priority).priceFactor - 1) * 100)}%`
    ]
  ].filter(Boolean);

  return (
    <div
      style={{
        borderRadius: radius.card,
        border: `1px solid ${color.border}`,
        background: color.card,
        boxShadow: shadow.card,
        padding: 'clamp(20px,2.4vw,28px)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <div style={eyebrow}>Your quote</div>
        {mode ? (
          <TransportBadge mode={mode} priority={priority} size="sm" />
        ) : (
          <span style={{ fontSize: '12.5px', color: color.muted }}>No mode chosen yet</span>
        )}
      </div>

      {lines.map(([label, value, note], index) => (
        <div key={label} style={{ ...row, borderTop: index ? `1px solid ${color.border}` : 'none' }}>
          <span style={{ color: color.muted }}>
            {label}
            {note && <span style={{ display: 'block', marginTop: '2px', fontSize: '12px' }}>{note}</span>}
          </span>
          <strong style={{ color: color.ink, whiteSpace: 'nowrap' }}>{value}</strong>
        </div>
      ))}

      <div style={{ ...row, borderTop: `1px solid ${color.border}`, paddingTop: '14px' }}>
        <span style={{ color: color.muted }}>Estimated delivery time</span>
        <strong style={{ color: color.ink }}>{hasRoute ? formatDuration(quote.durationSeconds) : '—'}</strong>
      </div>

      <div style={{ paddingTop: '18px' }}>
        <div style={{ ...eyebrow, fontSize: '10.5px', marginBottom: '10px' }}>
          {mode ? 'Total' : 'Estimated total'}
        </div>
        <div
          aria-live="polite"
          style={{
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: 'clamp(40px,5.2vw,66px)',
            lineHeight: 0.88,
            letterSpacing: '-.02em',
            color: color.ink
          }}
        >
          {hasRoute ? formatKes(quote.total) : '—'}
        </div>
        <p style={{ margin: '14px 0 0', display: 'flex', gap: '8px', fontSize: '12.5px', lineHeight: 1.5, color: color.muted }}>
          <Icon name="info" size={15} color={color.muted} style={{ flex: 'none', marginTop: '1px' }} />
          <span>
            {route?.estimated && 'Route service unavailable, so distance and time are approximate. '}
            Calculated live from distance, weight and mode. We weigh your package at pickup and
            confirm the final price from the measured weight.
          </span>
        </p>
      </div>
    </div>
  );
}

import { formatDuration, formatKes, formatKm } from '../../lib/pricing';
import { modeMeta, packageTypeLabel, priorityOption } from '../../lib/transport';
import { color, eyebrow, font, radius, shadow } from '../../theme';
import TransportBadge from '../transport/TransportBadge';

const line = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '11px 0',
  fontSize: '14.5px',
  borderTop: `1px solid ${color.border}`
};

const label = { color: color.muted, flex: 'none' };
const value = { color: color.ink, textAlign: 'right', fontWeight: 600 };

/** §11/§25 — the last look before committing: route, parcel, mode and the arithmetic. */
export default function OrderSummary({ pickup, destination, parcel, route, quote, mode, priority }) {
  const meta = mode ? modeMeta(mode) : null;
  const chargeable = quote.chargeableWeightKg ?? quote.weightKg;

  const charges = [
    quote.baseFare > 0 && ['Base fare', formatKes(quote.baseFare)],
    ['Distance charge', formatKes(quote.distanceCost)],
    ['Weight charge', formatKes(quote.weightCost)],
    quote.priorityCost > 0 && [`${priorityOption(priority).label} priority`, formatKes(quote.priorityCost)]
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
        <h3
          style={{
            margin: 0,
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: 'clamp(21px,2.2vw,28px)',
            letterSpacing: '.005em',
            color: color.ink
          }}
        >
          Delivery summary
        </h3>
        {mode && <TransportBadge mode={mode} priority={priority} />}
      </div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '4px' }}>
        <div
          aria-hidden="true"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '6px', flex: 'none' }}
        >
          <span style={{ width: '10px', height: '10px', borderRadius: '999px', border: `2px solid ${color.ink}` }} />
          <span style={{ flex: 1, width: '2px', minHeight: '30px', background: 'rgba(28,32,31,.2)', margin: '4px 0' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: color.orange }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <div style={{ ...eyebrow, fontSize: '10px' }}>Pickup</div>
            <div style={{ marginTop: '5px', fontSize: '15.5px', fontWeight: 600, color: color.ink }}>{pickup?.label}</div>
          </div>
          <div>
            <div style={{ ...eyebrow, fontSize: '10px' }}>Destination</div>
            <div style={{ marginTop: '5px', fontSize: '15.5px', fontWeight: 600, color: color.ink }}>{destination?.label}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '18px' }}>
        <div style={line}>
          <span style={label}>Parcel</span>
          <strong style={value}>
            {parcel.weightKg} kg declared
            {parcel.packageType ? ` · ${packageTypeLabel(parcel.packageType)}` : ''}
            {chargeable > parcel.weightKg + 0.001 ? ` · charged at ${chargeable} kg volumetric` : ''}
          </strong>
        </div>
        <div style={line}>
          <span style={label}>Distance</span>
          <strong style={value}>{route ? formatKm(route.distanceKm) : '—'}</strong>
        </div>
        <div style={line}>
          <span style={label}>Estimated duration</span>
          <strong style={value}>{route ? formatDuration(quote.durationSeconds) : '—'}</strong>
        </div>

        {charges.map(([name, amount]) => (
          <div key={name} style={line}>
            <span style={label}>{name}</span>
            <strong style={value}>{amount}</strong>
          </div>
        ))}

        <div style={{ ...line, alignItems: 'center', paddingTop: '16px', borderTopWidth: '1.5px', borderTopColor: 'rgba(28,32,31,.2)' }}>
          <span style={{ ...eyebrow, color: color.ink }}>Total</span>
          <strong style={{ fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(26px,3vw,38px)', lineHeight: 1, color: color.ink }}>
            {formatKes(quote.total)}
          </strong>
        </div>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: color.muted }}>
        {meta ? `${meta.blurb} ` : ''}
        Confirmed once we weigh the package at pickup. You can cancel any time before it&apos;s
        delivered.
      </p>
    </div>
  );
}

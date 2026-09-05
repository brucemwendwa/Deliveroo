import { Link } from 'react-router-dom';
import useNow from '../../hooks/useNow';
import {
  STATUS,
  agentHasArrived,
  currentLocationLabel,
  progressFor,
  remainingKm,
  remainingSeconds,
  statusLabelFor
} from '../../lib/orderStatus';
import { etaClock, formatKm } from '../../lib/pricing';
import { agentNounFor, agentNounTitle, collectingMode, modeMeta, priorityOf, transportOf } from '../../lib/transport';
import { color, ease, eyebrow, font } from '../../theme';
import Button from '../ui/Button';
import TransportBadge from '../transport/TransportBadge';
import TransportGlyph from '../transport/TransportGlyph';
import StatusPill from './StatusPill';

/**
 * §15 — the delivery the customer is watching right now, given the weight it deserves:
 * dark, wide, and carrying the four things they came to the page for — where it is,
 * when it lands, how it's travelling, and the way through to the live map.
 */
export default function ActiveDelivery({ order }) {
  const now = useNow(20_000);
  if (!order) return null;

  const mode = transportOf(order);
  const meta = modeMeta(mode);
  const progress = progressFor(order, now);
  const secondsLeft = remainingSeconds(order, now);
  const minutesLeft = Math.max(1, Math.round(secondsLeft / 60));
  const searching = order.status === STATUS.PENDING && !order.courier;
  // Named for the vehicle that is coming, the same word the tracking screen uses.
  const noun = agentNounFor(order);

  const facts = [
    // Who has it comes first once someone does: when a bike is coming that is the
    // single fact the customer opens the dashboard for.
    order.courier && [agentNounTitle(collectingMode(order)), order.courier.name],
    ['Current location', currentLocationLabel(order)],
    ['Destination', order.destination.name || order.destination.label],
    ['Distance remaining', formatKm(remainingKm(order, now))],
    ['ETA', etaClock(secondsLeft, now)],
    ['Status', statusLabelFor(order, now)]
  ].filter(Boolean);

  return (
    <section
      aria-label="Active delivery"
      style={{
        borderRadius: 'clamp(22px,2.6vw,30px)',
        background: color.greenDeep,
        color: color.paper,
        padding: 'clamp(20px,3vw,34px)',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <span style={{ ...eyebrow, color: color.orange }}>Active delivery</span>
        <StatusPill status={order.status} tone="dark" size="sm" />
        <TransportBadge mode={mode} priority={priorityOf(order)} tone="dark" size="sm" />
        <span style={{ marginLeft: 'auto', fontFamily: font.mono, fontSize: '12px', letterSpacing: '.06em', color: 'rgba(243,243,241,.55)' }}>
          {order.id}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(18px,3vw,40px)', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h2
            style={{
              margin: '0 0 6px',
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: 'clamp(26px,3.4vw,44px)',
              lineHeight: 1,
              letterSpacing: '-.02em',
              color: color.paper
            }}
          >
            {order.pickup.name} → {order.destination.name}
          </h2>
          <p style={{ margin: 0, fontSize: '14.5px', color: 'rgba(243,243,241,.66)' }}>
            {searching
              ? `Finding a ${noun} near you…`
              : order.status === STATUS.ASSIGNED && order.courier
                ? agentHasArrived(order, now)
                  ? `${order.courier.name} is at the pickup point, ready to collect`
                  : `${order.courier.name} is ${order.courier.distanceKm} km away · arriving in ${order.courier.etaMinutes} min`
                : `Travelling by ${meta.label.toLowerCase()} · ${meta.tagline.toLowerCase()}`}
          </p>
        </div>

        <div style={{ flex: 'none' }}>
          <div style={{ ...eyebrow, fontSize: '9.5px', color: 'rgba(243,243,241,.5)', marginBottom: '6px' }}>Arriving in</div>
          <div
            style={{
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: 'clamp(34px,4vw,54px)',
              lineHeight: 1.04,
              color: color.orange,
              whiteSpace: 'nowrap'
            }}
          >
            {minutesLeft < 60 ? minutesLeft : Math.round((minutesLeft / 60) * 10) / 10}
            <span style={{ fontSize: '.4em', color: color.paper }}>{minutesLeft < 60 ? ' MIN' : ' H'}</span>
          </div>
        </div>

        <div style={{ flex: 'none' }}>
          <Button as={Link} to={`/track/${order.id}`} icon="near_me" iconPosition="left">
            Track live
          </Button>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Delivery progress"
        style={{ height: '6px', borderRadius: '99px', background: 'rgba(243,243,241,.14)', overflow: 'hidden', margin: '22px 0 18px' }}
      >
        <div
          style={{
            width: `${Math.max(2, Math.min(100, progress))}%`,
            height: '100%',
            borderRadius: '99px',
            background: 'linear-gradient(90deg,#FFA45C,#F88735)',
            transition: `width .6s ${ease.out}`
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
        {facts.map(([label, value]) => (
          <div key={label} style={{ flex: '1 1 130px', minWidth: 0 }}>
            <div style={{ ...eyebrow, fontSize: '9px', color: 'rgba(243,243,241,.45)', marginBottom: '5px' }}>{label}</div>
            <div style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-.01em', color: color.paper }}>{value}</div>
          </div>
        ))}
        <div style={{ flex: '1 1 130px', minWidth: 0 }}>
          <div style={{ ...eyebrow, fontSize: '9px', color: 'rgba(243,243,241,.45)', marginBottom: '5px' }}>Transport</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14.5px', fontWeight: 600, color: color.paper }}>
            <TransportGlyph mode={mode} size={17} color={color.orange} />
            {meta.label}
          </div>
        </div>
      </div>
    </section>
  );
}

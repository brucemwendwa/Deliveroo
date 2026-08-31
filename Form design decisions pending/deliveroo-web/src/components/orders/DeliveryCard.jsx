import { Link } from 'react-router-dom';
import useHover from '../../hooks/useHover';
import { isTerminal } from '../../lib/orderStatus';
import { formatKes, formatKm, isWeightVerified } from '../../lib/pricing';
import { priorityOf, transportOf } from '../../lib/transport';
import { color, ease, font, radius, shadow } from '../../theme';
import Icon from '../Icon';
import TransportBadge from '../transport/TransportBadge';
import StatusPill from './StatusPill';

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * §15 — one delivery in a list. A card rather than a table row: it carries a route,
 * a status, a mode and a price, and that survives a narrow screen intact where a
 * six-column row does not.
 */
export default function DeliveryCard({ order, actions }) {
  const [hovered, bind] = useHover();
  const live = !isTerminal(order.status);

  return (
    <div
      {...bind}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: 'clamp(16px,2vw,20px)',
        borderRadius: radius.card,
        border: `1px solid ${hovered ? 'rgba(28,32,31,.28)' : 'rgba(28,32,31,.1)'}`,
        background: color.card,
        boxShadow: shadow.card,
        boxShadow: hovered ? '0 22px 40px -32px rgba(28,32,31,.55)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: `transform .22s ${ease.out}, box-shadow .22s, border-color .2s`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: font.mono, fontSize: '12px', letterSpacing: '.06em', color: color.muted }}>
          {order.id}
        </span>
        <StatusPill status={order.status} size="sm" />
        <TransportBadge mode={transportOf(order)} priority={priorityOf(order)} size="sm" style={{ marginLeft: 'auto' }} />
      </div>

      <Link to={`/orders/${order.id}`} style={{ display: 'flex', gap: '12px', color: color.ink }}>
        <span
          aria-hidden="true"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '5px', flex: 'none' }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '999px', border: `2px solid ${color.ink}` }} />
          <span style={{ flex: 1, width: '2px', minHeight: '18px', background: 'rgba(28,32,31,.18)', margin: '3px 0' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: color.orange }} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '15.5px', fontWeight: 600, letterSpacing: '-.02em' }}>{order.pickup.name}</span>
          <span style={{ fontSize: '15.5px', fontWeight: 600, letterSpacing: '-.02em' }}>{order.destination.name}</span>
        </span>
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: '6px 16px',
          paddingTop: '12px',
          borderTop: `1px solid ${color.border}`,
          fontSize: '13.5px',
          color: color.muted
        }}
      >
        <span>{formatKm(order.route.distanceKm)}</span>
        <span>{dateLabel(order.createdAt)}</span>
        <span style={{ marginLeft: 'auto', fontSize: '15px', fontWeight: 600, color: color.ink }}>
          {formatKes(order.pricing.total)}
          {!isWeightVerified(order.parcel) && (
            <span style={{ marginLeft: '5px', fontWeight: 500, fontSize: '11.5px', color: color.muted }}>est.</span>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {actions || (
          <>
            <Link
              to={live ? `/track/${order.id}` : `/orders/${order.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                height: '40px',
                padding: '0 16px',
                borderRadius: radius.pill,
                background: live ? color.orange : 'transparent',
                border: live ? 'none' : `1px solid ${color.border}`,
                fontSize: '13.5px',
                fontWeight: 600,
                color: color.ink
              }}
            >
              <Icon name={live ? 'near_me' : 'receipt_long'} size={16} />
              {live ? 'Track' : 'View details'}
            </Link>
            {live && (
              <Link
                to={`/orders/${order.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: radius.pill,
                  border: `1px solid ${color.border}`,
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: color.ink
                }}
              >
                Manage
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

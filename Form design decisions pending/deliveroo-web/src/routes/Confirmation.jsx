import { Link, useParams } from 'react-router-dom';
import useOrder from '../hooks/useOrder';
import PageShell from './PageShell';
import StatusTimeline from '../components/tracking/StatusTimeline';
import Button from '../components/ui/Button';
import { STATUS_LABEL } from '../lib/orderStatus';
import { formatDuration, formatKes, formatKm } from '../lib/pricing';
import { color, eyebrow, font, radius } from '../theme';

const stat = (label, value) => ({ label, value });

/** §13 — the receipt, kept deliberately quiet. */
export default function Confirmation() {
  const { id } = useParams();
  const { order, loading } = useOrder(id);

  if (loading) return <PageShell eyebrow="Delivery" title="Loading…" />;
  if (!order) return <PageShell eyebrow="Delivery" title="Order not found." />;

  const stats = [
    stat('Pickup', order.pickup.label),
    stat('Destination', order.destination.label),
    stat('Package', `${order.parcel.weightKg} kg${order.parcel.description ? ` · ${order.parcel.description}` : ''}`),
    stat('Distance', formatKm(order.route.distanceKm)),
    stat('Estimated time', formatDuration(order.route.durationSeconds)),
    stat('Delivery fee', formatKes(order.pricing.total))
  ];

  return (
    <PageShell
      eyebrow={`Order #${order.id}`}
      title="Delivery confirmed"
      aside={
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button as={Link} to={`/track/${order.id}`} icon="arrow_forward">
            Track delivery
          </Button>
          <Button as={Link} to={`/orders/${order.id}`} variant="ghostLight">
            Manage
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,4vw,64px)' }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ ...eyebrow, marginBottom: '20px' }}>Status · {STATUS_LABEL[order.status]}</div>
          <StatusTimeline status={order.status} />
        </div>

        <div style={{ flex: '1 1 380px' }}>
          <div
            style={{
              borderRadius: radius.card,
              border: '1px solid rgba(17,17,17,.12)',
              background: color.white,
              padding: 'clamp(20px,2.4vw,28px)'
            }}
          >
            {stats.map((row, index) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '18px',
                  padding: '13px 0',
                  borderTop: index ? '1px solid rgba(17,17,17,.1)' : 'none',
                  fontSize: '14.5px'
                }}
              >
                <span style={{ color: color.muted, flex: 'none' }}>{row.label}</span>
                <strong style={{ color: color.ink, textAlign: 'right' }}>{row.value}</strong>
              </div>
            ))}
          </div>
          <p style={{ margin: '18px 0 0', fontSize: '13px', color: color.muted, fontFamily: font.mono, letterSpacing: '.04em' }}>
            Keep order #{order.id} to track this delivery later.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

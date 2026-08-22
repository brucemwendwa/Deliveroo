import { Link, useParams } from 'react-router-dom';
import useOrder from '../hooks/useOrder';
import RouteMap from '../components/booking/RouteMap';
import EtaPanel from '../components/tracking/EtaPanel';
import CourierCard from '../components/tracking/CourierCard';
import StatusTimeline from '../components/tracking/StatusTimeline';
import Button from '../components/ui/Button';
import PageShell from './PageShell';
import { STATUS, STATUS_LABEL, isTerminal } from '../lib/orderStatus';
import { formatDuration, formatKm } from '../lib/pricing';
import { color, eyebrow, font, layout, radius } from '../theme';

/** How far along the journey each status sits, for the progress bar and ETA. */
const PROGRESS = {
  [STATUS.PENDING]: 4,
  [STATUS.ASSIGNED]: 20,
  [STATUS.PICKED_UP]: 45,
  [STATUS.IN_TRANSIT]: 76,
  [STATUS.DELIVERED]: 100,
  [STATUS.CANCELLED]: 0
};

// §14 — map-led, dark, so the route and the courier are the only bright things.
export default function TrackOrder() {
  const { id } = useParams();
  const { order, loading } = useOrder(id);

  if (loading) return <PageShell eyebrow="Tracking" title="Loading…" />;
  if (!order) {
    return (
      <PageShell eyebrow="Tracking" title="We can't find that order.">
        <p style={{ margin: '0 0 24px', fontSize: '16px', color: color.body }}>
          Check the order number and try again — it looks like DLV-10482.
        </p>
        <Button as={Link} to="/track" icon="arrow_forward">
          Try another number
        </Button>
      </PageShell>
    );
  }

  const progress = PROGRESS[order.status] ?? 0;
  const remainingSeconds = order.route.durationSeconds * (1 - progress / 100);
  const etaMinutes = order.status === STATUS.DELIVERED ? 0 : Math.max(1, Math.round(remainingSeconds / 60));

  const headline =
    order.status === STATUS.DELIVERED
      ? 'Delivered.'
      : order.status === STATUS.CANCELLED
        ? 'Delivery cancelled.'
        : order.status === STATUS.PENDING
          ? 'Finding you a courier.'
          : 'Your package is on the way.';

  return (
    <div style={{ background: color.ink, paddingTop: '80px' }}>
      <div
        style={{
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `clamp(30px,5vw,64px) ${layout.gutter} clamp(56px,7vw,104px)`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(28px,3.5vw,56px)',
          alignItems: 'flex-start'
        }}
      >
        <div style={{ flex: '1 1 340px', minWidth: 'min(100%,300px)' }}>
          <div style={{ ...eyebrow, color: color.orange, marginBottom: '14px' }}>Order #{order.id}</div>
          <h1
            style={{
              margin: '0 0 26px',
              fontFamily: font.display,
              fontWeight: 700,
              fontSize: 'clamp(32px,4.6vw,62px)',
              lineHeight: 0.94,
              letterSpacing: '-.015em',
              textTransform: 'uppercase',
              color: color.paper
            }}
          >
            {headline}
          </h1>

          {!isTerminal(order.status) && <EtaPanel etaMinutes={etaMinutes} progress={progress} />}

          {order.courier ? (
            <CourierCard courier={order.courier} status={order.status} />
          ) : (
            <div
              style={{
                padding: '16px',
                borderRadius: radius.card,
                background: 'rgba(243,241,237,.06)',
                border: '1px solid rgba(243,241,237,.1)',
                fontSize: '14.5px',
                color: 'rgba(243,241,237,.7)'
              }}
            >
              {order.status === STATUS.CANCELLED
                ? 'No courier was assigned to this delivery.'
                : 'A courier will be assigned shortly.'}
            </div>
          )}

          <div style={{ marginTop: '30px', paddingTop: '26px', borderTop: '1px solid rgba(243,241,237,.16)' }}>
            <div style={{ ...eyebrow, color: 'rgba(243,241,237,.5)', marginBottom: '20px' }}>
              Status · {STATUS_LABEL[order.status]}
            </div>
            <StatusTimeline status={order.status} tone="dark" />
          </div>

          <div style={{ marginTop: '26px' }}>
            <Button as={Link} to={`/orders/${order.id}`} variant="ghostLight" icon="arrow_forward">
              Manage this delivery
            </Button>
          </div>
        </div>

        <div style={{ flex: '1 1 460px', minWidth: 'min(100%,300px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <RouteMap
            pickup={order.pickup}
            destination={order.destination}
            route={order.route}
            courier={order.courier}
            height="clamp(340px,52vh,560px)"
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: 'Distance', value: formatKm(order.route.distanceKm) },
              { label: 'Journey time', value: formatDuration(order.route.durationSeconds) }
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  flex: 1,
                  padding: '16px 18px',
                  borderRadius: '18px',
                  background: 'rgba(243,241,237,.06)',
                  border: '1px solid rgba(243,241,237,.1)'
                }}
              >
                <div style={{ ...eyebrow, fontSize: '10px', color: 'rgba(243,241,237,.5)', marginBottom: '8px' }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 'clamp(22px,2.4vw,30px)', lineHeight: 1, color: color.paper }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

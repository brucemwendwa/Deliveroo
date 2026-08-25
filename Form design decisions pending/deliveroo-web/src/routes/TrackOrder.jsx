import { Link, useParams } from 'react-router-dom';
import useOrder from '../hooks/useOrder';
import useNow from '../hooks/useNow';
import RouteMap from '../components/booking/RouteMap';
import EtaPanel from '../components/tracking/EtaPanel';
import CourierCard from '../components/tracking/CourierCard';
import FindingAgent from '../components/tracking/FindingAgent';
import StatusTimeline from '../components/tracking/StatusTimeline';
import TransportBadge from '../components/transport/TransportBadge';
import TransportGlyph from '../components/transport/TransportGlyph';
import Button from '../components/ui/Button';
import PageShell from './PageShell';
import { TrackingSkeleton } from '../components/ui/Skeleton';
import {
  STATUS,
  STATUS_LABEL,
  currentLocationLabel,
  isArriving,
  isTerminal,
  progressFor,
  remainingKm,
  remainingSeconds
} from '../lib/orderStatus';
import { etaClock, formatDuration, formatKes, formatKm } from '../lib/pricing';
import { modeMeta, priorityOf, transportOf } from '../lib/transport';
import { color, eyebrow, font, layout, radius, statusTone } from '../theme';

/** One live figure: label above, value below. Four of them sit under the map. */
function LiveStat({ label, value, icon, mode }) {
  return (
    <div
      style={{
        flex: '1 1 140px',
        padding: '15px 17px',
        borderRadius: '18px',
        background: 'rgba(243,241,237,.06)',
        border: '1px solid rgba(243,241,237,.1)'
      }}
    >
      <div style={{ ...eyebrow, fontSize: '9.5px', color: 'rgba(243,241,237,.5)', marginBottom: '8px' }}>{label}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: 'clamp(17px,1.9vw,23px)',
          lineHeight: 1.1,
          letterSpacing: '-.02em',
          color: color.paper
        }}
      >
        {mode && <TransportGlyph mode={mode} size={19} color={color.orange} />}
        {icon}
        {value}
      </div>
    </div>
  );
}

// §14/§25 — map-led, dark, so the route and the vehicle are the only bright things.
export default function TrackOrder() {
  const { id } = useParams();
  const { order, loading } = useOrder(id);
  // Progress is a function of time, so the screen keeps its own clock.
  const now = useNow(20_000);

  if (loading) return <TrackingSkeleton />;
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

  const mode = transportOf(order);
  const meta = modeMeta(mode);
  const progress = progressFor(order, now);
  const secondsLeft = remainingSeconds(order, now);
  const etaMinutes = order.status === STATUS.DELIVERED ? 0 : Math.max(1, Math.round(secondsLeft / 60));
  const kmLeft = remainingKm(order, now);
  const arriving = isArriving(order, now);
  const live = !isTerminal(order.status);
  const tone = statusTone[order.status];

  const headline =
    order.status === STATUS.DELIVERED
      ? 'Delivered.'
      : order.status === STATUS.CANCELLED
        ? 'Delivery cancelled.'
        : arriving
          ? 'Arriving now.'
          : order.status === STATUS.PENDING
            ? 'Finding you a pickup agent.'
            : order.status === STATUS.ASSIGNED
              ? 'Your agent is on the way.'
              : `On the way by ${meta.label.toLowerCase()}.`;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ ...eyebrow, color: color.orange }}>Parcel #{order.id}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                height: '26px',
                padding: '0 11px',
                borderRadius: radius.pill,
                background: 'rgba(243,241,237,.1)',
                fontFamily: font.mono,
                fontSize: '10.5px',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: color.paper
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '99px',
                  background: tone,
                  animation: live ? 'livePulse 1.8s ease-in-out infinite' : 'none'
                }}
              />
              {STATUS_LABEL[order.status]}
            </span>
            <TransportBadge mode={mode} priority={priorityOf(order)} tone="dark" size="sm" />
          </div>

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

          {live && (
            <EtaPanel
              etaMinutes={etaMinutes}
              progress={progress}
              arrivalAt={etaClock(secondsLeft, now)}
              fromLabel={order.pickup.name || 'Pickup'}
              toLabel={order.destination.name || 'Destination'}
            />
          )}

          {order.status === STATUS.PENDING && !order.courier ? (
            <FindingAgent pickupLabel={order.pickup.name || order.pickup.label} />
          ) : order.courier ? (
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
                ? 'No agent was assigned to this delivery.'
                : 'An agent will be assigned shortly.'}
            </div>
          )}

          <div style={{ marginTop: '30px', paddingTop: '26px', borderTop: '1px solid rgba(243,241,237,.16)' }}>
            <div style={{ ...eyebrow, color: 'rgba(243,241,237,.5)', marginBottom: '20px' }}>
              Status · {STATUS_LABEL[order.status]}
            </div>
            <StatusTimeline order={order} tone="dark" />
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
            presentLocation={order.presentLocation}
            mode={mode}
            moving={live}
            height="clamp(340px,52vh,560px)"
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <LiveStat label="Current location" value={currentLocationLabel(order)} />
            <LiveStat label="Destination" value={order.destination.name || order.destination.label} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <LiveStat
              label={order.status === STATUS.DELIVERED ? 'Arrived' : 'ETA'}
              value={order.status === STATUS.DELIVERED ? 'Delivered' : etaClock(secondsLeft, now)}
            />
            <LiveStat
              label={live ? 'Distance remaining' : 'Distance'}
              value={live ? formatKm(kmLeft) : formatKm(order.route.distanceKm)}
            />
            <LiveStat label="Transport" value={meta.label} mode={mode} />
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 20px',
              padding: '14px 17px',
              borderRadius: '18px',
              background: 'rgba(243,241,237,.04)',
              border: '1px solid rgba(243,241,237,.08)',
              fontSize: '13.5px',
              color: 'rgba(243,241,237,.7)'
            }}
          >
            <span>
              Journey <strong style={{ color: color.paper }}>{formatKm(order.route.distanceKm)}</strong>
            </span>
            <span>
              Door to door{' '}
              <strong style={{ color: color.paper }}>
                {formatDuration(order.pricing?.durationSeconds || order.route.durationSeconds)}
              </strong>
            </span>
            <span>
              Fee <strong style={{ color: color.paper }}>{formatKes(order.pricing.total)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useOrder from '../hooks/useOrder';
import { dispatchAgent } from '../store/ordersSlice';
import StatusTimeline from '../components/tracking/StatusTimeline';
import CourierCard from '../components/tracking/CourierCard';
import FindingAgent from '../components/tracking/FindingAgent';
import RouteMap from '../components/booking/RouteMap';
import TransportBadge from '../components/transport/TransportBadge';
import Button from '../components/ui/Button';
import PageShell from './PageShell';
import { TrackingSkeleton } from '../components/ui/Skeleton';
import { STATUS, agentHasArrived, statusLabelFor } from '../lib/orderStatus';
import { formatDuration, formatKes, formatKm, isWeightVerified } from '../lib/pricing';
import { agentNoun, agentNounTitle, modeMeta, priorityOf, transportOf } from '../lib/transport';
import { color, eyebrow, font, layout, radius } from '../theme';

/** How long the search runs before an agent is matched. Long enough to read. */
const DISPATCH_DELAY_MS = 2600;

/**
 * §13/§25 — the moment after "Request pickup".
 *
 * This is not a receipt any more: it is the live request. The screen goes out looking
 * for an agent, then shows who is coming, in what, and how far away they are — the
 * Uber moment the whole flow builds to. Everything the old receipt carried is still
 * here, one column across.
 */
export default function Confirmation() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { order, loading } = useOrder(id);
  const requested = useRef(false);

  const awaitingAgent = order?.status === STATUS.PENDING && !order?.courier;

  // Ask dispatch for an agent, once, shortly after landing. The backend is idempotent,
  // so a re-render, a second tab or a retry cannot double-assign.
  useEffect(() => {
    if (!awaitingAgent || requested.current) return undefined;
    requested.current = true;
    const timer = setTimeout(() => dispatch(dispatchAgent(id)), DISPATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dispatch, id, awaitingAgent]);

  if (loading) return <TrackingSkeleton />;
  if (!order) return <PageShell eyebrow="Delivery" title="Order not found." />;

  const mode = transportOf(order);
  const meta = modeMeta(mode);
  const weighed = isWeightVerified(order.parcel);
  const justAssigned = order.status === STATUS.ASSIGNED;
  const noun = agentNoun(mode);
  const arrived = agentHasArrived(order);

  const headline = awaitingAgent
    ? `Finding your ${noun}.`
    : justAssigned
      ? `${agentNounTitle(mode)} assigned.`
      : order.status === STATUS.CANCELLED
        ? 'Delivery cancelled.'
        : 'Delivery confirmed';

  const facts = [
    ['Delivery method', meta.label],
    ['Pickup', order.pickup.label],
    ['Destination', order.destination.label],
    [
      weighed ? 'Package · weighed at pickup' : 'Package · as declared',
      `${weighed ? order.parcel.verifiedWeightKg : order.parcel.weightKg} kg${order.parcel.description ? ` · ${order.parcel.description}` : ''}`
    ],
    ['Distance', formatKm(order.route.distanceKm)],
    ['Estimated duration', formatDuration(order.pricing.durationSeconds || order.route.durationSeconds)],
    [weighed ? 'Delivery fee' : 'Estimated fee', formatKes(order.pricing.total)]
  ];

  return (
    <div style={{ background: color.greenDeep, paddingTop: '80px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ ...eyebrow, color: color.orange }}>Order #{order.id}</span>
            <TransportBadge mode={mode} priority={priorityOf(order)} tone="dark" size="sm" />
          </div>

          <h1
            style={{
              margin: '0 0 26px',
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: 'clamp(32px,4.6vw,62px)',
              lineHeight: 1.04,
              letterSpacing: '-.025em',
              color: color.paper
            }}
          >
            {headline}
          </h1>

          {awaitingAgent ? (
            <FindingAgent pickupLabel={order.pickup.name || order.pickup.label} mode={mode} />
          ) : order.courier ? (
            <CourierCard courier={order.courier} status={order.status} mode={mode} arrived={arrived} />
          ) : (
            <div
              style={{
                padding: '16px',
                borderRadius: radius.card,
                background: 'rgba(243,243,241,.06)',
                border: '1px solid rgba(243,243,241,.1)',
                fontSize: '14.5px',
                color: 'rgba(243,243,241,.7)'
              }}
            >
              {order.status === STATUS.CANCELLED
                ? `No ${noun} was assigned to this delivery.`
                : `A ${noun} will be assigned shortly.`}
            </div>
          )}

          <div style={{ marginTop: '26px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button as={Link} to={`/track/${order.id}`} icon="arrow_forward">
              {order.courier ? `Track ${noun}` : 'Track pickup'}
            </Button>
            <Button as={Link} to={`/orders/${order.id}`} variant="ghostLight">
              Manage delivery
            </Button>
          </div>

          <div style={{ marginTop: '30px', paddingTop: '26px', borderTop: '1px solid rgba(243,243,241,.16)' }}>
            <div style={{ ...eyebrow, color: 'rgba(243,243,241,.5)', marginBottom: '20px' }}>
              Status · {statusLabelFor(order)}
            </div>
            <StatusTimeline order={order} tone="dark" />
          </div>
        </div>

        <div style={{ flex: '1 1 420px', minWidth: 'min(100%,300px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <RouteMap
            pickup={order.pickup}
            destination={order.destination}
            route={order.route}
            courier={order.courier}
            mode={mode}
            moving={order.status === STATUS.IN_TRANSIT}
            height="clamp(260px,34vw,380px)"
          />

          <div
            style={{
              borderRadius: radius.card,
              border: '1px solid rgba(243,243,241,.12)',
              background: 'rgba(243,243,241,.05)',
              padding: 'clamp(18px,2.2vw,26px)'
            }}
          >
            {facts.map(([label, value], index) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '18px',
                  padding: '12px 0',
                  borderTop: index ? '1px solid rgba(243,243,241,.12)' : 'none',
                  fontSize: '14.5px'
                }}
              >
                <span style={{ color: 'rgba(243,243,241,.6)', flex: 'none' }}>{label}</span>
                <strong style={{ color: color.paper, textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
          </div>

          {!weighed && (
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'rgba(243,243,241,.6)' }}>
              We&apos;ll weigh the package when your {noun} collects it, and confirm the final fee
              from the measured weight. Keep order <span style={{ fontFamily: font.mono, letterSpacing: '.04em', color: color.paper }}>#{order.id}</span> to
              track this delivery later.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

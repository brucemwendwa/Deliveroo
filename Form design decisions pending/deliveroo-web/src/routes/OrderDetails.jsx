import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import useOrder from '../hooks/useOrder';
import useNow from '../hooks/useNow';
import { cancelOrder, changeDestination } from '../store/ordersSlice';
import { showToast } from '../store/uiSlice';
import { selectUser } from '../store/authSlice';
import { routeBetween } from '../api/geo';
import {
  blockedReason,
  canCancel,
  canChangeDestination,
  currentLocationLabel,
  isTerminal,
  remainingSeconds
} from '../lib/orderStatus';
import { etaClock, formatDuration, formatKes, formatKm, isWeightVerified, priceOrder } from '../lib/pricing';
import { modeMeta, priorityOf, priorityOption, transportOf } from '../lib/transport';
import { color, eyebrow, font, radius, shadow } from '../theme';
import PageShell from './PageShell';
import { TrackingSkeleton } from '../components/ui/Skeleton';
import RouteMap from '../components/booking/RouteMap';
import PlaceSearch from '../components/booking/PlaceSearch';
import StatusTimeline from '../components/tracking/StatusTimeline';
import CourierCard from '../components/tracking/CourierCard';
import TransportBadge from '../components/transport/TransportBadge';
import StatusPill from '../components/orders/StatusPill';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Icon from '../components/Icon';

const detailRow = (index) => ({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '18px',
  padding: '12px 0',
  borderTop: index ? `1px solid ${color.border}` : 'none',
  fontSize: '14.5px'
});

const card = {
  borderRadius: radius.card,
  border: `1px solid ${color.border}`,
  background: color.card,
  boxShadow: shadow.card,
  padding: 'clamp(18px,2.2vw,26px)'
};

function Section({ title, children }) {
  return (
    <div style={{ ...card, marginBottom: '16px' }}>
      <div style={{ ...eyebrow, marginBottom: '8px' }}>{title}</div>
      {children}
    </div>
  );
}

// §15–§17, §25 — everything about one delivery, plus the two actions the customer controls.
export default function OrderDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { order, loading } = useOrder(id);
  const user = useSelector(selectUser);
  const narrow = useSelector((state) => state.ui.narrow);
  const now = useNow(30_000);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [newDestination, setNewDestination] = useState(null);
  const [newRoute, setNewRoute] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <TrackingSkeleton tone="light" />;
  if (!order) return <PageShell eyebrow="Delivery" title="Order not found." />;

  const mode = transportOf(order);
  const meta = modeMeta(mode);
  const priority = priorityOf(order);
  const mayChange = canChangeDestination(order);
  const mayCancel = canCancel(order);
  const reason = blockedReason(order);
  // §17 — the delivery belongs to whoever booked it. Orders with no owner are the
  // seeded demo ones, which anyone may drive.
  const owned = !order.userId || order.userId === user?.id;

  const pickDestination = async (place) => {
    setNewDestination(place);
    setNewRoute(null);
    if (!place) return;
    setBusy(true);
    setNewRoute(await routeBetween(order.pickup, place));
    setBusy(false);
  };

  const confirmDestination = async () => {
    setBusy(true);
    const result = await dispatch(changeDestination({ id: order.id, destination: newDestination, route: newRoute }));
    setBusy(false);
    if (changeDestination.fulfilled.match(result)) {
      dispatch(showToast({ message: 'Destination updated.', tone: 'success' }));
      closeDestination();
    }
  };

  const closeDestination = () => {
    setDestOpen(false);
    setNewDestination(null);
    setNewRoute(null);
  };

  const confirmCancel = async () => {
    setBusy(true);
    const result = await dispatch(cancelOrder(order.id));
    setBusy(false);
    setCancelOpen(false);
    if (cancelOrder.fulfilled.match(result)) {
      dispatch(showToast({ message: `Delivery ${order.id} cancelled.`, tone: 'info' }));
    }
  };

  // priceOrder, not quote: once the parcel has been weighed the preview has to bill the
  // measured weight on the mode it is actually travelling — exactly as the backend will.
  const updatedQuote = newRoute ? priceOrder({ parcel: order.parcel, route: newRoute, transport: order.transport }) : null;

  const weighed = isWeightVerified(order.parcel);
  const pricing = order.pricing;

  const charges = [
    pricing.baseFare > 0 && ['Base fare', formatKes(pricing.baseFare)],
    ['Distance charge', formatKes(pricing.distanceCost)],
    ['Weight charge', formatKes(pricing.weightCost)],
    pricing.priorityCost > 0 && [`${priorityOption(priority).label} priority`, formatKes(pricing.priorityCost)],
    [
      weighed ? 'Total · final' : 'Total · estimated',
      weighed && order.quotedPricing && order.quotedPricing.total !== pricing.total
        ? `${formatKes(pricing.total)} · estimated ${formatKes(order.quotedPricing.total)}`
        : formatKes(pricing.total)
    ]
  ].filter(Boolean);

  const journey = [
    ['Pickup', order.pickup.label],
    ['Destination', order.destination.label],
    ['Current location', currentLocationLabel(order)],
    ['Distance', formatKm(order.route.distanceKm)],
    ['Door to door', formatDuration(pricing.durationSeconds || order.route.durationSeconds)],
    ...(isTerminal(order.status) ? [] : [['ETA', etaClock(remainingSeconds(order, now), now)]])
  ];

  const contents = [
    [
      weighed ? 'Weight · weighed at pickup' : 'Weight · as declared',
      `${weighed ? order.parcel.verifiedWeightKg : order.parcel.weightKg} kg`
    ],
    ...(order.parcel.description ? [['Contents', order.parcel.description]] : []),
    ['Sender', `${order.sender.name} · ${order.sender.phone}`],
    ['Recipient', `${order.recipient.name} · ${order.recipient.phone}`],
    ['Created', new Date(order.createdAt).toLocaleString('en-KE')]
  ];

  return (
    <PageShell
      eyebrow={`Order #${order.id}`}
      title="Delivery details"
      aside={
        <Button as={Link} to={`/track/${order.id}`} icon="near_me" iconPosition="left">
          Track live
        </Button>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,3.4vw,48px)', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 380px', minWidth: 'min(100%,300px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <StatusPill status={order.status} />
            <TransportBadge mode={mode} priority={priority} />
          </div>

          <Section title="Journey">
            {journey.map(([label, value], index) => (
              <div key={label} style={detailRow(index)}>
                <span style={{ color: color.muted, flex: 'none' }}>{label}</span>
                <strong style={{ color: color.ink, textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
          </Section>

          <Section title={`Price · ${meta.label}`}>
            {charges.map(([label, value], index) => (
              <div key={label} style={detailRow(index)}>
                <span style={{ color: color.muted, flex: 'none' }}>{label}</span>
                <strong style={{ color: color.ink, textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
            {!weighed && (
              <p style={{ margin: '12px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: color.muted }}>
                This fee is an estimate based on the weight you gave us. We weigh the package at
                pickup and confirm the final price then — you can cancel any time before delivery.
              </p>
            )}
          </Section>

          <Section title="Package & people">
            {contents.map(([label, value], index) => (
              <div key={label} style={detailRow(index)}>
                <span style={{ color: color.muted, flex: 'none' }}>{label}</span>
                <strong style={{ color: color.ink, textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
          </Section>

          {/* §16 / §17 — both actions state why they're unavailable rather than just greying out. */}
          <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Button variant="ghost" icon="edit_location_alt" disabled={!mayChange || !owned} onClick={() => setDestOpen(true)}>
              Change destination
            </Button>
            <Button variant="danger" icon="close" disabled={!mayCancel || !owned} onClick={() => setCancelOpen(true)}>
              Cancel delivery
            </Button>
          </div>
          {reason && (
            <p style={{ margin: '12px 0 0', fontSize: '13.5px', color: color.muted }}>
              {reason} Changes and cancellation are unavailable.
            </p>
          )}
          {!reason && !owned && (
            <p style={{ margin: '12px 0 0', fontSize: '13.5px', color: color.muted }}>
              Only the account that booked this delivery can change or cancel it.
            </p>
          )}
        </div>

        <div style={{ flex: '1 1 400px', minWidth: 'min(100%,300px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RouteMap
            pickup={order.pickup}
            destination={order.destination}
            route={order.route}
            courier={order.courier}
            presentLocation={order.presentLocation}
            mode={mode}
            moving={!isTerminal(order.status)}
            height="clamp(280px,38vw,420px)"
          />

          {order.courier && <CourierCard courier={order.courier} status={order.status} tone="light" />}

          <div>
            <div style={{ ...eyebrow, marginBottom: '18px' }}>Progress</div>
            <StatusTimeline order={order} />
          </div>
        </div>
      </div>

      {/* §16 — a bottom sheet on a phone, a dialog on a desktop. */}
      <Modal
        open={destOpen}
        onClose={closeDestination}
        title="Change destination"
        maxWidth="540px"
        placement={narrow ? 'sheet' : 'center'}
      >
        <h2 style={{ margin: '0 0 8px', fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(24px,3.4vw,32px)', color: color.ink }}>
          Change destination
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '14.5px', lineHeight: 1.55, color: color.body }}>
          We&apos;ll re-route from {order.pickup.name} and re-price it on the {meta.label.toLowerCase()} tariff
          before anything is confirmed.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            borderRadius: radius.field,
            background: 'rgba(28,32,31,.04)',
            fontSize: '13.5px',
            color: color.body
          }}
        >
          <Icon name="flag" size={17} color={color.muted} style={{ flex: 'none', marginTop: '1px' }} />
          <span>
            <span style={{ ...eyebrow, fontSize: '9.5px', display: 'block', marginBottom: '3px' }}>Current destination</span>
            {order.destination.label}
          </span>
        </div>

        <PlaceSearch value={newDestination} onChange={pickDestination} placeholder="New destination" autoFocus />

        {busy && !newRoute && (
          <p style={{ margin: '16px 0 0', fontSize: '14px', color: color.muted }}>Working out the new route…</p>
        )}

        {newRoute && updatedQuote && (
          <>
            <div style={{ marginTop: '18px' }}>
              <RouteMap
                pickup={order.pickup}
                destination={newDestination}
                route={newRoute}
                mode={mode}
                height="200px"
              />
            </div>

            <div
              style={{
                marginTop: '14px',
                padding: '16px 18px',
                borderRadius: radius.card,
                background: 'rgba(28,32,31,.04)',
                border: `1px solid ${color.border}`
              }}
            >
              {[
                ['New distance', formatKm(newRoute.distanceKm), formatKm(order.route.distanceKm)],
                [
                  'New duration',
                  formatDuration(updatedQuote.durationSeconds),
                  formatDuration(pricing.durationSeconds || order.route.durationSeconds)
                ]
              ].map(([label, next, was]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '6px 0', fontSize: '14px' }}>
                  <span style={{ color: color.muted }}>{label}</span>
                  <span style={{ color: color.ink, fontWeight: 600 }}>
                    {next} <span style={{ color: color.muted, fontWeight: 500 }}>was {was}</span>
                  </span>
                </div>
              ))}
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${color.border}` }}>
                <div style={{ ...eyebrow, fontSize: '10px', marginBottom: '8px' }}>Updated delivery price</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(30px,4vw,42px)', lineHeight: 1, color: color.ink }}>
                    {formatKes(updatedQuote.total)}
                  </span>
                  {updatedQuote.total !== pricing.total && (
                    <span style={{ fontSize: '13.5px', color: color.muted }}>was {formatKes(pricing.total)}</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={confirmDestination} disabled={!newRoute || busy} icon="arrow_forward">
            Update Destination
          </Button>
          <Button variant="ghost" onClick={closeDestination}>
            Keep current
          </Button>
        </div>
      </Modal>

      {/* §17 */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this delivery?"
        maxWidth="440px"
        placement={narrow ? 'sheet' : 'center'}
      >
        <h2 style={{ margin: '0 0 10px', fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(24px,3.4vw,32px)', color: color.ink }}>
          Cancel this delivery?
        </h2>
        <p style={{ margin: '0 0 8px', fontSize: '15px', lineHeight: 1.55, color: color.body }}>
          Your delivery has not yet been completed. Are you sure you want to cancel it?
        </p>
        <p style={{ margin: '0 0 22px', fontSize: '14px', fontWeight: 600, color: color.orangeDeep }}>
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="dark" onClick={() => setCancelOpen(false)}>
            Keep Delivery
          </Button>
          <Button variant="danger" onClick={confirmCancel} disabled={busy}>
            Cancel Delivery
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}

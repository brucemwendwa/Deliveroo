import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useOrder from '../hooks/useOrder';
import { cancelOrder, changeDestination } from '../store/ordersSlice';
import { showToast } from '../store/uiSlice';
import { routeBetween } from '../api/geo';
import { STATUS_LABEL, blockedReason, canCancel, canChangeDestination } from '../lib/orderStatus';
import { formatDuration, formatKes, formatKm, quote } from '../lib/pricing';
import { color, eyebrow, font, radius, statusTone } from '../theme';
import PageShell from './PageShell';
import RouteMap from '../components/booking/RouteMap';
import PlaceSearch from '../components/booking/PlaceSearch';
import StatusTimeline from '../components/tracking/StatusTimeline';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const detailRow = (index) => ({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '18px',
  padding: '13px 0',
  borderTop: index ? '1px solid rgba(17,17,17,.1)' : 'none',
  fontSize: '14.5px'
});

// §15 — everything about one delivery, plus the two actions the customer controls.
export default function OrderDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { order, loading } = useOrder(id);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [newDestination, setNewDestination] = useState(null);
  const [newRoute, setNewRoute] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageShell eyebrow="Delivery" title="Loading…" />;
  if (!order) return <PageShell eyebrow="Delivery" title="Order not found." />;

  const mayChange = canChangeDestination(order);
  const mayCancel = canCancel(order);
  const reason = blockedReason(order);

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

  const updatedQuote = newRoute ? quote({ weightKg: order.parcel.weightKg, distanceKm: newRoute.distanceKm }) : null;

  const details = [
    ['Order ID', order.id],
    ['Status', STATUS_LABEL[order.status]],
    ['Pickup', order.pickup.label],
    ['Destination', order.destination.label],
    ['Package', `${order.parcel.weightKg} kg${order.parcel.description ? ` · ${order.parcel.description}` : ''}`],
    ['Distance', formatKm(order.route.distanceKm)],
    ['Estimated duration', formatDuration(order.route.durationSeconds)],
    ['Delivery fee', formatKes(order.pricing.total)],
    ['Sender', `${order.sender.name} · ${order.sender.phone}`],
    ['Recipient', `${order.recipient.name} · ${order.recipient.phone}`],
    ['Courier', order.courier ? `${order.courier.name} · ${order.courier.vehicle}` : 'Not yet assigned'],
    ['Created', new Date(order.createdAt).toLocaleString('en-KE')]
  ];

  return (
    <PageShell
      eyebrow={`Order #${order.id}`}
      title="Delivery details"
      aside={
        <Button as={Link} to={`/track/${order.id}`} icon="arrow_forward">
          Track live
        </Button>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,4vw,56px)', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 380px', minWidth: 'min(100%,300px)' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '34px',
              padding: '0 14px',
              marginBottom: '20px',
              borderRadius: radius.pill,
              background: 'rgba(17,17,17,.06)',
              fontFamily: font.mono,
              fontSize: '11px',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: statusTone[order.status]
            }}
          >
            <span aria-hidden="true" style={{ width: '7px', height: '7px', borderRadius: '99px', background: statusTone[order.status] }} />
            {STATUS_LABEL[order.status]}
          </span>

          <div
            style={{
              borderRadius: radius.card,
              border: '1px solid rgba(17,17,17,.12)',
              background: color.white,
              padding: 'clamp(20px,2.4vw,28px)'
            }}
          >
            {details.map(([label, value], index) => (
              <div key={label} style={detailRow(index)}>
                <span style={{ color: color.muted, flex: 'none' }}>{label}</span>
                <strong style={{ color: color.ink, textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
          </div>

          {/* §16 / §17 — both actions state why they're unavailable rather than just greying out. */}
          <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Button variant="ghost" icon="edit_location_alt" disabled={!mayChange} onClick={() => setDestOpen(true)}>
              Change destination
            </Button>
            <Button variant="danger" icon="close" disabled={!mayCancel} onClick={() => setCancelOpen(true)}>
              Cancel delivery
            </Button>
          </div>
          {reason && (
            <p style={{ margin: '12px 0 0', fontSize: '13.5px', color: color.muted }}>
              {reason} Changes and cancellation are unavailable.
            </p>
          )}
        </div>

        <div style={{ flex: '1 1 400px', minWidth: 'min(100%,300px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RouteMap
            pickup={order.pickup}
            destination={order.destination}
            route={order.route}
            courier={order.courier}
            height="clamp(280px,38vw,420px)"
          />
          <div>
            <div style={{ ...eyebrow, marginBottom: '18px' }}>Progress</div>
            <StatusTimeline status={order.status} />
          </div>
        </div>
      </div>

      {/* §16 */}
      <Modal open={destOpen} onClose={closeDestination} title="Change destination" maxWidth="520px">
        <h2 style={{ margin: '0 0 8px', fontFamily: font.display, fontWeight: 700, fontSize: 'clamp(24px,3.4vw,34px)', textTransform: 'uppercase', color: color.ink }}>
          Change destination
        </h2>
        <p style={{ margin: '0 0 22px', fontSize: '14.5px', color: color.body }}>
          We&apos;ll re-route from {order.pickup.name} and update the price before anything is confirmed.
        </p>

        <PlaceSearch value={newDestination} onChange={pickDestination} placeholder="New destination" autoFocus />

        {busy && !newRoute && (
          <p style={{ margin: '16px 0 0', fontSize: '14px', color: color.muted }}>Working out the new route…</p>
        )}

        {newRoute && updatedQuote && (
          <div
            style={{
              marginTop: '20px',
              padding: '18px',
              borderRadius: radius.card,
              background: 'rgba(17,17,17,.04)',
              border: '1px solid rgba(17,17,17,.1)'
            }}
          >
            {[
              ['New distance', formatKm(newRoute.distanceKm), formatKm(order.route.distanceKm)],
              ['New duration', formatDuration(newRoute.durationSeconds), formatDuration(order.route.durationSeconds)]
            ].map(([label, next, was]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '6px 0', fontSize: '14px' }}>
                <span style={{ color: color.muted }}>{label}</span>
                <span style={{ color: color.ink, fontWeight: 700 }}>
                  {next} <span style={{ color: color.muted, fontWeight: 500 }}>was {was}</span>
                </span>
              </div>
            ))}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(17,17,17,.12)' }}>
              <div style={{ ...eyebrow, fontSize: '10px', marginBottom: '8px' }}>Updated delivery price</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1, color: color.ink }}>
                  {formatKes(updatedQuote.total)}
                </span>
                {updatedQuote.total !== order.pricing.total && (
                  <span style={{ fontSize: '13.5px', color: color.muted }}>was {formatKes(order.pricing.total)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '22px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={confirmDestination} disabled={!newRoute || busy} icon="arrow_forward">
            Confirm new destination
          </Button>
          <Button variant="ghost" onClick={closeDestination}>
            Keep current
          </Button>
        </div>
      </Modal>

      {/* §17 */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this delivery?" maxWidth="440px">
        <h2 style={{ margin: '0 0 10px', fontFamily: font.display, fontWeight: 700, fontSize: 'clamp(24px,3.4vw,34px)', textTransform: 'uppercase', color: color.ink }}>
          Cancel this delivery?
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.55, color: color.body }}>
          Your delivery has not yet been completed. Are you sure you want to cancel it?
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

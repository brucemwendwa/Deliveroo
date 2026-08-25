import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeStatus, fetchAllOrders, moveCourier, selectAllOrders, selectOrder } from '../store/ordersSlice';
import { selectIsAdmin } from '../store/authSlice';
import { openAuthModal, showToast } from '../store/uiSlice';
import useOrderSync from '../hooks/useOrderSync';
import { STATUS_LABEL, allowedTransitions } from '../lib/orderStatus';
import { formatDelta, formatDuration, formatKes, formatKm, isWeightVerified, weightDiscrepancy } from '../lib/pricing';
import { color, control, eyebrow, font, radius, statusTone } from '../theme';
import RouteMap from '../components/booking/RouteMap';
import StatusTimeline from '../components/tracking/StatusTimeline';
import WeighParcel from '../components/admin/WeighParcel';
import Button from '../components/ui/Button';
import PageShell from './PageShell';

// §18 — map-centred console. Every mutation here broadcasts through the backend
// adapter, so a customer's /track/:id screen in another tab follows along live.
export default function AdminDashboard() {
  const dispatch = useDispatch();
  const isAdmin = useSelector(selectIsAdmin);
  const orders = useSelector(selectAllOrders);
  const selectedId = useSelector((state) => state.orders.selectedId);
  const selected = orders.find((order) => order.id === selectedId) || orders[0] || null;

  useEffect(() => {
    if (isAdmin) dispatch(fetchAllOrders());
  }, [dispatch, isAdmin]);

  useOrderSync(() => {
    if (isAdmin) dispatch(fetchAllOrders());
  });

  if (!isAdmin) {
    return (
      <PageShell eyebrow="Admin" title="Admin access required.">
        <p style={{ margin: '0 0 24px', maxWidth: '46ch', fontSize: '16px', lineHeight: 1.6, color: color.body }}>
          The dispatch console is for staff accounts. Sign in to continue.
        </p>
        <Button onClick={() => dispatch(openAuthModal('/admin'))} icon="arrow_forward">
          Sign in
        </Button>
      </PageShell>
    );
  }

  const setStatus = async (status) => {
    const result = await dispatch(changeStatus({ id: selected.id, status }));
    if (changeStatus.fulfilled.match(result)) {
      dispatch(showToast({ message: `${selected.id} → ${STATUS_LABEL[status]}`, tone: 'success' }));
    }
  };

  return (
    // PageShell, not a bare light page: the fixed nav is white text sized for the hero
    // photo, so an interior route that starts on paper leaves it unreadable at scroll 0.
    <PageShell
      eyebrow="Dispatch console"
      title={`${orders.length} deliveries`}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px,3vw,40px)', alignItems: 'flex-start' }}>
          {/* Order list */}
          <div style={{ flex: '1 1 340px', minWidth: 'min(100%,300px)' }}>
            {orders.length === 0 && (
              <p style={{ fontSize: '15px', color: color.body }}>No deliveries in the system yet.</p>
            )}
            {orders.map((order) => {
              const active = selected?.id === order.id;
              const weighed = isWeightVerified(order.parcel);
              const flagged = weightDiscrepancy(order.parcel)?.flagged;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => dispatch(selectOrder(order.id))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '16px 14px',
                    marginBottom: '6px',
                    borderRadius: '16px',
                    border: `1.5px solid ${active ? color.ink : 'transparent'}`,
                    background: active ? color.white : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: font.body
                  }}
                >
                  <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '99px', background: statusTone[order.status], flex: 'none' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '14.5px', fontWeight: 700, letterSpacing: '-.02em', color: color.ink }}>
                      {order.pickup.name} → {order.destination.name}
                    </span>
                    <span style={{ display: 'block', marginTop: '3px', fontFamily: font.mono, fontSize: '11px', letterSpacing: '.08em', color: color.muted }}>
                      {order.id} · {STATUS_LABEL[order.status]}
                      {flagged && <span style={{ color: color.orangeDeep }}> · UNDER-DECLARED</span>}
                    </span>
                  </span>
                  <span style={{ flex: 'none', textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: color.ink }}>
                      {formatKes(order.pricing.total)}
                    </span>
                    {/* An unweighed order is still on the customer's own figure — say so. */}
                    {!weighed && (
                      <span style={{ display: 'block', marginTop: '2px', fontFamily: font.mono, fontSize: '10px', letterSpacing: '.08em', color: color.muted }}>
                        EST.
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected order */}
          {selected && (
            <div style={{ flex: '1 1 460px', minWidth: 'min(100%,300px)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <RouteMap
                pickup={selected.pickup}
                destination={selected.destination}
                route={selected.route}
                courier={selected.courier}
                height="clamp(300px,42vw,440px)"
                draggableCourier
                onCourierDrag={({ lat, lng }) => dispatch(moveCourier({ id: selected.id, lat, lng }))}
              />
              {selected.courier && (
                <p style={{ margin: 0, fontSize: '13px', color: color.muted }}>
                  Drag the orange marker to update {selected.courier.name}&apos;s position — the customer&apos;s tracking
                  screen follows immediately.
                </p>
              )}

              {/* §9/§18 — the fare is settled here, on our scale, not on the booking form. */}
              <WeighParcel order={selected} />

              <div
                style={{
                  borderRadius: radius.card,
                  border: '1px solid rgba(17,17,17,.12)',
                  background: color.white,
                  padding: 'clamp(18px,2.2vw,26px)'
                }}
              >
                <div style={{ ...eyebrow, marginBottom: '14px' }}>Update status</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                  {allowedTransitions(selected.status).length === 0 ? (
                    <span style={{ fontSize: '14px', color: color.muted }}>
                      {STATUS_LABEL[selected.status]} is final — no further changes.
                    </span>
                  ) : (
                    allowedTransitions(selected.status).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatus(status)}
                        style={{ ...control.chip, minHeight: '44px' }}
                      >
                        {STATUS_LABEL[status]}
                      </button>
                    ))
                  )}
                </div>

                <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
                  {[
                    ['Pickup', selected.pickup.label],
                    ['Destination', selected.destination.label],
                    ['Distance', formatKm(selected.route.distanceKm)],
                    ['Journey', formatDuration(selected.route.durationSeconds)],
                    [
                      isWeightVerified(selected.parcel) ? 'Weight · measured' : 'Weight · declared',
                      isWeightVerified(selected.parcel)
                        ? `${selected.parcel.verifiedWeightKg} kg (${formatDelta(weightDiscrepancy(selected.parcel).deltaKg)})`
                        : `${selected.parcel.weightKg} kg`
                    ],
                    [
                      isWeightVerified(selected.parcel) ? 'Fee · final' : 'Fee · estimated',
                      formatKes(selected.pricing.total)
                    ]
                  ].map(([label, value]) => (
                    <div key={label} style={{ paddingTop: '12px', borderTop: '1px solid rgba(17,17,17,.1)' }}>
                      <div style={{ ...eyebrow, fontSize: '9.5px', marginBottom: '6px' }}>{label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: color.ink }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '4px' }}>
                <div style={{ ...eyebrow, marginBottom: '16px' }}>Progress</div>
                <StatusTimeline status={selected.status} />
              </div>
            </div>
          )}
      </div>
    </PageShell>
  );
}

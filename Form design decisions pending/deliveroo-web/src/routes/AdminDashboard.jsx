import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  changeStatus,
  fetchAllOrders,
  moveCourier,
  selectAllOrders,
  selectOrder,
  selectOrderStats
} from '../store/ordersSlice';
import { fetchFleet } from '../store/fleetSlice';
import { selectIsAdmin } from '../store/authSlice';
import { openAuthModal, showToast } from '../store/uiSlice';
import useOrderSync from '../hooks/useOrderSync';
import { STATUS, STATUS_LABEL, agentHasArrived, allowedTransitions, isTerminal, statusLabelFor } from '../lib/orderStatus';
import { formatDelta, formatDuration, formatKes, formatKm, isWeightVerified, weightDiscrepancy } from '../lib/pricing';
import { modeMeta, priorityOf, transportOf } from '../lib/transport';
import { color, control, eyebrow, font, radius } from '../theme';
import RouteMap from '../components/booking/RouteMap';
import StatusTimeline from '../components/tracking/StatusTimeline';
import CourierCard from '../components/tracking/CourierCard';
import WeighParcel from '../components/admin/WeighParcel';
import FleetPanel from '../components/admin/FleetPanel';
import DeliveryTable from '../components/admin/DeliveryTable';
import RiderAssignment from '../components/admin/RiderAssignment';
import LocationUpdater from '../components/admin/LocationUpdater';
import TrackingHistory from '../components/admin/TrackingHistory';
import TransportBadge from '../components/transport/TransportBadge';
import StatusPill from '../components/orders/StatusPill';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import StatTile from '../components/ui/StatTile';
import Icon from '../components/Icon';
import PageShell from './PageShell';

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: STATUS.PENDING, label: STATUS_LABEL[STATUS.PENDING] },
  { id: STATUS.ASSIGNED, label: STATUS_LABEL[STATUS.ASSIGNED] },
  { id: STATUS.PICKED_UP, label: STATUS_LABEL[STATUS.PICKED_UP] },
  { id: STATUS.IN_TRANSIT, label: STATUS_LABEL[STATUS.IN_TRANSIT] },
  { id: STATUS.DELIVERED, label: STATUS_LABEL[STATUS.DELIVERED] },
  { id: STATUS.CANCELLED, label: STATUS_LABEL[STATUS.CANCELLED] }
];

const card = {
  borderRadius: radius.card,
  border: '1px solid rgba(17,17,17,.12)',
  background: color.white,
  padding: 'clamp(18px,2.2vw,26px)'
};

// §18/§26 — dispatch console. Every mutation here broadcasts through the backend
// adapter, so a customer's /track/:id screen in another tab follows along live.
export default function AdminDashboard() {
  const dispatch = useDispatch();
  const isAdmin = useSelector(selectIsAdmin);
  const orders = useSelector(selectAllOrders);
  const stats = useSelector(selectOrderStats);
  const selectedId = useSelector((state) => state.orders.selectedId);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (!isAdmin) return;
    dispatch(fetchAllOrders());
    dispatch(fetchFleet());
  }, [dispatch, isAdmin]);

  useOrderSync(() => {
    if (isAdmin) {
      dispatch(fetchAllOrders());
      dispatch(fetchFleet());
    }
  });

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== 'ALL' && order.status !== filter) return false;
      if (!needle) return true;
      return [order.id, order.pickup.label, order.destination.label, order.sender?.name]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle));
    });
  }, [orders, query, filter]);

  const selected = orders.find((order) => order.id === selectedId) || visible[0] || orders[0] || null;

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

  const tiles = [
    { label: 'Total', value: stats.total, icon: 'inventory_2' },
    { label: 'Pending', value: stats[STATUS.PENDING], icon: 'pending', status: STATUS.PENDING },
    { label: 'Accepted', value: stats[STATUS.ASSIGNED], icon: 'how_to_reg', status: STATUS.ASSIGNED },
    { label: 'Picked up', value: stats[STATUS.PICKED_UP], icon: 'package_2', status: STATUS.PICKED_UP },
    { label: 'In transit', value: stats[STATUS.IN_TRANSIT], icon: 'conversion_path', status: STATUS.IN_TRANSIT },
    { label: 'Delivered', value: stats[STATUS.DELIVERED], icon: 'task_alt', status: STATUS.DELIVERED },
    { label: 'Cancelled', value: stats[STATUS.CANCELLED], icon: 'cancel', status: STATUS.CANCELLED }
  ];

  return (
    // PageShell, not a bare light page: the fixed nav is white text sized for the hero
    // photo, so an interior route that starts on paper leaves it unreadable at scroll 0.
    <PageShell eyebrow="Dispatch console" title={`${orders.length} deliveries`}>
      {/* Tiles double as filters — the number and the way to see what's behind it. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: 'clamp(22px,3vw,34px)' }}>
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
            active={tile.status ? filter === tile.status : filter === 'ALL'}
            onClick={() => setFilter(tile.status || 'ALL')}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px,3vw,36px)', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 560px', minWidth: 'min(100%,300px)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search parcel, customer or place"
                aria-label="Search deliveries"
                style={{ ...control.field, height: '48px', paddingLeft: '42px' }}
              />
              <Icon
                name="search"
                size={18}
                color={color.muted}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {FILTERS.map((option) => (
              <Chip
                key={option.id}
                active={filter === option.id}
                onClick={() => setFilter(option.id)}
                style={{ minHeight: '38px', fontSize: '13px' }}
              >
                {option.label}
              </Chip>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={orders.length ? 'Nothing matches that filter' : 'No deliveries in the system yet'}
              body={
                orders.length
                  ? 'Clear the search or pick another status to see the rest of the board.'
                  : 'Deliveries appear here the moment a customer requests a pickup.'
              }
            />
          ) : (
            <DeliveryTable
              orders={visible}
              selectedId={selected?.id}
              onSelect={(id) => dispatch(selectOrder(id))}
            />
          )}

          <div style={{ marginTop: '20px' }}>
            <FleetPanel />
          </div>
        </div>

        {/* Selected order */}
        {selected && (
          <div style={{ flex: '1 1 380px', minWidth: 'min(100%,300px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: font.mono, fontSize: '12.5px', letterSpacing: '.06em', color: color.muted }}>
                {selected.id}
              </span>
              <StatusPill status={selected.status} size="sm" />
              <TransportBadge mode={transportOf(selected)} priority={priorityOf(selected)} size="sm" />
            </div>

            <RouteMap
              pickup={selected.pickup}
              destination={selected.destination}
              route={selected.route}
              courier={selected.courier}
              presentLocation={selected.presentLocation}
              mode={transportOf(selected)}
              moving={!isTerminal(selected.status)}
              height="clamp(260px,34vw,380px)"
              draggableCourier
              onCourierDrag={({ lat, lng }) => dispatch(moveCourier({ id: selected.id, lat, lng }))}
            />
            {selected.courier && (
              <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.5, color: color.muted }}>
                Drag the vehicle marker to update {selected.courier.name}&apos;s position — the customer&apos;s
                tracking screen follows immediately.
              </p>
            )}

            {selected.courier && (
              <CourierCard
                courier={selected.courier}
                status={selected.status}
                mode={transportOf(selected)}
                arrived={agentHasArrived(selected)}
                tone="light"
              />
            )}

            {/* §26 — who is carrying it, and the way to match one when nobody is. */}
            <div style={card}>
              <RiderAssignment order={selected} />
            </div>

            {/* §9/§18 — the fare is settled here, on our scale, not on the booking form. */}
            <WeighParcel order={selected} />

            <div style={card}>
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
                  ['Transport', modeMeta(transportOf(selected)).label],
                  ['Status', statusLabelFor(selected)],
                  ['Distance', formatKm(selected.route.distanceKm)],
                  ['Door to door', formatDuration(selected.pricing.durationSeconds || selected.route.durationSeconds)],
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

            <div style={card}>
              <LocationUpdater order={selected} />
            </div>

            <div style={card}>
              <TrackingHistory order={selected} />
            </div>

            <div style={{ paddingTop: '4px' }}>
              <div style={{ ...eyebrow, marginBottom: '16px' }}>Progress</div>
              <StatusTimeline order={selected} />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

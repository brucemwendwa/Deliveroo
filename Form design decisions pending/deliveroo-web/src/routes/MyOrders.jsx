import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, selectActiveOrder, selectAllOrders, selectOrderStats } from '../store/ordersSlice';
import { selectUser } from '../store/authSlice';
import { openAuthModal } from '../store/uiSlice';
import useOrderSync from '../hooks/useOrderSync';
import { STATUS, STATUS_LABEL, isTerminal } from '../lib/orderStatus';
import { formatKes } from '../lib/pricing';
import { TRANSPORT_MODES, transportOf } from '../lib/transport';
import { color, control, eyebrow, font, radius } from '../theme';
import PageShell from './PageShell';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import StatTile from '../components/ui/StatTile';
import Icon from '../components/Icon';
import ActiveDelivery from '../components/orders/ActiveDelivery';
import DeliveryCard from '../components/orders/DeliveryCard';
import TransportGlyph from '../components/transport/TransportGlyph';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: STATUS.PENDING, label: STATUS_LABEL[STATUS.PENDING] },
  { id: STATUS.IN_TRANSIT, label: STATUS_LABEL[STATUS.IN_TRANSIT] },
  { id: STATUS.DELIVERED, label: STATUS_LABEL[STATUS.DELIVERED] },
  { id: STATUS.CANCELLED, label: STATUS_LABEL[STATUS.CANCELLED] }
];

/**
 * §15 — the customer's dashboard. The live delivery comes first and loudest; the
 * history below it is searchable and filterable, because once someone has sent a
 * dozen parcels a flat list stops being useful.
 */
export default function MyOrders() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const orders = useSelector(selectAllOrders);
  const active = useSelector(selectActiveOrder);
  const stats = useSelector(selectOrderStats);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [mode, setMode] = useState('ALL');

  useEffect(() => {
    if (user) dispatch(fetchOrders(user.id));
  }, [dispatch, user]);

  useOrderSync(() => {
    if (user) dispatch(fetchOrders(user.id));
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status === 'ACTIVE' ? isTerminal(order.status) : status !== 'ALL' && order.status !== status) return false;
      if (mode !== 'ALL' && transportOf(order) !== mode) return false;
      if (!needle) return true;
      return [order.id, order.pickup.label, order.destination.label, order.parcel?.description]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle));
    });
  }, [orders, query, status, mode]);

  if (!user) {
    return (
      <PageShell eyebrow="Deliveries" title="Sign in to see your deliveries.">
        <Button onClick={() => dispatch(openAuthModal('/orders'))} icon="arrow_forward">
          Sign in
        </Button>
      </PageShell>
    );
  }

  const filtersOn = query.trim() || status !== 'ALL' || mode !== 'ALL';

  return (
    <PageShell
      eyebrow={`${stats.total} ${stats.total === 1 ? 'delivery' : 'deliveries'}`}
      title="Your deliveries"
      aside={
        <Button as={Link} to="/book" icon="add" iconPosition="left" size="lg">
          Request Delivery
        </Button>
      }
    >
      {orders.length === 0 ? (
        <EmptyState
          icon="local_shipping"
          title="Nothing on the road yet"
          body="Tell us where to collect a parcel and where it's going. We'll come and get it by motorbike, road, air, sea or drone, whichever suits the route."
          action={
            <Button as={Link} to="/book" icon="arrow_forward">
              Request your first delivery
            </Button>
          }
        />
      ) : (
        <>
          {active && (
            <div style={{ marginBottom: 'clamp(24px,3vw,40px)' }}>
              <ActiveDelivery order={active} />
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: 'clamp(26px,3vw,40px)' }}>
            <StatTile label="Total deliveries" value={stats.total} icon="inventory_2" />
            <StatTile label="In progress" value={stats.active} icon="pending" hint="Not yet delivered" />
            <StatTile label="Delivered" value={stats[STATUS.DELIVERED]} icon="task_alt" />
            <StatTile label="Total spend" value={formatKes(stats.spend)} icon="payments" hint="Cancelled orders excluded" />
          </div>

          <div style={{ ...eyebrow, marginBottom: '14px' }}>Recent deliveries</div>

          {/* Search first, then the two axes people actually filter on. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 'min(100%,240px)' }}>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by order number or place"
                aria-label="Search deliveries"
                style={{ ...control.field, height: '50px', paddingLeft: '44px' }}
              />
              <Icon
                name="search"
                size={19}
                color={color.muted}
                style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>
            {filtersOn && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatus('ALL');
                  setMode('ALL');
                }}
                style={{
                  height: '44px',
                  padding: '0 16px',
                  borderRadius: radius.pill,
                  border: 'none',
                  background: 'transparent',
                  fontFamily: font.body,
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: color.muted,
                  cursor: 'pointer'
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {STATUS_FILTERS.map((filter) => (
              <Chip
                key={filter.id}
                active={status === filter.id}
                onClick={() => setStatus(filter.id)}
                style={{ minHeight: '40px', fontSize: '13.5px' }}
              >
                {filter.label}
              </Chip>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
            <Chip active={mode === 'ALL'} onClick={() => setMode('ALL')} style={{ minHeight: '40px', fontSize: '13.5px' }}>
              Every mode
            </Chip>
            {TRANSPORT_MODES.map((meta) => {
              const on = mode === meta.id;
              return (
                <Chip
                  key={meta.id}
                  active={on}
                  onClick={() => setMode(meta.id)}
                  style={{ minHeight: '40px', fontSize: '13.5px', gap: '8px' }}
                >
                  <TransportGlyph
                    mode={meta.id}
                    size={17}
                    color={on ? color.orange : color.orangeDeep}
                    style={{ marginRight: '7px' }}
                  />
                  {meta.label}
                </Chip>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No deliveries match that"
              body="Try a different order number, or clear the filters to see everything you've sent."
            />
          ) : (
            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,320px),1fr))' }}>
              {filtered.map((order) => (
                <DeliveryCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

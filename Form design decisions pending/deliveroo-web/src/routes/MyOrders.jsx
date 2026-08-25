import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, selectAllOrders } from '../store/ordersSlice';
import { selectUser } from '../store/authSlice';
import { openAuthModal } from '../store/uiSlice';
import useOrderSync from '../hooks/useOrderSync';
import { STATUS_LABEL } from '../lib/orderStatus';
import { formatKes, formatKm, isWeightVerified } from '../lib/pricing';
import { color, font, radius, statusTone } from '../theme';
import PageShell from './PageShell';
import Button from '../components/ui/Button';
import Icon from '../components/Icon';

/** §15 — the customer's own deliveries. */
export default function MyOrders() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const orders = useSelector(selectAllOrders);

  useEffect(() => {
    if (user) dispatch(fetchOrders(user.id));
  }, [dispatch, user]);

  useOrderSync(() => {
    if (user) dispatch(fetchOrders(user.id));
  });

  if (!user) {
    return (
      <PageShell eyebrow="Deliveries" title="Sign in to see your deliveries.">
        <Button onClick={() => dispatch(openAuthModal('/orders'))} icon="arrow_forward">
          Sign in
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow={`${orders.length} ${orders.length === 1 ? 'delivery' : 'deliveries'}`} title="Your deliveries">
      {orders.length === 0 ? (
        <>
          <p style={{ margin: '0 0 24px', fontSize: '16px', color: color.body }}>
            Nothing here yet. Your first delivery will show up as soon as you send one.
          </p>
          <Button as={Link} to="/book" icon="arrow_forward">
            Send a package
          </Button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'clamp(12px,2vw,24px)',
                padding: 'clamp(18px,2.2vw,24px) 0',
                borderTop: '1px solid rgba(17,17,17,.12)',
                color: color.ink
              }}
            >
              <span style={{ fontFamily: font.mono, fontSize: '12.5px', letterSpacing: '.06em', color: color.muted, flex: 'none' }}>
                {order.id}
              </span>
              <span style={{ flex: '1 1 220px', minWidth: 0, fontSize: '15.5px', fontWeight: 700, letterSpacing: '-.02em' }}>
                {order.pickup.name} → {order.destination.name}
              </span>
              <span style={{ flex: 'none', fontSize: '14px', color: color.body }}>{formatKm(order.route.distanceKm)}</span>
              <span style={{ flex: 'none', fontSize: '14px', fontWeight: 700 }}>
                {formatKes(order.pricing.total)}
                {/* Not yet weighed — this is still the estimate, not the bill. */}
                {!isWeightVerified(order.parcel) && (
                  <span style={{ marginLeft: '5px', fontWeight: 500, fontSize: '12px', color: color.muted }}>est.</span>
                )}
              </span>
              <span
                style={{
                  flex: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: radius.pill,
                  background: 'rgba(17,17,17,.05)',
                  fontFamily: font.mono,
                  fontSize: '10.5px',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: statusTone[order.status]
                }}
              >
                <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '99px', background: statusTone[order.status] }} />
                {STATUS_LABEL[order.status]}
              </span>
              <Icon name="arrow_outward" size={18} color={color.muted} style={{ flex: 'none' }} />
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

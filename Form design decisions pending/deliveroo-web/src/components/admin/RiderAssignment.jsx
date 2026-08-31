import { useDispatch, useSelector } from 'react-redux';
import { dispatchAgent } from '../../store/ordersSlice';
import { selectFleet } from '../../store/fleetSlice';
import { showToast } from '../../store/uiSlice';
import useNow from '../../hooks/useNow';
import { STATUS, agentHasArrived, currentLocationLabel } from '../../lib/orderStatus';
import { FLEET_STATUS, TRANSPORT, agentNounTitle, modeMeta, transportOf } from '../../lib/transport';
import { color, control, eyebrow, font, radius } from '../../theme';
import TransportGlyph from '../transport/TransportGlyph';

/**
 * §26 — who is carrying this parcel, from dispatch's side of the glass.
 *
 * The console already assigns agents (status → Assigned, and the on-demand
 * assignAgent the customer's request triggers); this is the record of that
 * assignment rather than a second way to make one. The only action it offers is the
 * one dispatch is otherwise missing: matching an agent to an order that is still
 * sitting unassigned, through the same idempotent call the customer's request uses.
 *
 * Rider status is derived, not stored: it is a function of where the order has got
 * to and whether that mode's capacity is online at all. A separate rider table would
 * be a second source of truth for a fact the order already knows.
 */
const RIDER_STATUS = {
  UNASSIGNED: { label: 'Unassigned', tone: color.muted },
  AVAILABLE: { label: 'Available', tone: color.orange },
  ASSIGNED: { label: 'Assigned', tone: color.orange },
  PICKING_UP: { label: 'Picking up', tone: color.orangeDeep },
  DELIVERING: { label: 'Delivering', tone: color.orangeDeep },
  OFFLINE: { label: 'Offline', tone: color.muted }
};

function riderStatus(order, fleetStatus, arrived) {
  if (!order.courier) {
    return fleetStatus === FLEET_STATUS.OFFLINE ? RIDER_STATUS.OFFLINE : RIDER_STATUS.UNASSIGNED;
  }
  switch (order.status) {
    case STATUS.PENDING:
      return RIDER_STATUS.ASSIGNED;
    case STATUS.ASSIGNED:
      return arrived ? { ...RIDER_STATUS.PICKING_UP, label: 'At pickup' } : RIDER_STATUS.PICKING_UP;
    case STATUS.PICKED_UP:
    case STATUS.IN_TRANSIT:
      return RIDER_STATUS.DELIVERING;
    default:
      return fleetStatus === FLEET_STATUS.OFFLINE ? RIDER_STATUS.OFFLINE : RIDER_STATUS.AVAILABLE;
  }
}

export default function RiderAssignment({ order }) {
  const dispatch = useDispatch();
  const fleet = useSelector(selectFleet);
  const now = useNow(30_000);

  const mode = transportOf(order);
  const meta = modeMeta(mode);
  const noun = agentNounTitle(mode);
  const courier = order.courier;
  const arrived = agentHasArrived(order, now);
  const state = riderStatus(order, fleet[mode] || FLEET_STATUS.AVAILABLE, arrived);
  const assignable = !courier && order.status === STATUS.PENDING;

  const assign = async () => {
    const result = await dispatch(dispatchAgent(order.id));
    if (dispatchAgent.fulfilled.match(result)) {
      const assigned = result.payload?.courier;
      dispatch(
        showToast({
          message: assigned ? `${assigned.name} assigned to ${order.id}` : `No ${noun.toLowerCase()} available yet.`,
          tone: assigned ? 'success' : 'info'
        })
      );
    }
  };

  const rows = [
    [noun, courier?.name || '—'],
    ['Vehicle', courier ? modeMeta(courier.vehicleMode || mode).label : meta.label],
    ['Registration', courier?.plate || '—'],
    ['Current location', currentLocationLabel(order)],
    [
      'Distance out',
      courier && order.status === STATUS.ASSIGNED && !arrived && Number.isFinite(courier.distanceKm)
        ? `${courier.distanceKm} km · ${courier.etaMinutes} min`
        : '—'
    ]
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <span style={eyebrow}>{noun} assignment</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            marginLeft: 'auto',
            fontFamily: font.mono,
            fontSize: '10.5px',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: state.tone
          }}
        >
          <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '99px', background: state.tone }} />
          {state.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '13px',
            background: 'rgba(248,135,53,.14)',
            flex: 'none'
          }}
        >
          <TransportGlyph mode={courier?.vehicleMode || mode} size={21} color={color.orangeDeep} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, letterSpacing: '-.02em', color: color.ink }}>
            {courier ? `${courier.name} · ${courier.vehicle}` : `No ${noun.toLowerCase()} on this delivery yet`}
          </span>
          <span style={{ display: 'block', marginTop: '3px', fontSize: '12.5px', color: color.muted }}>
            {mode === TRANSPORT.MOTORBIKE
              ? 'The rider carries this parcel the whole way, so collection and delivery are the same leg.'
              : `${meta.freightLabel}. The agent collects the parcel and hands it to the carrier.`}
          </span>
        </span>
      </div>

      <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ paddingTop: '12px', borderTop: `1px solid ${color.border}` }}>
            <div style={{ ...eyebrow, fontSize: '9.5px', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: color.ink }}>{value}</div>
          </div>
        ))}
      </div>

      {assignable && (
        <button
          type="button"
          onClick={assign}
          style={{ ...control.chip, minHeight: '44px', marginTop: '16px', borderRadius: radius.pill }}
        >
          Find a {noun.toLowerCase()} now
        </button>
      )}
    </div>
  );
}

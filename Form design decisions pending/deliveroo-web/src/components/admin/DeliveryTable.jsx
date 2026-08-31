import { useSelector } from 'react-redux';
import useNow from '../../hooks/useNow';
import { currentLocationLabel, isTerminal, remainingSeconds } from '../../lib/orderStatus';
import { etaClock, formatKes, isWeightVerified } from '../../lib/pricing';
import { modeMeta, transportOf } from '../../lib/transport';
import { color, ease, font, radius, shadow } from '../../theme';
import TransportGlyph from '../transport/TransportGlyph';
import StatusPill from '../orders/StatusPill';

const HEADINGS = [
  'Parcel',
  'Customer',
  'Pickup',
  'Destination',
  'Transport',
  'Current location',
  'Status',
  'ETA',
  'Price',
  'Actions'
];

const cell = {
  padding: '12px 10px',
  fontSize: '13.5px',
  color: color.ink,
  verticalAlign: 'middle',
  borderTop: `1px solid ${color.border}`
};

const quiet = { ...cell, color: color.body };

const eta = (order, now) =>
  isTerminal(order.status) ? '—' : etaClock(remainingSeconds(order, now), now);

const priceCell = (order) => (
  <>
    {formatKes(order.pricing.total)}
    {!isWeightVerified(order.parcel) && (
      <span
        style={{
          display: 'block',
          marginTop: '2px',
          fontFamily: font.mono,
          fontSize: '10px',
          letterSpacing: '.08em',
          color: color.muted
        }}
      >
        EST.
      </span>
    )}
  </>
);

/**
 * §26 — the dispatch list. A real table on a desktop, because nine columns compared
 * across dozens of rows is exactly what a table is for; the same rows as cards on a
 * phone, because that table is unusable at 380px.
 */
export default function DeliveryTable({ orders, selectedId, onSelect }) {
  const narrow = useSelector((state) => state.ui.narrow);
  const now = useNow(30_000);

  if (narrow) {
    return (
      <div style={{ display: 'grid', gap: '10px' }}>
        {orders.map((order) => {
          const mode = transportOf(order);
          const active = order.id === selectedId;
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => onSelect(order.id)}
              aria-pressed={active}
              style={{
                display: 'grid',
                gap: '10px',
                width: '100%',
                textAlign: 'left',
                padding: '14px',
                borderRadius: radius.card,
                border: `1px solid ${active ? color.ink : 'rgba(28,32,31,.1)'}`,
                background: color.card,
                boxShadow: shadow.card,
                cursor: 'pointer',
                fontFamily: font.body
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: font.mono, fontSize: '12px', letterSpacing: '.06em', color: color.muted }}>
                  {order.id}
                </span>
                <StatusPill status={order.status} size="sm" />
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: color.ink }}>
                  <TransportGlyph mode={mode} size={16} color={color.orangeDeep} />
                  {modeMeta(mode).label}
                </span>
              </span>
              <span style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-.02em', color: color.ink }}>
                {order.pickup.name} → {order.destination.name}
              </span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: '12.5px', color: color.body }}>
                <span>{currentLocationLabel(order)}</span>
                <span>ETA {eta(order, now)}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: color.ink }}>{priceCell(order)}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: radius.card, border: `1px solid ${color.border}`, background: color.card, boxShadow: shadow.card }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
        <thead>
          <tr>
            {HEADINGS.map((heading) => (
              <th
                key={heading}
                scope="col"
                style={{
                  padding: '14px 10px',
                  textAlign: 'left',
                  fontFamily: font.mono,
                  fontSize: '9.5px',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: color.muted,
                  whiteSpace: 'nowrap'
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const mode = transportOf(order);
            const active = order.id === selectedId;
            return (
              <tr
                key={order.id}
                onClick={() => onSelect(order.id)}
                style={{
                  background: active ? 'rgba(248,135,53,.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: `background .18s ${ease.out}`
                }}
              >
                <td style={cell}>
                  {/* A button, not just a clickable row: the console has to be operable
                      from the keyboard, and this is what takes the focus. */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(order.id);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      fontFamily: font.mono,
                      fontSize: '12.5px',
                      letterSpacing: '.06em',
                      fontWeight: active ? 700 : 500,
                      color: active ? color.ink : color.body,
                      cursor: 'pointer'
                    }}
                  >
                    {order.id}
                  </button>
                </td>
                <td style={quiet}>{order.sender?.name || '—'}</td>
                <td style={quiet}>{order.pickup.name}</td>
                <td style={quiet}>{order.destination.name}</td>
                <td style={cell}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}>
                    <TransportGlyph mode={mode} size={17} color={color.orangeDeep} />
                    {modeMeta(mode).label}
                  </span>
                </td>
                <td style={quiet}>{currentLocationLabel(order)}</td>
                <td style={cell}>
                  <StatusPill status={order.status} size="sm" />
                </td>
                <td style={{ ...quiet, whiteSpace: 'nowrap' }}>{eta(order, now)}</td>
                <td style={{ ...cell, fontWeight: 600, whiteSpace: 'nowrap' }}>{priceCell(order)}</td>
                <td style={cell}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '32px',
                      padding: '0 12px',
                      borderRadius: radius.pill,
                      border: `1px solid ${active ? color.ink : 'rgba(28,32,31,.16)'}`,
                      background: active ? color.green : 'transparent',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      color: active ? color.paper : color.ink
                    }}
                  >
                    {active ? 'Managing' : 'Manage'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length > 0 && (
        <p style={{ margin: 0, padding: '10px 12px', fontSize: '12px', color: color.muted, borderTop: `1px solid ${color.border}` }}>
          {orders.length} {orders.length === 1 ? 'delivery' : 'deliveries'} · select one to manage it.
        </p>
      )}
    </div>
  );
}

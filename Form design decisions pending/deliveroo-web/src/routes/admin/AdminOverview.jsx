import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectAllOrders, selectOrder } from '../../store/ordersSlice';
import { selectAuditLog, selectCouriers, selectOnShiftCount } from '../../store/adminSlice';
import { selectFleet } from '../../store/fleetSlice';
import useNow from '../../hooks/useNow';
import {
  ISSUE,
  ISSUE_LABEL,
  ISSUE_NOTE,
  byMode,
  byStatus,
  needsAttention,
  summarize,
  volumeByDay
} from '../../lib/analytics';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { formatKes } from '../../lib/pricing';
import { FLEET_STATUS, FLEET_STATUS_LABEL, modeMeta } from '../../lib/transport';
import { color, ease, font, statusTone } from '../../theme';
import Panel from '../../components/admin/Panel';
import ColumnChart from '../../components/admin/ColumnChart';
import BarList from '../../components/admin/BarList';
import TransportGlyph from '../../components/transport/TransportGlyph';
import StatTile from '../../components/ui/StatTile';
import Icon from '../../components/Icon';

const dayLabel = (date) => date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

const stamp = (iso) =>
  new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * §27 — the landing screen. Deliberately not a wall of totals: the four figures a
 * shift lead actually acts on, then the exceptions, then the shape of the week.
 * Everything here is derived by lib/analytics.js, which is pure and portable — a
 * real backend would compute the same numbers as aggregates.
 */
export default function AdminOverview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orders = useSelector(selectAllOrders);
  const couriers = useSelector(selectCouriers);
  const onShift = useSelector(selectOnShiftCount);
  const audit = useSelector(selectAuditLog);
  const fleet = useSelector(selectFleet);
  // Exceptions move with the clock — an order goes overdue without anyone touching it.
  const now = useNow(60_000);

  const stats = useMemo(() => summarize(orders), [orders]);
  const issues = useMemo(() => needsAttention(orders, now), [orders, now]);
  const days = useMemo(() => volumeByDay(orders, 14, now), [orders, now]);
  const modes = useMemo(() => byMode(orders), [orders]);
  const statuses = useMemo(() => byStatus(orders), [orders]);

  const offline = Object.entries(fleet).filter(([, status]) => status === FLEET_STATUS.OFFLINE);

  const open = (id) => {
    dispatch(selectOrder(id));
    navigate('/admin/deliveries');
  };

  const tiles = [
    { label: 'Live now', value: stats.active, icon: 'conversion_path', hint: `${stats.total} in the system` },
    { label: 'Revenue', value: formatKes(stats.revenue), icon: 'payments', hint: `${formatKes(stats.averageFare)} average` },
    {
      label: 'On time',
      value: stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`,
      icon: 'schedule',
      hint: stats.averageMinutes ? `${stats.averageMinutes} min door to door` : 'No completed runs yet'
    },
    {
      label: 'Couriers on shift',
      value: `${onShift}/${couriers.length}`,
      icon: 'two_wheeler',
      hint: `${stats.tonnage} kg on the network`
    }
  ];

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <Panel
        title={`Needs attention · ${issues.length}`}
        note="Deliveries that have stopped behaving. One parcel can appear twice — being late and never having been weighed are two different jobs for two different people."
      >
        {issues.length === 0 ? (
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '9px', fontSize: '14px', color: color.body }}>
            <Icon name="task_alt" size={19} color={color.orange} />
            Nothing is overdue, unassigned or stalled. The board is clean.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
            {issues.slice(0, 8).map(({ order, issue, minutes }) => (
              <li key={`${order.id}-${issue}`}>
                <button
                  type="button"
                  onClick={() => open(order.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    minHeight: '52px',
                    padding: '10px 14px',
                    textAlign: 'left',
                    borderRadius: '14px',
                    border: '1px solid rgba(17,17,17,.1)',
                    background: color.white,
                    fontFamily: font.body,
                    cursor: 'pointer',
                    transition: `border-color .18s ${ease.out}`
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '99px',
                      background: color.orangeDeep,
                      flex: 'none'
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: color.ink }}>
                      {ISSUE_LABEL[issue]} · {order.pickup.name} → {order.destination.name}
                    </span>
                    <span style={{ display: 'block', marginTop: '2px', fontSize: '12.5px', color: color.muted }}>
                      {ISSUE_NOTE[issue]}
                      {minutes ? ` · ${minutes} min${issue === ISSUE.OVERDUE ? ' late' : ' ago'}` : ''}
                    </span>
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: font.mono,
                      fontSize: '11.5px',
                      letterSpacing: '.05em',
                      color: color.body,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {order.id}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Bookings · last 14 days"
        note={`${days.reduce((sum, day) => sum + day.count, 0)} requested in the period. Hover a column for its day.`}
      >
        <ColumnChart
          data={days.map((day) => ({ key: day.key, label: dayLabel(day.date), value: day.count }))}
          label="Bookings"
        />
      </Panel>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,2vw,22px)' }}>
        <Panel title="How it travels" note="Every booking by transport mode." style={{ flex: '1 1 300px' }}>
          <BarList
            rows={modes.map((row) => ({
              key: row.mode,
              label: modeMeta(row.mode).label,
              value: row.count,
              hint: `${row.share}%`,
              glyph: <TransportGlyph mode={row.mode} size={16} color={color.orangeDeep} />
            }))}
          />
        </Panel>

        <Panel title="Where it has got to" note="The board by status." style={{ flex: '1 1 300px' }}>
          <BarList
            rows={statuses.map((row) => ({
              key: row.status,
              label: STATUS_LABEL[row.status],
              value: row.count,
              tone: statusTone[row.status]
            }))}
          />
        </Panel>
      </div>

      {offline.length > 0 && (
        <Panel title="Withdrawn from quotes">
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: color.body }}>
            {offline.map(([mode]) => modeMeta(mode).label).join(', ')}{' '}
            {offline.length === 1 ? 'is' : 'are'} {FLEET_STATUS_LABEL[FLEET_STATUS.OFFLINE].toLowerCase()}, so
            customers are not being offered {offline.length === 1 ? 'it' : 'them'} at all.
          </p>
        </Panel>
      )}

      <Panel title="Recent staff activity" note="The last few things anyone with a portal account did.">
        {audit.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13.5px', color: color.muted }}>Nothing recorded yet this session.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '9px' }}>
            {audit.slice(0, 6).map((entry) => (
              <li
                key={entry.id}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', fontSize: '13.5px' }}
              >
                <span style={{ fontWeight: 700, color: color.ink }}>{entry.actor}</span>
                <span style={{ color: color.body }}>
                  {entry.action.toLowerCase().replace(/_/g, ' ')}
                  {entry.target ? ` · ${entry.target}` : ''}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: font.mono,
                    fontSize: '11px',
                    letterSpacing: '.04em',
                    color: color.muted,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {stamp(entry.at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

    </div>
  );
}

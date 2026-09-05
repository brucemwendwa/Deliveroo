import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectAllOrders } from '../../store/ordersSlice';
import { showToast } from '../../store/uiSlice';
import useNow from '../../hooks/useNow';
import { byMode, courierPerformance, ordersCsv, summarize, topRoutes, volumeByDay } from '../../lib/analytics';
import { formatKes } from '../../lib/pricing';
import { modeMeta } from '../../lib/transport';
import { color, font } from '../../theme';
import Panel from '../../components/admin/Panel';
import ColumnChart from '../../components/admin/ColumnChart';
import BarList from '../../components/admin/BarList';
import TransportGlyph from '../../components/transport/TransportGlyph';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import StatTile from '../../components/ui/StatTile';

const RANGES = [
  { id: 7, label: '7 days' },
  { id: 14, label: '14 days' },
  { id: 30, label: '30 days' },
  { id: 0, label: 'Everything' }
];

const MEASURES = [
  { id: 'count', label: 'Bookings', format: (value) => value },
  { id: 'revenue', label: 'Revenue', format: (value) => formatKes(value) }
];

const dayLabel = (date) => date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

/** Hands the file to the browser. Nothing leaves the machine — this is the board. */
function download(filename, text, onError) {
  try {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    onError?.();
    return false;
  }
}

/**
 * §27 — reports.
 *
 * One measure at a time on one axis, and a range that applies to every panel on the
 * screen at once: two scales on one chart, or four panels each quietly covering a
 * different period, is how an operations screen starts telling lies.
 */
export default function AdminReports() {
  const dispatch = useDispatch();
  const orders = useSelector(selectAllOrders);
  const now = useNow(60_000);
  const [range, setRange] = useState(30);
  const [measure, setMeasure] = useState('count');

  const scoped = useMemo(() => {
    if (!range) return orders;
    const floor = now - range * 24 * 3600_000;
    return orders.filter((order) => Date.parse(order.createdAt) >= floor);
  }, [orders, range, now]);

  const stats = useMemo(() => summarize(scoped), [scoped]);
  const days = useMemo(() => volumeByDay(scoped, range || 30, now), [scoped, range, now]);
  const modes = useMemo(() => byMode(scoped), [scoped]);
  const routes = useMemo(() => topRoutes(scoped), [scoped]);
  const couriers = useMemo(() => courierPerformance(scoped), [scoped]);

  const active = MEASURES.find((option) => option.id === measure);

  const exportCsv = () => {
    const stamp = new Date(now).toISOString().slice(0, 10);
    const ok = download(`deliveroo-deliveries-${stamp}.csv`, ordersCsv(scoped), () =>
      dispatch(showToast({ message: 'This browser would not accept the download.', tone: 'error' }))
    );
    if (ok) dispatch(showToast({ message: `${scoped.length} deliveries exported.`, tone: 'success' }));
  };

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        {RANGES.map((option) => (
          <Chip
            key={option.id}
            active={range === option.id}
            onClick={() => setRange(option.id)}
            style={{ minHeight: '40px', fontSize: '13px' }}
          >
            {option.label}
          </Chip>
        ))}
        <Button variant="ghost" size="sm" icon="download" iconPosition="left" onClick={exportCsv} style={{ marginLeft: 'auto' }}>
          Export CSV
        </Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <StatTile label="Deliveries" value={stats.total} icon="inventory_2" hint={`${stats.active} still live`} />
        <StatTile label="Revenue" value={formatKes(stats.revenue)} icon="payments" hint={`${formatKes(stats.averageFare)} average`} />
        <StatTile
          label="Completed"
          value={`${stats.completionRate}%`}
          icon="task_alt"
          hint={`${stats.cancellationRate}% cancelled`}
        />
        <StatTile
          label="On time"
          value={stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`}
          icon="schedule"
          hint={stats.averageMinutes ? `${stats.averageMinutes} min average` : 'Nothing completed yet'}
        />
      </div>

      <Panel
        title={`${active.label} by day`}
        note="One measure at a time. Switch it rather than reading two scales off one chart."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {MEASURES.map((option) => (
              <Chip
                key={option.id}
                active={measure === option.id}
                onClick={() => setMeasure(option.id)}
                style={{ minHeight: '36px', fontSize: '12.5px' }}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        }
      >
        <ColumnChart
          data={days.map((day) => ({ key: day.key, label: dayLabel(day.date), value: day[measure] }))}
          format={active.format}
          label={active.label}
        />
      </Panel>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,2vw,22px)' }}>
        <Panel title="Revenue by mode" style={{ flex: '1 1 320px' }}>
          <BarList
            rows={modes.map((row) => ({
              key: row.mode,
              label: modeMeta(row.mode).label,
              value: row.revenue,
              hint: `${row.count} booked`,
              glyph: <TransportGlyph mode={row.mode} size={16} color={color.orangeDeep} />
            }))}
            format={formatKes}
          />
        </Panel>

        <Panel title="Busiest routes" style={{ flex: '1 1 320px' }}>
          <BarList
            rows={routes.map((row) => ({ key: row.label, label: row.label, value: row.count, hint: formatKes(row.revenue) }))}
            empty="No deliveries in this period."
          />
        </Panel>
      </div>

      <Panel title="Courier performance" note="Everyone who carried something in this period.">
        {couriers.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13.5px', color: color.muted }}>Nobody was assigned a parcel in this period.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead>
                <tr>
                  {['Courier', 'Vehicle', 'Jobs', 'Delivered', 'Average', 'Value'].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      style={{
                        padding: '0 10px 12px',
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
                {couriers.map((row) => (
                  <tr key={row.key}>
                    {[
                      row.name,
                      row.vehicle,
                      row.jobs,
                      row.delivered,
                      row.averageMinutes ? `${row.averageMinutes} min` : '—',
                      formatKes(row.revenue)
                    ].map((value, index) => (
                      <td
                        key={index}
                        style={{
                          padding: '12px 10px',
                          fontSize: '13.5px',
                          color: index === 0 ? color.ink : color.body,
                          fontWeight: index === 0 ? 700 : 400,
                          borderTop: `1px solid ${color.border}`,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p style={{ margin: 0, maxWidth: '62ch', fontSize: '12.5px', lineHeight: 1.6, color: color.muted }}>
        Revenue counts every delivery that was not cancelled, at the fare currently on the order: the
        measured one where the parcel has been weighed, the estimate where it has not. On time compares
        the delivery against the duration it was quoted, counted from collection.
      </p>
    </div>
  );
}

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCouriers, selectOnShiftCount } from '../../store/adminSlice';
import { selectAllOrders } from '../../store/ordersSlice';
import { courierPerformance } from '../../lib/analytics';
import { formatKes } from '../../lib/pricing';
import { color } from '../../theme';
import Panel from '../../components/admin/Panel';
import CourierTable from '../../components/admin/CourierTable';
import BarList from '../../components/admin/BarList';
import EmptyState from '../../components/ui/EmptyState';
import StatTile from '../../components/ui/StatTile';

/** §27 — who is available to carry a parcel today, and what they have carried. */
export default function AdminCouriers() {
  const couriers = useSelector(selectCouriers);
  const onShift = useSelector(selectOnShiftCount);
  const orders = useSelector(selectAllOrders);

  const performance = useMemo(() => {
    const rows = courierPerformance(orders);
    return Object.fromEntries(rows.map((row) => [row.key, row]));
  }, [orders]);

  const live = couriers.reduce((sum, courier) => sum + courier.activeJobs, 0);
  const delivered = couriers.reduce((sum, courier) => sum + courier.completedJobs, 0);
  const earned = Object.values(performance).reduce((sum, row) => sum + row.revenue, 0);

  const tiles = [
    { label: 'On shift', value: `${onShift}/${couriers.length}`, icon: 'how_to_reg' },
    { label: 'Carrying now', value: live, icon: 'conversion_path' },
    { label: 'Delivered', value: delivered, icon: 'task_alt' },
    { label: 'Booked value', value: formatKes(earned), icon: 'payments' }
  ];

  const leaderboard = Object.values(performance)
    .filter((row) => row.jobs > 0)
    .slice(0, 6)
    .map((row) => ({
      key: row.key,
      label: row.name,
      value: row.jobs,
      hint: row.averageMinutes ? `${row.averageMinutes} min avg` : `${row.active} live`
    }));

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <Panel
        title="Roster"
        note="Taking a courier off shift stops dispatch handing them anything new. It does not take a parcel off someone who is already carrying one."
      >
        {couriers.length === 0 ? (
          <EmptyState icon="two_wheeler" title="No couriers on the roster" body="Nobody is registered to carry parcels yet." />
        ) : (
          <CourierTable couriers={couriers} performance={performance} />
        )}
      </Panel>

      <Panel title="Busiest couriers" note="Jobs carried, all statuses, busiest first.">
        <BarList rows={leaderboard} empty="Nobody has been assigned a parcel yet." />
      </Panel>

      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: color.muted, maxWidth: '62ch' }}>
        Couriers are matched to a parcel by dispatch or by the customer&apos;s own request. A motorbike
        delivery can only be matched to a rider, because that parcel is carried the whole way by the
        person who collects it.
      </p>
    </div>
  );
}

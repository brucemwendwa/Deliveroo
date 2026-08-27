import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectAllOrders } from '../../store/ordersSlice';
import { byMode } from '../../lib/analytics';
import { formatKes } from '../../lib/pricing';
import { PRIORITY_OPTIONS, TRANSPORT_MODES } from '../../lib/transport';
import { color, font } from '../../theme';
import FleetPanel from '../../components/admin/FleetPanel';
import Panel from '../../components/admin/Panel';
import BarList from '../../components/admin/BarList';
import TransportGlyph from '../../components/transport/TransportGlyph';

const limitText = (limits = {}) =>
  [
    limits.minDistanceKm ? `from ${limits.minDistanceKm} km` : null,
    limits.maxDistanceKm ? `to ${limits.maxDistanceKm} km` : null,
    limits.maxWeightKg ? `≤ ${limits.maxWeightKg} kg` : null,
    limits.maxLongestSideCm ? `≤ ${limits.maxLongestSideCm} cm side` : null,
    limits.requiresPort ? 'port at one end' : null
  ]
    .filter(Boolean)
    .join(' · ') || 'No restrictions';

const tariffText = (tariff = {}) =>
  [
    tariff.base ? `${formatKes(tariff.base)} base` : null,
    `${tariff.perKm}/km`,
    `${tariff.perKg}/kg`,
    `${formatKes(tariff.minimum)} minimum`,
    tariff.lineHaulPerKm ? `${tariff.lineHaulPerKm}/km past ${tariff.cityKm} km` : null
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * §26/§27 — the capacity screen. The availability switches are the operational half;
 * the tariff table under them is the reference half, printed straight from
 * lib/transport.js so what the console says a mode costs cannot drift from what a
 * customer is actually charged.
 */
export default function AdminCapacity() {
  const orders = useSelector(selectAllOrders);
  const modes = useMemo(() => byMode(orders), [orders]);

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      <FleetPanel />

      <Panel title="Load by mode" note="Live deliveries riding on each kind of capacity right now.">
        <BarList
          rows={modes.map((row) => ({
            key: row.mode,
            label: TRANSPORT_MODES.find((meta) => meta.id === row.mode).label,
            value: row.active,
            hint: `${row.count} total · ${formatKes(row.revenue)}`,
            glyph: <TransportGlyph mode={row.mode} size={16} color={color.orangeDeep} />
          }))}
        />
      </Panel>

      <Panel
        title="Tariffs and eligibility"
        note="Read-only. These rates and limits live in one module that prices every quote, so this table is the tariff rather than a description of it."
      >
        <div style={{ display: 'grid', gap: '10px' }}>
          {TRANSPORT_MODES.map((meta) => (
            <div
              key={meta.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                padding: '12px 0 0',
                borderTop: '1px solid rgba(17,17,17,.1)'
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '11px',
                  background: 'rgba(245,145,30,.14)',
                  flex: 'none'
                }}
              >
                <TransportGlyph mode={meta.id} size={18} color={color.orangeDeep} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '14.5px', fontWeight: 700, color: color.ink }}>
                  {meta.label}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: '3px',
                    fontFamily: font.mono,
                    fontSize: '11.5px',
                    lineHeight: 1.6,
                    color: color.body
                  }}
                >
                  {tariffText(meta.tariff)}
                </span>
                <span style={{ display: 'block', marginTop: '2px', fontSize: '12.5px', color: color.muted }}>
                  {limitText(meta.limits)}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p style={{ margin: '16px 0 0', fontSize: '12.5px', lineHeight: 1.6, color: color.muted }}>
          Priority is a multiplier on whichever mode was chosen, not a tariff of its own:{' '}
          {PRIORITY_OPTIONS.map((option) => `${option.label} ×${option.priceFactor}`).join(', ')}.
        </p>
      </Panel>
    </div>
  );
}

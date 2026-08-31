import { useDispatch, useSelector } from 'react-redux';
import { selectFleet, setFleetStatus } from '../../store/fleetSlice';
import { selectModeLoad } from '../../store/ordersSlice';
import { showToast } from '../../store/uiSlice';
import { FLEET_STATUS, FLEET_STATUS_LABEL, TRANSPORT_MODES } from '../../lib/transport';
import { color, eyebrow, font, radius, shadow } from '../../theme';
import TransportGlyph from '../transport/TransportGlyph';

const TONE = {
  [FLEET_STATUS.AVAILABLE]: color.orange,
  [FLEET_STATUS.BUSY]: color.orangeDeep,
  [FLEET_STATUS.OFFLINE]: color.muted
};

/**
 * §26 — how much of a mode's capacity is doing what right now.
 *
 * `assigned` is real: it counts the live orders on that mode. `units` and the
 * baseline `offline` are prototype figures from the catalogue, standing in for what
 * a carrier partner's API would report — Deliveroo books into this capacity, it does
 * not own it. Taking a mode offline puts every unit that isn't already out on a job
 * into the offline column, which is exactly what withdrawing it from quotes means.
 */
function capacityOf(meta, status, assigned) {
  const units = meta.capacity?.units ?? 0;
  const baseline = meta.capacity?.offline ?? 0;
  const working = Math.min(assigned, units);
  const offline = status === FLEET_STATUS.OFFLINE ? Math.max(0, units - working) : baseline;
  return { assigned: working, offline, available: Math.max(0, units - working - offline) };
}

const FIGURES = [
  { key: 'available', label: 'Available' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'offline', label: 'Offline' }
];

/**
 * §26 — transport availability.
 *
 * Prototype controls over *partner capacity dispatch can book into today* — not a
 * fleet Deliveroo owns. Taking a mode offline here removes it from the customer's
 * options immediately, which is the point: this is the one screen that can stop the
 * booking flow offering something that cannot actually be flown.
 */
export default function FleetPanel() {
  const dispatch = useDispatch();
  const fleet = useSelector(selectFleet);
  const load = useSelector(selectModeLoad);

  const change = async (mode, status) => {
    const result = await dispatch(setFleetStatus({ mode, status }));
    if (setFleetStatus.fulfilled.match(result)) {
      dispatch(showToast({ message: `${mode} capacity → ${FLEET_STATUS_LABEL[status]}`, tone: 'info' }));
    }
  };

  return (
    <div
      style={{
        borderRadius: radius.card,
        border: `1px solid ${color.border}`,
        background: color.card,
        boxShadow: shadow.card,
        padding: 'clamp(18px,2.2vw,26px)'
      }}
    >
      <div style={{ ...eyebrow, marginBottom: '6px' }}>Transport availability</div>
      <p style={{ margin: '0 0 18px', fontSize: '13px', lineHeight: 1.55, color: color.muted, maxWidth: '58ch' }}>
        Capacity Deliveroo can book into right now, across its carrier partners: riders,
        drivers, freight and airline space. Taking a mode offline withdraws it from customer
        quotes immediately.
      </p>

      <div style={{ display: 'grid', gap: '10px' }}>
        {TRANSPORT_MODES.map((meta) => {
          const status = fleet[meta.id] || FLEET_STATUS.AVAILABLE;
          const active = load[meta.id] || 0;
          const counts = capacityOf(meta, status, active);

          return (
            <div
              key={meta.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '16px',
                border: `1px solid ${color.border}`,
                background: status === FLEET_STATUS.OFFLINE ? 'rgba(28,32,31,.035)' : color.card
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(248,135,53,.14)',
                  flex: 'none'
                }}
              >
                <TransportGlyph mode={meta.id} size={20} color={color.orangeDeep} />
              </span>

              <span style={{ flex: '1 1 130px', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, letterSpacing: '-.02em', color: color.ink }}>
                  {meta.label} fleet
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '3px', fontFamily: font.mono, fontSize: '10.5px', letterSpacing: '.1em', textTransform: 'uppercase', color: TONE[status] }}>
                  <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '99px', background: TONE[status] }} />
                  {FLEET_STATUS_LABEL[status]}
                  <span style={{ color: color.muted }}>· {active} active</span>
                </span>
              </span>

              <span
                aria-label={`${meta.label} capacity`}
                style={{ display: 'flex', flex: '1 1 190px', gap: '16px', minWidth: 0 }}
              >
                {FIGURES.map((figure) => (
                  <span key={figure.key} style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: font.display,
                        fontWeight: 600,
                        fontSize: '19px',
                        lineHeight: 1,
                        letterSpacing: '-.02em',
                        color: counts[figure.key] ? color.ink : color.muted
                      }}
                    >
                      {counts[figure.key]}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: '4px',
                        fontFamily: font.mono,
                        fontSize: '9.5px',
                        letterSpacing: '.12em',
                        textTransform: 'uppercase',
                        color: color.muted
                      }}
                    >
                      {figure.label}
                    </span>
                  </span>
                ))}
              </span>

              <span
                role="radiogroup"
                aria-label={`${meta.label} availability`}
                style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: radius.pill, background: 'rgba(28,32,31,.05)' }}
              >
                {Object.values(FLEET_STATUS).map((option) => {
                  const on = option === status;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => change(meta.id, option)}
                      style={{
                        height: '36px',
                        padding: '0 13px',
                        borderRadius: radius.pill,
                        border: 'none',
                        background: on ? color.green : 'transparent',
                        fontFamily: font.body,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: on ? color.paper : color.muted,
                        cursor: 'pointer',
                        transition: 'background .18s, color .18s'
                      }}
                    >
                      {FLEET_STATUS_LABEL[option]}
                    </button>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

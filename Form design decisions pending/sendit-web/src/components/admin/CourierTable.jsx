import { useDispatch, useSelector } from 'react-redux';
import { setCourierShift } from '../../store/adminSlice';
import { selectUser } from '../../store/authSlice';
import { showToast } from '../../store/uiSlice';
import { PERMISSION, can } from '../../lib/roles';
import { formatKes } from '../../lib/pricing';
import { modeMeta } from '../../lib/transport';
import { color, ease, font, radius, shadow } from '../../theme';
import TransportGlyph from '../transport/TransportGlyph';
import Icon from '../Icon';

const HEADINGS = ['Courier', 'Vehicle', 'Carries', 'Rating', 'Live', 'Delivered', 'Earned', 'Shift'];

const cell = {
  padding: '12px 10px',
  fontSize: '13.5px',
  color: color.ink,
  verticalAlign: 'middle',
  borderTop: `1px solid ${color.border}`
};

const quiet = { ...cell, color: color.body };

/**
 * §27 — the roster.
 *
 * Prototype, and worded like one: these are people Deliveroo dispatches, not
 * employees it rosters shifts for. Taking someone off shift means dispatch stops
 * handing them new parcels — it deliberately does not abandon the one they are
 * already carrying, which is why a courier can be off shift with a live job.
 */
function ShiftToggle({ courier, disabled }) {
  const dispatch = useDispatch();

  const toggle = async () => {
    const next = !courier.onShift;
    const result = await dispatch(setCourierShift({ id: courier.id, onShift: next }));
    if (setCourierShift.fulfilled.match(result)) {
      dispatch(showToast({ message: `${courier.name} is ${next ? 'on' : 'off'} shift.`, tone: 'info' }));
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={courier.onShift}
      aria-label={`${courier.name} on shift`}
      disabled={disabled}
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        height: '38px',
        padding: '0 14px',
        borderRadius: radius.pill,
        border: `1px solid ${courier.onShift ? color.ink : 'rgba(28,32,31,.16)'}`,
        background: courier.onShift ? color.green : 'transparent',
        color: courier.onShift ? color.paper : color.muted,
        fontFamily: font.body,
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        transition: `background .18s ${ease.out}, color .18s, border-color .18s`
      }}
    >
      <Icon name={courier.onShift ? 'toggle_on' : 'toggle_off'} size={18} />
      {courier.onShift ? 'On shift' : 'Off shift'}
    </button>
  );
}

export default function CourierTable({ couriers = [], performance = {} }) {
  const narrow = useSelector((state) => state.ui.narrow);
  const user = useSelector(selectUser);
  const readOnly = !can(user, PERMISSION.MANAGE_COURIERS);

  const figures = (courier) => performance[courier.plate] || { revenue: 0, averageMinutes: 0 };

  if (narrow) {
    return (
      <div style={{ display: 'grid', gap: '10px' }}>
        {couriers.map((courier) => (
          <div
            key={courier.id}
            style={{
              display: 'grid',
              gap: '10px',
              padding: '14px',
              borderRadius: radius.card,
              border: `1px solid ${color.border}`,
              background: color.card,
              boxShadow: shadow.card
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
              <TransportGlyph mode={courier.vehicleMode} size={17} color={color.orangeDeep} />
              <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.02em', color: color.ink }}>
                {courier.name}
              </span>
              <span style={{ fontFamily: font.mono, fontSize: '11.5px', letterSpacing: '.05em', color: color.muted }}>
                {courier.plate}
              </span>
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: '12.5px', color: color.body }}>
              <span>{courier.vehicle}</span>
              <span>★ {courier.rating}</span>
              <span>{courier.activeJobs} live</span>
              <span>{courier.completedJobs} delivered</span>
              <span>{formatKes(figures(courier).revenue)}</span>
            </span>
            <ShiftToggle courier={courier} disabled={readOnly} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
        <thead>
          <tr>
            {HEADINGS.map((heading) => (
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
          {couriers.map((courier) => (
            <tr key={courier.id} style={{ background: courier.onShift ? 'transparent' : 'rgba(28,32,31,.025)' }}>
              <td style={{ ...cell, fontWeight: 600 }}>{courier.name}</td>
              <td style={quiet}>
                {courier.vehicle}
                <span style={{ display: 'block', fontFamily: font.mono, fontSize: '11px', color: color.muted }}>
                  {courier.plate}
                </span>
              </td>
              <td style={cell}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}>
                  <TransportGlyph mode={courier.vehicleMode} size={17} color={color.orangeDeep} />
                  {modeMeta(courier.vehicleMode).label}
                </span>
              </td>
              <td style={quiet}>★ {courier.rating}</td>
              <td style={{ ...cell, fontWeight: 600 }}>{courier.activeJobs}</td>
              <td style={quiet}>{courier.completedJobs}</td>
              <td style={{ ...quiet, whiteSpace: 'nowrap' }}>{formatKes(figures(courier).revenue)}</td>
              <td style={cell}>
                <ShiftToggle courier={courier} disabled={readOnly} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

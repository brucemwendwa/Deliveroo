import { color, font, radius } from '../../theme';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { statusTone } from '../../theme';
import Icon from '../Icon';

/** Assigned courier, with call/message affordances (§14). */
export default function CourierCard({ courier, status }) {
  if (!courier) return null;
  const tone = statusTone[status] || color.orange;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '16px',
        borderRadius: radius.card,
        background: 'rgba(243,241,237,.06)',
        border: '1px solid rgba(243,241,237,.1)'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: radius.pill,
          background: color.orange,
          color: color.ink,
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none'
        }}
      >
        {courier.initial || courier.name?.[0] || '?'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15.5px', fontWeight: 700, letterSpacing: '-.02em', color: color.paper }}>
          {courier.name} · {courier.vehicle}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            marginTop: '4px',
            fontFamily: font.mono,
            fontSize: '11px',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: tone === color.inkSoft ? 'rgba(243,241,237,.7)' : tone
          }}
        >
          <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '99px', background: tone }} />
          {STATUS_LABEL[status] || status}
        </div>
      </div>
      {[
        { name: 'call', label: `Call ${courier.name}` },
        { name: 'chat_bubble', label: `Message ${courier.name}` }
      ].map((action) => (
        <button
          key={action.name}
          type="button"
          aria-label={action.label}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: radius.pill,
            border: '1px solid rgba(243,241,237,.2)',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            cursor: 'pointer'
          }}
        >
          <Icon name={action.name} size={20} color={color.paper} />
        </button>
      ))}
    </div>
  );
}

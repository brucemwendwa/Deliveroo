import { STATUS, STATUS_LABEL } from '../../lib/orderStatus';
import { DEFAULT_MODE, TRANSPORT, agentNounTitle } from '../../lib/transport';
import { color, font, radius, statusTone } from '../../theme';
import Icon from '../Icon';
import TransportGlyph from '../transport/TransportGlyph';

/**
 * The pickup agent (§14, §25). Before collection this is the Uber-style card — who is
 * coming, in what, how far out, how long — and after it, the person carrying the
 * parcel. Same facts either way; the ETA line simply stops being relevant once they
 * have it.
 *
 * On a motorbike delivery this is the rider, and the card says so: the bike's mark on
 * the avatar, "Rider heading to pickup" on the status line. `arrived` splits ASSIGNED
 * into on-the-way and waiting-at-the-door — see agentHasArrived in orderStatus.
 */
export default function CourierCard({ courier, status, mode = DEFAULT_MODE, arrived = false, tone = 'dark' }) {
  if (!courier) return null;
  const onDark = tone === 'dark';
  const accent = statusTone[status] || color.orange;
  const approaching = status === STATUS.ASSIGNED && !arrived && Number.isFinite(courier.etaMinutes);
  // What they are actually riding or driving, which is the bike itself on a motorbike
  // delivery and the collecting vehicle on every other mode.
  const vehicleMode = courier.vehicleMode || (mode === TRANSPORT.MOTORBIKE ? TRANSPORT.MOTORBIKE : null);
  const statusLine =
    status === STATUS.ASSIGNED
      ? `${agentNounTitle(mode)} ${arrived ? 'arrived at pickup' : 'heading to pickup'}`
      : STATUS_LABEL[status] || status;

  const surface = onDark
    ? { background: 'rgba(243,241,237,.06)', border: '1px solid rgba(243,241,237,.1)' }
    : { background: color.white, border: '1px solid rgba(17,17,17,.12)' };
  const strong = onDark ? color.paper : color.ink;
  const quiet = onDark ? 'rgba(243,241,237,.66)' : color.muted;

  return (
    <div style={{ padding: '16px', borderRadius: radius.card, ...surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span aria-hidden="true" style={{ position: 'relative', flex: 'none' }}>
          <span
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
              justifyContent: 'center'
            }}
          >
            {courier.initial || courier.name?.[0] || '?'}
          </span>
          {vehicleMode && (
            <span
              style={{
                position: 'absolute',
                right: '-4px',
                bottom: '-4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '25px',
                height: '25px',
                borderRadius: radius.pill,
                background: onDark ? color.ink : color.white,
                border: `1.5px solid ${onDark ? 'rgba(243,241,237,.24)' : 'rgba(17,17,17,.14)'}`
              }}
            >
              <TransportGlyph mode={vehicleMode} size={15} color={color.orange} />
            </span>
          )}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-.02em', color: strong }}>
              {courier.name}
            </span>
            {courier.rating && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: 600, color: quiet }}>
                <Icon name="star" size={14} color={color.orange} />
                {courier.rating}
              </span>
            )}
          </div>
          <div style={{ marginTop: '3px', fontSize: '14px', color: quiet }}>
            {courier.vehicle}
            {courier.plate && (
              <span
                style={{
                  marginLeft: '8px',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: onDark ? 'rgba(243,241,237,.12)' : 'rgba(17,17,17,.07)',
                  fontFamily: font.mono,
                  fontSize: '11.5px',
                  letterSpacing: '.06em',
                  color: strong
                }}
              >
                {courier.plate}
              </span>
            )}
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
              border: `1px solid ${onDark ? 'rgba(243,241,237,.2)' : 'rgba(17,17,17,.14)'}`,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              cursor: 'pointer'
            }}
          >
            <Icon name={action.name} size={20} color={strong} />
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px 18px',
          marginTop: '14px',
          paddingTop: '13px',
          borderTop: `1px solid ${onDark ? 'rgba(243,241,237,.12)' : 'rgba(17,17,17,.08)'}`
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            fontFamily: font.mono,
            fontSize: '11px',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: accent === color.inkSoft && onDark ? 'rgba(243,241,237,.7)' : accent
          }}
        >
          <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '99px', background: accent }} />
          {statusLine}
        </span>

        {approaching && (
          <>
            {Number.isFinite(courier.distanceKm) && (
              <span style={{ fontSize: '13.5px', color: quiet }}>
                <strong style={{ color: strong }}>{courier.distanceKm} km</strong> away
              </span>
            )}
            <span style={{ fontSize: '13.5px', color: quiet }}>
              Arriving in <strong style={{ color: strong }}>{courier.etaMinutes} min</strong>
            </span>
          </>
        )}

        {status === STATUS.ASSIGNED && arrived && (
          <span style={{ fontSize: '13.5px', color: quiet }}>
            Waiting at <strong style={{ color: strong }}>pickup</strong> — hand the parcel over when you&apos;re ready.
          </span>
        )}
      </div>
    </div>
  );
}

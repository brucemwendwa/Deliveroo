import { color, font } from '../../theme';

/**
 * Arrival readout (§14). Lifted from the old LiveTracking marketing section, which
 * had exactly this UI already built and on-palette — now driven by a real order:
 * the minutes, the clock time and the bar all come from how far through the journey
 * the parcel actually is.
 */
export default function EtaPanel({
  etaMinutes,
  progress = 0,
  arrivalAt,
  fromLabel = 'Picked up',
  toLabel = 'Arriving'
}) {
  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  const long = etaMinutes >= 60;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '18px',
        paddingBottom: '26px',
        borderBottom: '1px solid rgba(243,241,237,.16)',
        marginBottom: '26px'
      }}
    >
      <div>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: '10.5px',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: 'rgba(243,241,237,.5)',
            marginBottom: '8px'
          }}
        >
          Arriving in
        </div>
        <div
          aria-live="polite"
          style={{
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 'clamp(40px,4.6vw,70px)',
            lineHeight: 0.86,
            color: color.orange,
            letterSpacing: '-.01em',
            whiteSpace: 'nowrap'
          }}
        >
          {long ? hours : etaMinutes}
          <span style={{ fontSize: '.42em', color: color.paper }}>{long ? ' H' : ' MIN'}</span>
          {long && minutes > 0 && (
            <>
              {' '}
              {minutes}
              <span style={{ fontSize: '.42em', color: color.paper }}> MIN</span>
            </>
          )}
        </div>
        {arrivalAt && (
          <div style={{ marginTop: '10px', fontSize: '13.5px', color: 'rgba(243,241,237,.7)' }}>
            Expected by <strong style={{ color: color.paper }}>{arrivalAt}</strong>
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '6px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: font.mono,
            fontSize: '10.5px',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'rgba(243,241,237,.5)'
          }}
        >
          <span>{fromLabel}</span>
          <span>{toLabel}</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Delivery progress"
          style={{ height: '6px', borderRadius: '99px', background: 'rgba(243,241,237,.14)', overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              height: '100%',
              borderRadius: '99px',
              background: 'linear-gradient(90deg,#FFB067,#F5911E)',
              transition: 'width .6s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
}

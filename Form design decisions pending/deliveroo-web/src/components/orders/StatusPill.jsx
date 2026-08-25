import { STATUS_LABEL, isTerminal } from '../../lib/orderStatus';
import { font, radius, statusTone } from '../../theme';

/** The status chip, one definition for every list, table and header in the app. */
export default function StatusPill({ status, tone = 'light', size = 'md' }) {
  const accent = statusTone[status];
  const onDark = tone === 'dark';
  const small = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        height: small ? '26px' : '30px',
        padding: small ? '0 10px' : '0 12px',
        borderRadius: radius.pill,
        background: onDark ? 'rgba(243,241,237,.1)' : 'rgba(17,17,17,.05)',
        fontFamily: font.mono,
        fontSize: small ? '9.5px' : '10.5px',
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        color: accent
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '99px',
          background: accent,
          // A live delivery breathes; a finished one sits still.
          animation: isTerminal(status) ? 'none' : 'livePulse 1.8s ease-in-out infinite'
        }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

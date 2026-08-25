import { TRANSPORT, modeMeta } from '../../lib/transport';
import Icon from '../Icon';

/**
 * The mark for a transport mode (§25). Road, air and sea are Material Symbols like
 * every other icon in the app; the quadcopter is drawn here because the icon set has
 * no dependable drone glyph, and a missing ligature renders as the literal word.
 */
function Quadcopter({ size, color: tone }) {
  const s = typeof size === 'number' ? size : parseInt(size, 10) || 24;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tone || 'currentColor'}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      {/* arms */}
      <path d="M7.4 7.4 16.6 16.6M16.6 7.4 7.4 16.6" />
      {/* rotors */}
      <path d="M3.4 7.4h6M3.4 16.6h6M14.6 7.4h6M14.6 16.6h6" />
      {/* body */}
      <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.8" fill={tone || 'currentColor'} stroke="none" />
    </svg>
  );
}

export default function TransportGlyph({ mode, size = 22, color, style }) {
  if (mode === TRANSPORT.DRONE) {
    return (
      <span style={{ display: 'inline-flex', ...style }}>
        <Quadcopter size={size} color={color} />
      </span>
    );
  }
  return <Icon name={modeMeta(mode).icon} size={size} color={color} style={style} />;
}

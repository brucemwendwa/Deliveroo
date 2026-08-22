import { font } from '../theme';

/** Material Symbols glyph. `name` is the ligature, e.g. "arrow_outward". */
export default function Icon({ name, size = 18, color, style }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: font.icon,
        fontSize: typeof size === 'number' ? `${size}px` : size,
        lineHeight: 1,
        color,
        ...style
      }}
    >
      {name}
    </span>
  );
}

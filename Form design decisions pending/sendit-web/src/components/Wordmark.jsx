import { color, font } from '../theme';

/**
 * The brand lockup: the wing mark followed by the "Send it" word. The wing is
 * three blades converging on a single point at the left — the gaps between them
 * are the background showing through, so the mark works on any surface. Both
 * halves are sized in `em` against fontSize, so the lockup scales as one piece.
 *
 * `dot` adds the orange full stop after the word. It is drawn inside the text span
 * rather than beside it, so it shares that line box and sits on the same baseline as
 * "Send it" at every size instead of being positioned by hand.
 */
export default function Wordmark({ fontSize = 'clamp(20px,2vw,27px)', tone = color.white, shadow = true, dot = false }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '.34em',
        flex: 'none',
        fontFamily: font.brand,
        fontSize,
        fontWeight: 600,
        letterSpacing: '-.015em',
        color: tone,
        lineHeight: 1,
        filter: shadow ? 'drop-shadow(0 2px 10px rgba(28,32,31,.5))' : undefined
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 66"
        style={{ display: 'block', flex: 'none', width: '1.42em', height: '.94em' }}
        fill={color.orange}
      >
        <path d="M1.5 47.8 C28 33, 60 13, 98.5 0.8 C96.5 12, 92 21.5, 85 28.5 C60 35.5, 28 43.5, 1.5 47.8 Z" />
        <path d="M1.5 49.5 C28 45.5, 58 39, 83.5 30.5 C82 38.5, 77.5 45, 70 49.5 C46 51.4, 21 51.5, 1.5 49.5 Z" />
        <path d="M1.5 51 C22 53, 45 53.5, 66 51 C60 57, 52 62, 44 65 C30 60, 14 55.5, 1.5 51 Z" />
      </svg>
      <span style={{ display: 'block' }}>
        Send it
        {dot && (
          <span aria-hidden="true" style={{ color: color.orange }}>
            .
          </span>
        )}
      </span>
    </span>
  );
}

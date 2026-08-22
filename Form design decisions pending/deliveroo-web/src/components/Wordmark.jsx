import { color, font } from '../theme';

/**
 * "DELIVER" wordmark: the outlined box is the parcel, the glyph on the right is
 * the van, and the two pills are its wheels. Scales with fontSize.
 */
export default function Wordmark({ fontSize = 'clamp(20px,2vw,27px)', tone = color.white, shadow = true }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        flex: 'none',
        fontFamily: font.brand,
        fontSize,
        letterSpacing: '.02em',
        textTransform: 'uppercase',
        color: tone,
        lineHeight: 1
      }}
    >
      <span style={{ display: 'block', filter: shadow ? 'drop-shadow(0 2px 10px rgba(17,17,17,.5))' : undefined }}>
        <span style={{ position: 'relative', display: 'inline-block', padding: '.10em 1.52em .50em .22em' }}>
          <span style={{ display: 'block', position: 'relative', zIndex: 2 }}>Deliver</span>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: '.05em', right: '1.54em', top: 0, bottom: '.44em',
              border: '.075em solid currentColor', borderRadius: '.07em'
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: '-.02em', bottom: '.30em', width: '.10em', height: '.20em',
              background: 'currentColor', borderRadius: '.03em'
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', right: '1.42em', bottom: '.44em', width: '.66em', height: '.115em',
              background: 'currentColor', borderRadius: '.05em'
            }}
          />
          <span aria-hidden="true" style={{ position: 'absolute', right: '.02em', bottom: '-.02em', width: '1.42em', height: '1.30em' }}>
            <svg viewBox="0 0 142 130" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} fill="currentColor">
              <path d="M6,86 V30 Q6,14 24,14 H82 Q95,14 100,27 L112,58 Q116,66 116,74 H130 Q137,74 137,82 V92 H6 Z" />
              <path d="M66,54 V32 Q66,24 76,24 H84 Q90,24 92,32 L98,54 Z" fill={color.ink} />
              <rect x="98" y="24" width="15" height="4" rx="2" />
              <rect x="98" y="24" width="4" height="12" rx="2" />
              <rect x="16" y="0" width="8" height="16" rx="3" />
              <rect x="124" y="76" width="12" height="10" rx="3" fill={color.orange} />
            </svg>
            {['.15em', '.75em'].map((left) => (
              <span
                key={left}
                style={{
                  position: 'absolute', left, top: '.50em', width: '.50em', height: '.72em',
                  borderRadius: '999px', background: 'currentColor'
                }}
              >
                <span style={{ position: 'absolute', inset: '.145em .125em', borderRadius: '999px', background: color.ink }} />
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

import { color, eyebrow, font, radius } from '../../theme';
import Icon from '../Icon';

/**
 * §25 — the seconds between requesting a pickup and being matched with an agent.
 *
 * A spinner would say "loading"; this says "we are out looking for someone near you",
 * which is what is actually happening and what makes the product feel on-demand rather
 * than like a form that has been submitted.
 */
export default function FindingAgent({ pickupLabel, tone = 'dark' }) {
  const onDark = tone === 'dark';
  const strong = onDark ? color.paper : color.ink;
  const quiet = onDark ? 'rgba(243,241,237,.66)' : color.muted;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        padding: '20px',
        borderRadius: radius.card,
        background: onDark ? 'rgba(243,241,237,.06)' : color.white,
        border: `1px solid ${onDark ? 'rgba(243,241,237,.1)' : 'rgba(17,17,17,.12)'}`
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '54px',
          height: '54px'
        }}
      >
        {[0, 1, 2].map((ring) => (
          <span
            key={ring}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '999px',
              background: color.orange,
              animation: `radar 2.4s ${ring * 0.8}s ease-out infinite`
            }}
          />
        ))}
        <span
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '999px',
            background: color.orange,
            color: color.ink
          }}
        >
          <Icon name="person_search" size={21} />
        </span>
      </span>

      <div style={{ minWidth: 0 }}>
        <div style={{ ...eyebrow, color: color.orange, marginBottom: '6px' }}>Dispatching</div>
        <div style={{ fontFamily: font.body, fontSize: '16.5px', fontWeight: 800, letterSpacing: '-.02em', color: strong }}>
          Finding a pickup agent near you…
        </div>
        {pickupLabel && (
          <div style={{ marginTop: '4px', fontSize: '13.5px', lineHeight: 1.5, color: quiet }}>
            Searching around {pickupLabel}
          </div>
        )}
      </div>
    </div>
  );
}

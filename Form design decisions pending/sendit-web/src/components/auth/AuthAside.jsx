import { color, font, radius } from '../../theme';
import Icon from '../Icon';
import Wordmark from '../Wordmark';

// §12 — the branding half of the sign-in dialog. Hidden below 860px by .auth-grid,
// so on a phone the visitor gets the form and nothing competing with it (§23).
const POINTS = [
  { icon: 'bolt', title: 'A price in seconds', body: 'Quote, book and pay without leaving the page.' },
  { icon: 'my_location', title: 'Live on the map', body: 'Watch the rider move, minute by minute.' },
  { icon: 'verified_user', title: 'No password to lose', body: 'One code, sent to you, valid once.' }
];

export default function AuthAside() {
  return (
    <aside
      aria-hidden="true"
      // No `display` here on purpose: .auth-grid owns it, and an inline style would
      // outrank the media query that hides this column on a phone.
      style={{
        position: 'relative',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '30px',
        padding: 'clamp(30px,3vw,40px)',
        background: `linear-gradient(158deg, ${color.greenDeep} 0%, #22282B 58%, ${color.green} 190%)`,
        color: color.paper,
        overflow: 'hidden'
      }}
    >
      {/* The wing motif from the wordmark, blown up and bled off the corner. */}
      <svg
        viewBox="0 0 100 66"
        style={{
          position: 'absolute',
          right: '-16%',
          bottom: '-10%',
          width: '82%',
          opacity: 0.07,
          fill: color.orange,
          pointerEvents: 'none'
        }}
      >
        <path d="M1.5 47.8 C28 33, 60 13, 98.5 0.8 C96.5 12, 92 21.5, 85 28.5 C60 35.5, 28 43.5, 1.5 47.8 Z" />
        <path d="M1.5 49.5 C28 45.5, 58 39, 83.5 30.5 C82 38.5, 77.5 45, 70 49.5 C46 51.4, 21 51.5, 1.5 49.5 Z" />
        <path d="M1.5 51 C22 53, 45 53.5, 66 51 C60 57, 52 62, 44 65 C30 60, 14 55.5, 1.5 51 Z" />
      </svg>

      <div style={{ position: 'relative' }}>
        <Wordmark fontSize="24px" tone={color.paper} shadow={false} dot />
      </div>

      <div style={{ position: 'relative' }}>
        <p
          style={{
            margin: '0 0 26px',
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: 'clamp(26px,2.4vw,33px)',
            lineHeight: 1.12,
            letterSpacing: '-.02em',
            textWrap: 'balance'
          }}
        >
          Parcels across Kenya,
          <br />
          moving while you watch.
        </p>

        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '16px' }}>
          {POINTS.map((point) => (
            <li key={point.title} style={{ display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
              <span
                style={{
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: radius.pill,
                  background: 'rgba(248,135,53,.16)'
                }}
              >
                <Icon name={point.icon} size={18} color={color.orangeLight} />
              </span>
              <span style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: '14.5px', fontWeight: 600, lineHeight: 1.35 }}>
                  {point.title}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: '2px',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    color: 'rgba(243,243,241,.68)'
                  }}
                >
                  {point.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: 0,
          fontSize: '12.5px',
          lineHeight: 1.5,
          color: 'rgba(243,243,241,.62)'
        }}
      >
        <Icon name="lock" size={15} color="rgba(243,243,241,.62)" />
        Codes expire after one use. We never ask for a password.
      </p>
    </aside>
  );
}

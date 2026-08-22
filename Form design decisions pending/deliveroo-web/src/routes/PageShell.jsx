import { color, eyebrow, font, layout } from '../theme';

/**
 * Interior-page header. The band is dark for a practical reason as well as a visual
 * one: the fixed nav is white text designed to sit over the hero photo, so every page
 * needs something dark beneath it at scroll position zero.
 */
export default function PageShell({ eyebrow: label, title, children, aside }) {
  return (
    <>
      <div style={{ background: color.ink, padding: 'calc(80px + clamp(36px,6vw,80px)) 0 clamp(36px,5vw,72px)' }}>
        <div
          style={{
            maxWidth: layout.maxWidth,
            margin: '0 auto',
            padding: `0 ${layout.gutter}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '24px'
          }}
        >
          <div>
            {label && <div style={{ ...eyebrow, color: color.orange, marginBottom: '16px' }}>{label}</div>}
            <h1
              style={{
                margin: 0,
                fontFamily: font.display,
                fontWeight: 700,
                fontSize: 'clamp(34px,5.6vw,84px)',
                lineHeight: 0.92,
                letterSpacing: '-.015em',
                textTransform: 'uppercase',
                color: color.paper,
                maxWidth: '18ch'
              }}
            >
              {title}
            </h1>
          </div>
          {aside}
        </div>
      </div>
      <div style={{ background: color.paper, padding: 'clamp(36px,5vw,72px) 0 clamp(64px,8vw,120px)' }}>
        <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `0 ${layout.gutter}` }}>{children}</div>
      </div>
    </>
  );
}

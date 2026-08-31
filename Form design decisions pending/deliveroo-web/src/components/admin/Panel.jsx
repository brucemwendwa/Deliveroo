import { color, eyebrow, radius, shadow } from '../../theme';

/**
 * The portal's one card. Every section is a stack of these, so the surface, the
 * padding and the heading scale are settled once rather than nine times.
 */
export default function Panel({ title, note, action, children, style }) {
  return (
    <section
      style={{
        borderRadius: radius.card,
        border: `1px solid ${color.border}`,
        background: color.card,
        boxShadow: shadow.card,
        padding: 'clamp(18px,2.2vw,26px)',
        ...style
      }}
    >
      {(title || action) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: note ? '6px' : '16px'
          }}
        >
          {title && <h2 style={{ ...eyebrow, margin: 0 }}>{title}</h2>}
          {action}
        </header>
      )}
      {note && (
        <p style={{ margin: '0 0 18px', maxWidth: '62ch', fontSize: '13px', lineHeight: 1.55, color: color.muted }}>
          {note}
        </p>
      )}
      {children}
    </section>
  );
}

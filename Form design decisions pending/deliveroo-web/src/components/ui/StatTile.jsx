import { color, eyebrow, font, radius, shadow } from '../../theme';
import Icon from '../Icon';

/**
 * One number with its label. The dashboard and the dispatch console both run rows of
 * these, so the type scale and the surfaces are settled here rather than twice.
 */
export default function StatTile({ label, value, icon, hint, tone = 'light', accent, onClick, active = false }) {
  const onDark = tone === 'dark';
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      {...(onClick ? { type: 'button', onClick, 'aria-pressed': active } : {})}
      style={{
        flex: '1 1 130px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '10px',
        padding: 'clamp(14px,1.8vw,18px)',
        borderRadius: radius.card,
        textAlign: 'left',
        fontFamily: font.body,
        background: onDark ? 'rgba(243,243,241,.06)' : color.card,
        border: `1px solid ${
          active ? color.green : onDark ? 'rgba(243,243,241,.1)' : color.border
        }`,
        boxShadow: onDark ? 'none' : shadow.card,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .2s ease, background .2s ease, box-shadow .2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <Icon name={icon} size={16} color={accent || color.orange} />}
        <span style={{ ...eyebrow, fontSize: '9.5px', color: onDark ? 'rgba(243,243,241,.5)' : color.muted }}>{label}</span>
      </div>
      <span
        style={{
          fontFamily: font.display,
          fontWeight: 600,
          fontSize: 'clamp(24px,2.8vw,34px)',
          lineHeight: 1,
          letterSpacing: '-.02em',
          color: onDark ? color.paper : color.ink
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: '12.5px', lineHeight: 1.4, color: onDark ? 'rgba(243,243,241,.6)' : color.muted }}>
          {hint}
        </span>
      )}
    </Component>
  );
}

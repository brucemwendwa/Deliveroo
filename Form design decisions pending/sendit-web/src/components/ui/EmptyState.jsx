import { color, font, radius } from '../../theme';
import Icon from '../Icon';

/** Nothing to show, said properly: what this list is for, and the way out of it. */
export default function EmptyState({ icon = 'inbox', title, body, action, tone = 'light' }) {
  const onDark = tone === 'dark';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '14px',
        padding: 'clamp(36px,6vw,64px) clamp(20px,4vw,40px)',
        borderRadius: radius.card,
        border: `1px dashed ${onDark ? 'rgba(243,243,241,.18)' : color.border}`,
        background: onDark ? 'rgba(243,243,241,.04)' : 'rgba(255,255,255,.6)'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '999px',
          background: 'rgba(248,135,53,.16)'
        }}
      >
        <Icon name={icon} size={26} color={color.orangeDeep} />
      </span>
      <h3
        style={{
          margin: 0,
          fontFamily: font.display,
          fontWeight: 600,
          fontSize: 'clamp(20px,2.4vw,26px)',
          letterSpacing: '-.02em',
          color: onDark ? color.paper : color.ink
        }}
      >
        {title}
      </h3>
      {body && (
        <p style={{ margin: 0, maxWidth: '40ch', fontSize: '14.5px', lineHeight: 1.6, color: onDark ? 'rgba(243,243,241,.7)' : color.body }}>
          {body}
        </p>
      )}
      {action}
    </div>
  );
}

import { color, ease, font, radius } from '../../theme';
import Icon from '../Icon';

/**
 * One step of the wizard (§6). Progressive disclosure: only the active step shows its
 * controls; completed steps collapse to a single line that stays clickable, and steps
 * ahead of the customer are dimmed rather than hidden so the path is legible.
 */
export default function StepShell({ index, title, question, active, complete, summary, onOpen, containerRef, children }) {
  const reachable = active || complete;

  return (
    <section
      ref={containerRef}
      data-step={index}
      aria-current={active ? 'step' : undefined}
      style={{
        borderTop: `1px solid ${color.border}`,
        padding: 'clamp(20px,2.4vw,28px) 0',
        opacity: reachable ? 1 : 0.42,
        transition: 'opacity .35s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span
          aria-hidden="true"
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: radius.pill,
            background: complete ? color.green : active ? color.orange : 'transparent',
            border: complete || active ? 'none' : `1px solid ${color.border}`,
            color: complete ? color.paper : color.ink,
            fontFamily: font.mono,
            fontSize: '12px',
            fontWeight: 600,
            transition: `background .3s ${ease.out}`
          }}
        >
          {complete ? <Icon name="check" size={18} /> : String(index + 1).padStart(2, '0')}
        </span>

        <h3
          style={{
            flex: 1,
            margin: 0,
            fontSize: 'clamp(16px,1.6vw,20px)',
            fontWeight: 600,
            letterSpacing: '-.025em',
            color: color.ink
          }}
        >
          {active ? question : title}
        </h3>

        {complete && !active && (
          <button
            type="button"
            onClick={onOpen}
            style={{
              flex: 'none',
              height: '44px',
              padding: '0 16px',
              borderRadius: radius.pill,
              border: 'none',
              background: 'transparent',
              fontFamily: font.body,
              fontSize: '13.5px',
              fontWeight: 600,
              color: color.muted,
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
        )}
      </div>

      {complete && !active && summary && (
        <p style={{ margin: '8px 0 0 48px', fontSize: '14.5px', color: color.body, textWrap: 'pretty' }}>{summary}</p>
      )}

      {active && <div style={{ marginTop: '18px', paddingLeft: 'clamp(0px,3vw,48px)' }}>{children}</div>}
    </section>
  );
}

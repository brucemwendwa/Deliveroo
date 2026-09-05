import { PRIORITY, modeMeta, priorityOption } from '../../lib/transport';
import { color, font, radius } from '../../theme';
import TransportGlyph from './TransportGlyph';

/**
 * "✈️ Air · Express" as a pill. Every screen that lists a delivery shows how it
 * travels, so the mark and the wording are defined once here rather than per screen.
 */
export default function TransportBadge({ mode, priority, tone = 'light', size = 'md', style }) {
  const meta = modeMeta(mode);
  const onDark = tone === 'dark';
  const small = size === 'sm';
  const express = priority && priority !== PRIORITY.STANDARD;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: small ? '6px' : '8px',
        height: small ? '26px' : '32px',
        padding: small ? '0 10px' : '0 13px',
        borderRadius: radius.pill,
        background: onDark ? 'rgba(243,243,241,.1)' : 'rgba(28,32,31,.05)',
        border: `1px solid ${onDark ? 'rgba(243,243,241,.16)' : 'rgba(28,32,31,.08)'}`,
        fontFamily: font.body,
        fontSize: small ? '12px' : '13px',
        fontWeight: 600,
        letterSpacing: '-.01em',
        color: onDark ? color.paper : color.ink,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <TransportGlyph mode={meta.id} size={small ? 15 : 17} color={color.orange} />
      {meta.label}
      {express && (
        <span style={{ fontFamily: font.mono, fontSize: small ? '9px' : '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: color.orange }}>
          {priorityOption(priority).label}
        </span>
      )}
    </span>
  );
}

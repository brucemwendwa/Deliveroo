import { handoffNote, modeMeta } from '../../lib/transport';
import { color, radius } from '../../theme';
import TransportGlyph from '../transport/TransportGlyph';

/**
 * §25 — why a rider is at the door for a parcel that flies.
 *
 * Air, sea and drone are collected by road: a plane cannot come to the house, so the
 * first leg is a courier and the parcel changes hands further up. Every screen that
 * names that courier shows this line beneath them, because "Air" in the badge and
 * "Rider assigned" in the headline is a contradiction until somebody explains it.
 *
 * Renders nothing for road and motorbike, where the person who collects the parcel is
 * the person who delivers it and there is nothing to explain.
 */
export default function HandoffNote({ mode, noun, tone = 'dark', style }) {
  const note = handoffNote(mode, noun);
  if (!note) return null;
  const onDark = tone === 'dark';

  return (
    <p
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '9px',
        margin: '10px 0 0',
        padding: '11px 13px',
        borderRadius: radius.field,
        background: onDark ? 'rgba(243,243,241,.05)' : 'rgba(28,32,31,.04)',
        border: `1px solid ${onDark ? 'rgba(243,243,241,.09)' : 'rgba(28,32,31,.07)'}`,
        fontSize: '13px',
        lineHeight: 1.5,
        color: onDark ? 'rgba(243,243,241,.72)' : color.muted,
        ...style
      }}
    >
      <TransportGlyph mode={modeMeta(mode).id} size={16} color={color.orange} style={{ flex: 'none', marginTop: '1px' }} />
      <span>{note}</span>
    </p>
  );
}

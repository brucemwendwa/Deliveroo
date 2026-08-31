import { PRIORITY_OPTIONS, TRANSPORT_MODES } from '../../lib/transport';
import { formatDuration, formatKes } from '../../lib/pricing';
import useHover from '../../hooks/useHover';
import { color, ease, eyebrow, font, radius } from '../../theme';
import Icon from '../Icon';
import TransportGlyph from '../transport/TransportGlyph';

/**
 * §25 — "how should it be transported?". One card per mode, priced live against this
 * route and this parcel.
 *
 * A mode that can't run the route stays on screen, greyed, carrying the reason it
 * can't. Hiding it would leave the customer wondering whether Deliveroo flies at all;
 * saying "sea freight starts at 200 km" answers the question and closes it.
 */
function OptionCard({ option, selected, onSelect }) {
  const [hovered, bind] = useHover();
  const { meta, quote, available, reason, badge, busy } = option;

  const border = selected ? color.ink : available && hovered ? 'rgba(28,32,31,.34)' : 'rgba(28,32,31,.12)';

  return (
    <button
      type="button"
      onClick={() => available && onSelect(meta.id)}
      disabled={!available}
      aria-pressed={selected}
      // Without this the accessible name is the whole card read as one run-on string.
      // Spelled out instead: what it is, what it costs, how long, and why not.
      aria-label={
        available
          ? `${meta.label}, ${formatKes(quote.total)}, ${formatDuration(quote.durationSeconds)}`
          : `${meta.label} unavailable. ${reason}`
      }
      {...bind}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        textAlign: 'left',
        padding: 'clamp(16px,2vw,20px)',
        borderRadius: radius.card,
        border: `${selected ? 2 : 1.5}px solid ${border}`,
        background: available ? color.card : 'rgba(28,32,31,.03)',
        cursor: available ? 'pointer' : 'not-allowed',
        fontFamily: font.body,
        boxShadow: selected
          ? '0 26px 46px -30px rgba(28,32,31,.55)'
          : available && hovered
            ? '0 20px 38px -30px rgba(28,32,31,.45)'
            : 'none',
        transform: selected || (available && hovered) ? 'translateY(-3px)' : 'none',
        transition: `transform .25s ${ease.out}, box-shadow .25s ${ease.out}, border-color .2s, background .2s`,
        opacity: available ? 1 : 0.72
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span
          aria-hidden="true"
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: selected ? color.green : available ? 'rgba(248,135,53,.14)' : 'rgba(28,32,31,.06)',
            transition: `background .25s ${ease.out}`
          }}
        >
          <TransportGlyph mode={meta.id} size={23} color={selected ? color.orange : available ? color.orangeDeep : color.muted} />
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16.5px', fontWeight: 600, letterSpacing: '-.02em', color: color.ink }}>
              {meta.label}
            </span>
            {badge && available && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '20px',
                  padding: '0 8px',
                  borderRadius: radius.pill,
                  background: color.orange,
                  fontFamily: font.mono,
                  fontSize: '9px',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: color.ink
                }}
              >
                {badge}
              </span>
            )}
          </span>
          <span style={{ display: 'block', marginTop: '3px', fontSize: '13px', lineHeight: 1.45, color: color.muted }}>
            {meta.tagline}
          </span>
        </span>

        {selected && (
          <span
            aria-hidden="true"
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: radius.pill,
              background: color.orange,
              color: color.ink,
              animation: `popIn .3s ${ease.spring} both`
            }}
          >
            <Icon name="check" size={17} />
          </span>
        )}
      </div>

      {available ? (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
            <span
              style={{
                fontFamily: font.display,
                fontWeight: 600,
                fontSize: 'clamp(24px,2.6vw,30px)',
                lineHeight: 1,
                letterSpacing: '-.02em',
                color: color.ink
              }}
            >
              {formatKes(quote.total)}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 600, color: color.body }}>
              <Icon name="schedule" size={16} color={color.muted} />
              {formatDuration(quote.durationSeconds)}
            </span>
          </div>

          {(busy || option.via) && (
            <span style={{ fontSize: '12.5px', lineHeight: 1.45, color: color.muted }}>
              {busy ? 'Heavy demand right now — allow extra time for collection.' : `Sails via ${option.via}.`}
            </span>
          )}

          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              height: '44px',
              borderRadius: radius.pill,
              background: selected ? color.green : 'transparent',
              border: selected ? 'none' : `1px solid ${color.border}`,
              fontSize: '14.5px',
              fontWeight: 600,
              color: selected ? color.paper : color.ink,
              transition: 'background .2s, color .2s, border-color .2s'
            }}
          >
            {selected ? 'Selected' : `Choose ${meta.label}`}
          </span>
        </>
      ) : (
        <span style={{ display: 'flex', gap: '9px', fontSize: '13px', lineHeight: 1.5, color: color.muted }}>
          <Icon name="do_not_disturb_on" size={16} color={color.muted} style={{ flex: 'none', marginTop: '1px' }} />
          {reason}
        </span>
      )}
    </button>
  );
}

/** Skeletons while the route is still being worked out — the card grid keeps its shape. */
function LoadingCards() {
  return (
    <>
      {TRANSPORT_MODES.map((meta, index) => (
        <div
          key={meta.id}
          aria-hidden="true"
          style={{
            height: '186px',
            borderRadius: radius.card,
            border: `1px solid ${color.border}`,
            background: `linear-gradient(100deg, rgba(28,32,31,.035) 30%, rgba(28,32,31,.07) 50%, rgba(28,32,31,.035) 70%)`,
            backgroundSize: '260% 100%',
            animation: `shimmer 1.5s ${index * 0.12}s linear infinite`
          }}
        />
      ))}
    </>
  );
}

export default function TransportOptions({ options, selected, onSelect, priority, onPriority, loading = false }) {
  return (
    <div>
      {/* Priority first: it re-prices every card below, so choosing it second would
          mean watching four figures jump after the decision was already made. */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ ...eyebrow, marginBottom: '10px' }}>How soon do you need it?</div>
        <div
          role="radiogroup"
          aria-label="Delivery priority"
          style={{
            display: 'inline-flex',
            padding: '4px',
            borderRadius: radius.pill,
            background: 'rgba(28,32,31,.05)',
            border: `1px solid ${color.border}`
          }}
        >
          {PRIORITY_OPTIONS.map((tier) => {
            const active = tier.id === priority;
            return (
              <button
                key={tier.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPriority(tier.id)}
                title={tier.note}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: radius.pill,
                  border: 'none',
                  background: active ? color.card : 'transparent',
                  boxShadow: active ? '0 6px 16px -10px rgba(28,32,31,.6)' : 'none',
                  fontFamily: font.body,
                  fontSize: '14.5px',
                  fontWeight: 600,
                  color: active ? color.ink : color.muted,
                  cursor: 'pointer',
                  transition: `background .2s ${ease.out}, color .2s`
                }}
              >
                {tier.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))'
        }}
      >
        {loading ? (
          <LoadingCards />
        ) : (
          options.map((option) => (
            <OptionCard
              key={option.mode}
              option={option}
              selected={option.mode === selected}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      <p style={{ margin: '14px 0 0', display: 'flex', gap: '8px', fontSize: '12.5px', lineHeight: 1.55, color: color.muted }}>
        <Icon name="bolt" size={15} color={color.orange} style={{ flex: 'none', marginTop: '1px' }} />
        Prices are worked out live from this route, the parcel and how soon you need it —
        they are not a fixed price list. Availability depends on the route: not every mode
        can serve every journey.
      </p>
    </div>
  );
}

import { Link } from 'react-router-dom';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { TRANSPORT_MODES } from '../lib/transport';
import { color, ease, eyebrow, font, layout, radius } from '../theme';
import useHover from '../hooks/useHover';
import Icon from './Icon';
import TransportGlyph from './transport/TransportGlyph';

// Spelled out because the heading is words, not figures — and derived from the
// catalogue so adding a sixth vehicle cannot leave the headline saying five.
const COUNT_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

// One line each on when the mode earns its place. Kept here rather than in the
// catalogue: this is marketing copy, not a rule the pricing depends on.
const NOTES = {
  ROAD: 'Anywhere the road network reaches.',
  MOTORBIKE: 'A rider across the city, straight through the traffic.',
  AIR: 'Across the country before the day is out.',
  SHIP: 'Heavy freight between ports, at freight prices.',
  DRONE: 'Local hops in minutes, straight over the traffic.'
};

function ModeCard({ meta }) {
  const [hovered, bind] = useHover();

  return (
    <div
      {...bind}
      data-reveal=""
      style={{
        flex: '1 1 220px',
        minWidth: 'min(100%,200px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: 'clamp(20px,2.4vw,26px)',
        borderRadius: radius.card,
        border: `1px solid ${hovered ? 'rgba(243,243,241,.28)' : 'rgba(243,243,241,.14)'}`,
        background: hovered ? 'rgba(243,243,241,.08)' : 'rgba(243,243,241,.04)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: `transform .3s ${ease.out}, background .3s, border-color .3s`
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          background: color.orange
        }}
      >
        <TransportGlyph mode={meta.id} size={24} color={color.ink} />
      </span>
      <span style={{ fontSize: '19px', fontWeight: 600, letterSpacing: '-.02em', color: color.paper }}>{meta.label}</span>
      <span style={{ fontSize: '14px', lineHeight: 1.55, color: 'rgba(243,243,241,.68)' }}>{NOTES[meta.id]}</span>
      <span
        style={{
          marginTop: 'auto',
          paddingTop: '10px',
          fontFamily: font.mono,
          fontSize: '10px',
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: color.orange
        }}
      >
        {meta.tagline}
      </span>
    </div>
  );
}

/**
 * §25 — the new promise, stated once on the landing page: you describe the parcel,
 * Deliveroo works out how it travels. The eligibility line is not a disclaimer, it is
 * the product — knowing that a motorbike cannot cross the country is our job, not yours.
 */
export default function ModesBand() {
  const startBooking = useStartBooking();

  return (
    <section id="modes" style={{ background: color.greenDeep, padding: 'clamp(70px,8vw,120px) 0' }}>
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `0 ${layout.gutter}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,64px)', alignItems: 'flex-end', marginBottom: 'clamp(32px,4vw,56px)' }}>
          <div style={{ flex: '1 1 420px' }}>
            <div style={{ ...eyebrow, color: color.orange, marginBottom: '18px' }}>Multi-modal delivery</div>
            <h2
              data-reveal=""
              style={{
                margin: '0 0 18px',
                fontFamily: font.display,
                fontWeight: 600,
                fontSize: 'clamp(34px,5.4vw,84px)',
                lineHeight: 1.04,
                letterSpacing: '-.025em',
                color: color.paper
              }}
            >
              One request.<br />{COUNT_WORD[TRANSPORT_MODES.length] || TRANSPORT_MODES.length} ways to move it.
            </h2>
            <p style={{ margin: 0, maxWidth: '46ch', fontSize: 'clamp(15px,1.4vw,17.5px)', lineHeight: 1.6, color: 'rgba(243,243,241,.7)' }}>
              Tell us where to collect it and where it&apos;s going. We work out whether it travels
              by motorbike, road, air, sea or drone — price and arrival time for each, before you
              commit.
            </p>
          </div>

          <Link
            to={BOOKING_PATH}
            onClick={startBooking}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              height: '56px',
              padding: '0 26px',
              borderRadius: radius.pill,
              background: color.orange,
              color: color.ink,
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            Request a delivery
            <Icon name="arrow_outward" size={19} />
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
          {TRANSPORT_MODES.map((meta) => (
            <ModeCard key={meta.id} meta={meta} />
          ))}
        </div>

        <p style={{ margin: '22px 0 0', display: 'flex', gap: '9px', fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(243,243,241,.6)' }}>
          <Icon name="info" size={16} color={color.orange} style={{ flex: 'none', marginTop: '2px' }} />
          Not every mode serves every route — sea freight needs a port, a motorbike and a drone
          need a short hop. Deliveroo only offers what can actually make the journey, and says
          why when it can&apos;t.
        </p>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCtaHover } from '../store/uiSlice';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, font } from '../theme';
import Icon from './Icon';

const KNOB = 'clamp(50px,5.4vw,62px)';

/**
 * The hero photograph: one composite frame carrying every mode we run — air, drone,
 * sea, road and the rider — under the same sunset. It is the whole stage. There is no
 * carousel: the picture does not change and neither does the copy over it.
 *
 * `width`/`height` are the file's real pixel dimensions. They are here rather than
 * hard-coded in the markup because the stylesheet needs the same ratio: below the
 * breakpoint the picture is given a box of exactly this shape, which is what stops it
 * being cropped (see `.hero-photo` in global.css). They also reserve the space before
 * the file arrives, so the copy underneath does not jump when it does.
 *
 * `focus` is the object-position for the wide desktop crop, `focusNarrow` the one used
 * under the 980px breakpoint. Both anchors sit above centre so the crop keeps the top
 * of the frame: that drops the whole picture — the aircraft above all — clear of the
 * wordmark and strapline the fixed nav puts in the top-left corner, where the white
 * fuselage was swallowing them.
 */
export const HERO_PHOTO = {
  src: '/photos/hero-global-network.jpeg',
  alt: 'Cargo aircraft, delivery drone, container ship, motorbike courier and freight truck under one sunset, over a world map',
  width: 1503,
  height: 1046,
  focus: '50% 22%',
  focusNarrow: '58% 26%'
};

/**
 * The words over it: the headline and, under it, a tagline rather than a paragraph —
 * two short clauses that fit on one line above the CTAs. There is no eyebrow, so the
 * headline is the first thing read over the photograph.
 */
export const HERO_COPY = {
  headline: ['From anywhere to', 'your door'],
  body: 'One network. Every mode.'
};

/**
 * The approved CTA, unchanged apart from its label: the goo-filtered pill whose knob
 * slides on hover. It still runs through useStartBooking, so the hero keeps using the
 * existing booking flow — signed in goes to /book, signed out gets the auth modal
 * first and lands there afterwards.
 */
function RequestCta() {
  const dispatch = useDispatch();
  const ctaHover = useSelector((state) => state.ui.ctaHover);
  const startBooking = useStartBooking();

  return (
    <Link
      to={BOOKING_PATH}
      onClick={startBooking}
      onMouseEnter={() => dispatch(setCtaHover(true))}
      onMouseLeave={() => dispatch(setCtaHover(false))}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '14px',
        height: KNOB,
        // A phone is narrower than the pill's natural width once the label, the knob
        // and the gaps are added up, so it is allowed to shrink to the column and the
        // label wraps its padding in rather than pushing the row into a sideways
        // scroll. On anything wider this never binds.
        maxWidth: '100%',
        color: color.ink
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          filter: 'url(#ctaGoo) drop-shadow(0 13px 18px rgba(28,32,31,.4))'
        }}
      >
        <span style={{ flex: 1, alignSelf: 'stretch', borderRadius: '999px', background: color.orange }} />
        <span
          style={{
            position: 'relative',
            width: KNOB,
            flex: 'none',
            alignSelf: 'stretch',
            borderRadius: '999px',
            background: color.orange,
            transform: ctaHover ? 'translateX(11px)' : 'none',
            transition: `transform .5s ${ease.spring}`
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '50%',
              right: '100%',
              marginRight: '-5px',
              width: '24px',
              height: ctaHover ? '15px' : '23px',
              borderRadius: '999px',
              background: color.orange,
              transformOrigin: 'right center',
              transform: ctaHover ? 'translateY(-50%) scaleX(2.05)' : 'translateY(-50%) scaleX(1)',
              transition: `transform .5s ${ease.spring}, height .5s ${ease.spring}`
            }}
          />
        </span>
      </span>
      <span
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          height: '100%',
          padding: '0 clamp(18px,3vw,44px)',
          fontSize: 'clamp(14px,1.15vw,16.5px)',
          fontWeight: 600,
          letterSpacing: '-.01em',
          whiteSpace: 'nowrap'
        }}
      >
        Request a Delivery
      </span>
      <span
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: KNOB,
          flex: 'none',
          height: '100%',
          transform: ctaHover ? 'translateX(11px) rotate(45deg)' : 'none',
          transition: `transform .5s ${ease.spring}`
        }}
      >
        <Icon name="arrow_outward" size="clamp(19px,1.8vw,23px)" />
      </span>
    </Link>
  );
}

/**
 * The two arrangements this section has, chosen by the stylesheet rather than by
 * JavaScript so the right one is painted on the first frame:
 *
 * - A portrait screen under 980px: the photograph takes a band of its own at its
 *   true aspect ratio, so the whole frame is visible, and the words sit underneath
 *   it on the dark ground. The picture is a composite — five vehicles spread right
 *   across a landscape frame — and a portrait fold was cropping it to about a third
 *   of its width, which threw away most of what it is a picture of.
 * - Everything else, a handset held sideways included: unchanged. The frame is wide
 *   enough to carry the words, so the photograph goes full bleed behind them and
 *   fills the fold, giving up a little sky and tarmac instead of its width.
 *
 * `narrow` still picks the crop anchor. It is the JS mirror of the same breakpoint,
 * and it matters on the wide side of it — the stacked band crops nothing, so there is
 * no position for it to anchor.
 */
export default function Hero() {
  const narrow = useSelector((state) => state.ui.narrow);

  return (
    <div id="top" className="hero">
      {/*
        Full bleed stage. One photograph, drawn at its own colours: no filter, no
        scale, so it renders as supplied. The copy carries its own shadow, and the
        only wash over the picture is the short one at the very top, below — the nav
        band, not the hero copy.
      */}
      <img
        className="hero-photo"
        src={HERO_PHOTO.src}
        alt={HERO_PHOTO.alt}
        width={HERO_PHOTO.width}
        height={HERO_PHOTO.height}
        // Above the fold, and the only thing behind the headline: never lazy.
        loading="eager"
        decoding="async"
        fetchpriority="high"
        style={{
          objectFit: 'cover',
          objectPosition: narrow ? HERO_PHOTO.focusNarrow : HERO_PHOTO.focus
        }}
      />

      {/*
        The nav band only: a short wash under the fixed nav's 80px so the wordmark and
        the strapline keep a dark ground whatever the sky does behind them. It ends
        well above the headline, which is still read straight off the photograph on a
        desktop and off the dark ground beneath it on a phone.
      */}
      <div aria-hidden="true" className="hero-scrim" />

      <div className="hero-copy">
        {/*
          The copy takes every row the CTA leaves, which parks the CTA on the bottom
          padding edge without the words having to move with it.
        */}
        <div className="hero-words">
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(16px,2.1vw,26px)',
              animation: `riseIn .8s ${ease.out} both`
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: font.display,
                fontWeight: 600,
                fontSize: 'clamp(33px,5.1vw,66px)',
                lineHeight: 1.04,
                letterSpacing: '-.022em',
                color: color.white,
                textShadow: '0 2px 26px rgba(15,26,23,.6),0 1px 3px rgba(15,26,23,.5)'
              }}
            >
              {HERO_COPY.headline.map((line) => (
                <span key={line} style={{ display: 'block' }}>
                  {line}
                </span>
              ))}
            </h1>

            {/*
              The tagline sits on the bright part of the sunset, where a 88% white at
              body weight washed out. It is now solid white, a size and a weight up,
              and carries a tight dark halo under the wider glow so the letterforms
              keep an edge whatever the photograph does behind them.
            */}
            <p
              style={{
                margin: 0,
                maxWidth: '38ch',
                fontSize: 'clamp(17px,1.6vw,22px)',
                fontWeight: 600,
                letterSpacing: '-.008em',
                lineHeight: 1.5,
                color: color.white,
                textWrap: 'pretty',
                textShadow:
                  '0 1px 2px rgba(15,26,23,.85), 0 2px 10px rgba(15,26,23,.75), 0 4px 30px rgba(15,26,23,.6)'
              }}
            >
              {HERO_COPY.body}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            // Bottom left of the fold. Never stretched: the goo pill is drawn around
            // its own width and pulls into a dumbbell if forced to fill the row.
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            marginTop: 'clamp(20px,3vh,38px)',
            animation: `riseIn .8s ${ease.out} both`
          }}
        >
          <RequestCta />
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCtaHover } from '../store/uiSlice';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, font, layout } from '../theme';
import Icon from './Icon';

const KNOB = 'clamp(50px,5.4vw,62px)';

/**
 * The hero photograph: one composite frame carrying every mode we run — air, drone,
 * sea, road and the rider — under the same sunset. It is the whole stage. There is no
 * carousel: the picture does not change and neither does the copy over it.
 *
 * `focus` is the object-position for the wide desktop crop, `focusNarrow` the one used
 * under the 980px breakpoint — a phone crops the frame horizontally instead of
 * vertically, and leans toward the road so the rider and truck survive it.
 *
 * Both anchors sit above centre so the crop keeps the top of the frame: that drops
 * the whole picture — the aircraft above all — clear of the wordmark and strapline
 * the fixed nav puts in the top-left corner, where the white fuselage was swallowing
 * them. The road, rider and truck still clear the bottom edge at this crop.
 */
export const HERO_PHOTO = {
  src: '/photos/hero-global-network.jpeg',
  alt: 'Cargo aircraft, delivery drone, container ship, motorbike courier and freight truck under one sunset, over a world map',
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
          height: '100%',
          padding: '0 clamp(24px,3vw,44px)',
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

export default function Hero() {
  const narrow = useSelector((state) => state.ui.narrow);

  return (
    <div
      id="top"
      style={{
        position: 'relative',
        // Full viewport height: the photograph is the fold, so the band underneath it
        // never shows as a strip of green below the picture. dvh rather than vh so a
        // phone measures the visible viewport instead of running under the browser
        // chrome; the floor keeps the copy from crushing on a short landscape screen.
        minHeight: 'max(100dvh,560px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: color.greenDeep
      }}
    >
      {/*
        Full bleed stage. One photograph, drawn behind everything at its own colours:
        no filter, no scale, so it renders as supplied. The copy carries its own
        shadow, and the only wash over the picture is the short one at the very top,
        below — the nav band, not the hero copy.
      */}
      <img
        src={HERO_PHOTO.src}
        alt={HERO_PHOTO.alt}
        // Above the fold, and the only thing behind the headline: never lazy.
        loading="eager"
        decoding="async"
        fetchpriority="high"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: narrow ? HERO_PHOTO.focusNarrow : HERO_PHOTO.focus
        }}
      />

      {/*
        The nav band only. The crop above moves the aircraft down the frame, and this
        carries the last of it: a short wash under the fixed nav's 80px so the wordmark
        and the strapline keep a dark ground whatever the sky does behind them. It ends
        well above the headline, which is still read straight off the photograph.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          height: '190px',
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(15,26,23,.62) 0%, rgba(15,26,23,.34) 45%, rgba(15,26,23,0) 100%)'
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          flex: 1,
          width: '100%',
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `calc(80px + clamp(18px,4vh,40px)) ${layout.gutter} clamp(28px,5vh,56px)`,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/*
          The copy takes every row the CTA leaves, which parks the CTA on the bottom
          padding edge without the words having to move with it. On a phone the
          subjects sit across the middle of the crop, so the copy drops to the foot of
          that space rather than landing on top of them.
        */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: narrow ? 'flex-end' : 'center'
          }}
        >
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

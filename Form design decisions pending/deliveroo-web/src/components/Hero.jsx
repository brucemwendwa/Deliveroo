import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCtaHover } from '../store/uiSlice';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import useHover from '../hooks/useHover';
import useReducedMotion from '../hooks/useReducedMotion';
import { TRANSPORT } from '../lib/transport';
import { color, ease, eyebrow, font, layout, radius } from '../theme';
import Icon from './Icon';
import TransportGlyph from './transport/TransportGlyph';

const KNOB = 'clamp(50px,5.4vw,62px)';

/** How long each slide holds, and how long the crossfade between two of them takes. */
export const SLIDE_MS = 6000;
const FADE_MS = 1100;

/** "Explore delivery options" goes to the multi-modal band, which is that list. */
const MODES_PATH = '/#modes';

/**
 * The five hero slides, in the order they play. `focus` is the object-position used
 * on the wide desktop crop, `focusNarrow` the one used under the 980px breakpoint —
 * a phone crops the photo horizontally instead of vertically, and each subject needs
 * its own anchor to survive that. Nothing here is derived from the transport
 * catalogue on purpose: this is hero copy, not the modes the pricing knows about.
 *
 * Two optional fields: `align: 'right'` moves the copy to the other side of the frame
 * on desktop (the motorbike and truck photos put their subject under the usual text
 * column, and there is no horizontal slack to crop it out of the way), and `meta` adds
 * the small glass chip of at-a-glance facts under the copy.
 */
export const HERO_SLIDES = [
  {
    id: 'DRONE',
    label: 'Drone Delivery',
    tab: 'Drone',
    headline: ['The future of', 'delivery is here'],
    copy: 'Fast, intelligent delivery for a connected world.',
    photo: '/photos/hero-drone-city.jpeg',
    alt: 'Delivery drone carrying a parcel above a city skyline at sunset',
    focus: '50% 44%',
    focusNarrow: '50% 36%'
  },
  {
    id: 'MOTORBIKE',
    label: 'Motorbike Delivery',
    tab: 'Moto',
    headline: ['Fast. Local.', 'At your door.'],
    copy: 'Need it delivered across town? Request a rider and we’ll come straight to you.',
    photo: '/photos/hero-motorbike-city.jpeg',
    alt: 'Deliveroo rider carrying a delivery box on a motorbike, heading into the city at sunset',
    // The rider sits left of centre and cannot be cropped aside, so the copy moves
    // instead; on a phone the crop is horizontal and is anchored on him.
    align: 'right',
    focus: '50% 58%',
    focusNarrow: '28% 50%',
    mode: TRANSPORT.MOTORBIKE,
    meta: ['Fast local delivery', 'ETA ~20–40 min']
  },
  {
    id: 'ROAD',
    label: 'Road Delivery',
    tab: 'Road',
    headline: ['Every parcel.', 'Every route.'],
    copy: 'Vans and trucks on the road network — door to door, town to town.',
    photo: '/photos/hero-truck-sunset.jpeg',
    alt: 'Freight truck on an open road at sunset',
    // The trailer fills the left half of the frame and the desktop crop is vertical,
    // so it cannot be moved aside; the copy takes the other side instead. On a phone
    // the crop is horizontal and is anchored on the truck.
    align: 'right',
    focus: '50% 66%',
    focusNarrow: '34% 50%'
  },
  {
    id: 'AIR',
    label: 'Air Delivery',
    tab: 'Air',
    headline: ['When speed', 'matters.'],
    copy: 'Get your parcels where they need to be, faster.',
    photo: '/photos/hero-air-freight.jpeg',
    alt: 'Cargo aircraft taking off over palletised freight at an airport',
    focus: '50% 50%',
    focusNarrow: '50% 42%'
  },
  {
    id: 'SHIP',
    label: 'Sea Delivery',
    tab: 'Sea',
    headline: ['Move more.', 'Go further.'],
    copy: 'Reliable shipping for larger and long-distance deliveries.',
    photo: '/photos/hero-ship-ocean.jpeg',
    alt: 'Container ship loaded with freight crossing the ocean at sunrise',
    focus: '50% 56%',
    focusNarrow: '52% 52%'
  }
];

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
          filter: 'url(#ctaGoo) drop-shadow(0 13px 18px rgba(17,17,17,.4))'
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
          fontWeight: 700,
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

/** Glass outline against the photo — the quiet half of the pair. */
function ExploreCta() {
  const [hovered, bind] = useHover();

  return (
    <Link
      to={MODES_PATH}
      {...bind}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        height: KNOB,
        padding: '0 clamp(22px,2.6vw,34px)',
        borderRadius: radius.pill,
        border: `1.5px solid ${hovered ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.42)'}`,
        background: hovered ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.09)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: color.white,
        fontSize: 'clamp(14px,1.15vw,16.5px)',
        fontWeight: 700,
        letterSpacing: '-.01em',
        whiteSpace: 'nowrap',
        transition: 'background .25s, border-color .25s'
      }}
    >
      Explore Delivery Options
      <Icon name="arrow_downward" size="clamp(17px,1.5vw,20px)" />
    </Link>
  );
}

/** One indicator: the mode name over a rule that fills while its slide is running. */
function SlideTab({ slide, index, active, paused, onSelect }) {
  const [hovered, bind] = useHover();

  return (
    <button
      type="button"
      {...bind}
      onClick={() => onSelect(index)}
      aria-label={`Show slide ${index + 1} of ${HERO_SLIDES.length}: ${slide.label}`}
      aria-current={active ? 'true' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        padding: 0,
        border: 0,
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left'
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 'clamp(9.5px,.85vw,11px)',
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: active || hovered ? color.white : 'rgba(255,255,255,.62)',
          textShadow: '0 1px 8px rgba(10,10,10,.8)',
          transition: 'color .3s'
        }}
      >
        {slide.tab}
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          display: 'block',
          width: 'clamp(46px,7vw,92px)',
          height: '2px',
          borderRadius: '2px',
          overflow: 'hidden',
          background: active || hovered ? 'rgba(255,255,255,.46)' : 'rgba(255,255,255,.24)',
          transition: 'background .3s'
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '2px',
            background: color.orange,
            transformOrigin: 'left center',
            transform: active ? undefined : 'scaleX(0)',
            // Longhand rather than the `animation` shorthand: React warns when a
            // shorthand and one of its longhands change in the same style object.
            animationName: active ? 'heroProgress' : 'none',
            animationDuration: `${SLIDE_MS}ms`,
            animationTimingFunction: 'linear',
            animationFillMode: 'both',
            animationPlayState: paused ? 'paused' : 'running'
          }}
        />
      </span>
    </button>
  );
}

/** Prev / next. Subordinate to the indicators by design — small, glass, no fill. */
function ArrowButton({ icon, label, onClick }) {
  const [hovered, bind] = useHover();

  return (
    <button
      type="button"
      {...bind}
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        borderRadius: radius.pill,
        border: `1px solid ${hovered ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.3)'}`,
        background: hovered ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.09)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: color.white,
        cursor: 'pointer',
        transition: 'background .25s, border-color .25s'
      }}
    >
      <Icon name={icon} size={20} color={color.white} />
    </button>
  );
}

export default function Hero() {
  const narrow = useSelector((state) => state.ui.narrow);
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [hidden, setHidden] = useState(false);
  const touchStart = useRef(null);
  const slide = HERO_SLIDES[index];
  // A slide can ask for the other side of the frame; a phone ignores it, because the
  // copy is already at the bottom edge there and the crop is anchored on the subject.
  const alignRight = slide.align === 'right' && !narrow;

  // The carousel holds while it is being read (pointer or keyboard), while the tab is
  // in the background, and for anyone who asked for less movement.
  const paused = engaged || hidden || reducedMotion;

  const go = useCallback((next) => {
    setIndex((next + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, paused]);

  useEffect(() => {
    const sync = () => setHidden(Boolean(document.hidden));
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') go(index - 1);
    if (event.key === 'ArrowRight') go(index + 1);
  };

  // Phones get the same gesture the indicators give a mouse.
  const onTouchStart = (event) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    const from = touchStart.current;
    touchStart.current = null;
    if (from == null) return;
    const travel = (event.changedTouches[0]?.clientX ?? from) - from;
    if (Math.abs(travel) > 45) go(travel < 0 ? index + 1 : index - 1);
  };

  return (
    <div
      id="top"
      role="region"
      aria-roledescription="carousel"
      aria-label="Deliveroo delivery modes"
      onMouseEnter={() => setEngaged(true)}
      onMouseLeave={() => setEngaged(false)}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={() => setEngaged(false)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'relative',
        minHeight: 'clamp(560px,82vh,750px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: color.black
      }}
    >
      {/*
        Full-bleed stage. Every slide is a layer of its own at inset 0 so the photos
        crossfade in place — no sliding, nothing to reflow — and the photo itself is a
        plain object-fit:cover image, drawn untouched: no scrim, no filter, no scale,
        so it renders exactly as supplied. The copy carries its own text-shadow.
      */}
      {HERO_SLIDES.map((item, position) => {
        const active = position === index;
        return (
          <div
            key={item.id}
            aria-hidden={!active}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: active ? 2 : 1,
              opacity: active ? 1 : 0,
              overflow: 'hidden',
              transition: `opacity ${FADE_MS}ms ${ease.out}`,
              willChange: 'opacity'
            }}
          >
            <img
              src={item.photo}
              alt={active ? item.alt : ''}
              // Every slide loads up front: they are all above the fold, and a lazy
              // one would hand its turn a blank frame.
              loading="eager"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: narrow ? item.focusNarrow : item.focus
              }}
            />
          </div>
        );
      })}

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          flex: 1,
          width: '100%',
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `calc(80px + clamp(18px,4vh,40px)) ${layout.gutter} clamp(14px,2vh,26px)`,
          display: 'flex',
          flexDirection: 'column',
          // On a phone the subject sits in the upper half of the crop, so the copy
          // drops to the bottom edge rather than landing on top of it.
          justifyContent: narrow ? 'flex-end' : 'center'
        }}
      >
        {/* Keyed on the slide so the copy re-enters with it instead of swapping words. */}
        <div
          key={slide.id}
          style={{
            width: '100%',
            maxWidth: '600px',
            marginLeft: alignRight ? 'auto' : 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(16px,2.1vw,26px)',
            animation: `riseIn .8s ${ease.out} both`
          }}
        >
          <div
            style={{
              ...eyebrow,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              letterSpacing: '.2em',
              color: 'rgba(255,255,255,.88)'
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 'clamp(22px,3vw,38px)', height: '2px', borderRadius: '2px', background: color.orange }}
            />
            {slide.label}
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: font.display,
              fontWeight: 700,
              fontSize: 'clamp(33px,5.1vw,66px)',
              lineHeight: 0.97,
              letterSpacing: '-.022em',
              textTransform: 'uppercase',
              color: color.white,
              textShadow: '0 2px 26px rgba(10,10,10,.6),0 1px 3px rgba(10,10,10,.5)'
            }}
          >
            {slide.headline.map((line) => (
              <span key={line} style={{ display: 'block' }}>
                {line}
              </span>
            ))}
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: '38ch',
              fontSize: 'clamp(16px,1.45vw,20px)',
              lineHeight: 1.55,
              color: 'rgba(255,255,255,.88)',
              textWrap: 'pretty',
              textShadow: '0 2px 16px rgba(10,10,10,.7)'
            }}
          >
            {slide.copy}
          </p>

          {slide.meta && (
            <div
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                alignItems: 'center',
                // Wraps between facts, never inside one — a phone gets two tidy lines
                // rather than "Fast local / delivery".
                flexWrap: 'wrap',
                gap: '6px 10px',
                padding: '9px 16px 9px 13px',
                borderRadius: radius.pill,
                border: '1px solid rgba(255,255,255,.28)',
                background: 'rgba(10,10,10,.34)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                fontSize: 'clamp(11.5px,1.1vw,14px)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                color: 'rgba(255,255,255,.86)'
              }}
            >
              {slide.mode && <TransportGlyph mode={slide.mode} size={19} color={color.orange} />}
              <span style={{ fontWeight: 700, color: color.white }}>{slide.label.replace(' Delivery', '')}</span>
              {slide.meta.map((fact) => (
                <span key={fact} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    aria-hidden="true"
                    style={{ width: '3px', height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,.45)' }}
                  />
                  {fact}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: narrow ? 'column' : 'row',
              // Stacked, not stretched: the goo pill is drawn around its own width and
              // pulls into a dumbbell if it is forced to fill the column.
              alignItems: 'flex-start',
              gap: 'clamp(12px,1.4vw,18px)',
              marginTop: 'clamp(2px,1vw,10px)'
            }}
          >
            <RequestCta />
            <ExploreCta />
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          width: '100%',
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `0 ${layout.gutter} clamp(20px,3.2vh,38px)`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'clamp(14px,3vw,32px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(10px,1.8vw,22px)' }}>
          {HERO_SLIDES.map((item, position) => (
            <SlideTab
              key={item.id}
              slide={item}
              index={position}
              active={position === index}
              paused={paused}
              onSelect={go}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px,1.4vw,16px)' }}>
          <span
            aria-hidden="true"
            style={{
              fontFamily: font.mono,
              fontSize: 'clamp(12px,1.1vw,13.5px)',
              letterSpacing: '.14em',
              color: 'rgba(255,255,255,.62)',
              textShadow: '0 1px 8px rgba(10,10,10,.8)'
            }}
          >
            <span style={{ color: color.white, fontWeight: 700 }}>{String(index + 1).padStart(2, '0')}</span>
            {` / ${String(HERO_SLIDES.length).padStart(2, '0')}`}
          </span>
          {!narrow && (
            <>
              <ArrowButton icon="arrow_back" label="Previous slide" onClick={() => go(index - 1)} />
              <ArrowButton icon="arrow_forward" label="Next slide" onClick={() => go(index + 1)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

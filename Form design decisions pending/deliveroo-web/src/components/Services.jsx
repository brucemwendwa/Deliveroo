import { Link } from 'react-router-dom';
import useHover from '../hooks/useHover';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, eyebrow, font, layout, radius } from '../theme';
import Icon from './Icon';

// §4 — one feature service carries the photography, the rest are editorial rows.
// Deliberately not four matching cards: the asymmetry is what stops this reading as
// a template, and it keeps a single strong image instead of four competing ones.
const FEATURE = {
  number: '01',
  icon: 'bolt',
  title: 'Same-Day Delivery',
  copy: 'Fast door-to-door delivery for packages that cannot wait.',
  photo: 'https://images.pexels.com/photos/6869065/pexels-photo-6869065.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200',
  alt: 'Courier handing over a parcel at a doorstep'
};

const SERVICES = [
  {
    number: '02',
    icon: 'storefront',
    title: 'Business Delivery',
    copy: 'Reliable courier solutions for businesses, shops and growing brands.'
  },
  {
    number: '03',
    icon: 'inventory_2',
    title: 'Bulk & Package Delivery',
    copy: 'Safe transportation for larger or multiple packages.'
  },
  {
    number: '04',
    icon: 'bolt',
    title: 'Express Courier',
    copy: 'Priority delivery for time-sensitive packages.'
  }
];

const numeral = {
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '.16em',
  color: color.muted
};

function FeatureService() {
  const [hovered, bind] = useHover();
  const startBooking = useStartBooking();
  return (
    <Link
      to={BOOKING_PATH}
      onClick={startBooking}
      {...bind}
      data-reveal=""
      style={{
        position: 'relative',
        flex: '1 1 460px',
        minWidth: 'min(100%,300px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        minHeight: 'clamp(380px,44vw,540px)',
        padding: 'clamp(22px,2.6vw,34px)',
        borderRadius: radius.card,
        overflow: 'hidden',
        background: color.paperWarm,
        color: color.white
      }}
    >
      <img
        src={FEATURE.photo}
        alt={FEATURE.alt}
        loading="lazy"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
          transition: `transform .9s ${ease.out}`
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(17,17,17,.88) 0%, rgba(17,17,17,.35) 45%, rgba(17,17,17,.05) 100%)'
        }}
      />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ ...numeral, color: 'rgba(255,255,255,.7)' }}>{FEATURE.number}</span>
        <Icon name={FEATURE.icon} size={19} color={color.orange} />
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 10px',
              fontFamily: font.display,
              fontWeight: 700,
              fontSize: 'clamp(30px,3.6vw,50px)',
              lineHeight: 0.98,
              textTransform: 'uppercase',
              letterSpacing: '.005em',
              transform: hovered ? 'translateX(4px)' : 'none',
              transition: `transform .5s ${ease.out}`
            }}
          >
            {FEATURE.title}
          </h3>
          <p style={{ margin: 0, maxWidth: '34ch', fontSize: '15.5px', lineHeight: 1.55, color: 'rgba(255,255,255,.78)', textWrap: 'pretty' }}>
            {FEATURE.copy}
          </p>
        </div>
        <span
          aria-hidden="true"
          style={{
            flex: 'none',
            width: '52px',
            height: '52px',
            borderRadius: radius.pill,
            background: color.orange,
            color: color.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: hovered ? 'translate(4px,-4px)' : 'none',
            transition: `transform .5s ${ease.out}`
          }}
        >
          <Icon name="arrow_outward" size={22} />
        </span>
      </div>
    </Link>
  );
}

function ServiceRow({ service, delay }) {
  const [hovered, bind] = useHover();
  const startBooking = useStartBooking();
  return (
    <Link
      to={BOOKING_PATH}
      onClick={startBooking}
      {...bind}
      data-reveal=""
      data-reveal-delay={delay}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'clamp(14px,2vw,24px)',
        padding: 'clamp(20px,2.4vw,30px) 0',
        borderTop: `1px solid ${hovered ? 'rgba(17,17,17,.32)' : 'rgba(17,17,17,.13)'}`,
        transition: 'border-color .32s',
        color: color.ink
      }}
    >
      <span style={{ ...numeral, paddingTop: '7px', flex: 'none' }}>{service.number}</span>
      <Icon name={service.icon} size={21} color={color.ink} style={{ flex: 'none', paddingTop: '3px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            margin: '0 0 6px',
            fontSize: 'clamp(19px,1.9vw,25px)',
            fontWeight: 800,
            letterSpacing: '-.028em',
            color: color.ink,
            transform: hovered ? 'translateX(4px)' : 'none',
            transition: `transform .4s ${ease.out}`
          }}
        >
          {service.title}
        </h3>
        <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.55, color: color.body, textWrap: 'pretty' }}>
          {service.copy}
        </p>
      </div>
      <Icon
        name="arrow_outward"
        size={20}
        color={hovered ? color.orange : color.muted}
        style={{
          flex: 'none',
          paddingTop: '4px',
          transform: hovered ? 'translate(4px,-4px)' : 'none',
          transition: `transform .4s ${ease.out}, color .3s`
        }}
      />
    </Link>
  );
}

export default function Services() {
  return (
    <section id="services" style={{ padding: 'clamp(76px,9vw,140px) 0' }}>
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `0 ${layout.gutter}` }}>
        <div style={{ marginBottom: 'clamp(40px,5vw,72px)', maxWidth: '760px' }}>
          <div style={{ ...eyebrow, marginBottom: '18px' }}>Services</div>
          <h2
            data-reveal=""
            style={{
              margin: '0 0 20px',
              fontFamily: font.display,
              fontWeight: 700,
              fontSize: 'clamp(38px,6.6vw,104px)',
              lineHeight: 0.9,
              letterSpacing: '-.015em',
              textTransform: 'uppercase',
              color: color.ink
            }}
          >
            We move what matters.
          </h2>
          <p
            data-reveal=""
            data-reveal-delay="80ms"
            style={{ margin: 0, maxWidth: '52ch', fontSize: 'clamp(15.5px,1.4vw,18px)', lineHeight: 1.6, color: color.body, textWrap: 'pretty' }}
          >
            Simple, reliable courier services built around speed, transparency and complete control.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,3.4vw,56px)', alignItems: 'stretch' }}>
          <FeatureService />
          <div style={{ flex: '1 1 380px', minWidth: 'min(100%,280px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {SERVICES.map((service, index) => (
              <ServiceRow key={service.number} service={service} delay={`${80 + index * 80}ms`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

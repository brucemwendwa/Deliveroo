import { Link } from 'react-router-dom';
import useHover from '../hooks/useHover';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, eyebrow, font, layout, radius } from '../theme';
import Icon from './Icon';

// §4 — four equal photo cards. Each service carries its own image so the grid reads
// as a catalogue rather than one hero plus a list of runners-up. Photos are the local
// mode shots, mapped to the service that actually uses that vehicle.
const SERVICES = [
  {
    number: '01',
    icon: 'bolt',
    title: 'Same-Day Delivery',
    copy: 'Fast door-to-door delivery for packages that cannot wait.',
    photo: '/photos/hero-motorbike-city.jpeg',
    alt: 'Rider on a motorbike carrying a delivery box through city traffic'
  },
  {
    number: '02',
    icon: 'storefront',
    title: 'Business Delivery',
    copy: 'Reliable courier solutions for businesses, shops and growing brands.',
    photo: '/photos/hero-truck-sunset.jpeg',
    alt: 'Delivery truck on the road at sunset'
  },
  {
    number: '03',
    icon: 'inventory_2',
    title: 'Bulk & Package Delivery',
    copy: 'Safe transportation for larger or multiple packages.',
    photo: '/photos/hero-ship-ocean.jpeg',
    alt: 'Container ship carrying freight across open water'
  },
  {
    number: '04',
    icon: 'bolt',
    title: 'Express Courier',
    copy: 'Priority delivery for time-sensitive packages.',
    photo: '/photos/hero-air-freight.jpeg',
    alt: 'Cargo aircraft being loaded for an air freight run'
  }
];

const numeral = {
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '.16em',
  color: color.muted
};

const restShadow = '0 1px 2px rgba(17,17,17,.05), 0 14px 28px -22px rgba(17,17,17,.4)';
const liftShadow = '0 2px 4px rgba(17,17,17,.05), 0 30px 50px -30px rgba(17,17,17,.45)';

function ServiceCard({ service, delay }) {
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
        flexDirection: 'column',
        borderRadius: radius.card,
        overflow: 'hidden',
        background: color.white,
        color: color.ink,
        boxShadow: hovered ? liftShadow : restShadow,
        transform: hovered ? 'translateY(-6px)' : 'none',
        transition: `transform .4s ${ease.out}, box-shadow .4s ${ease.out}`
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '16 / 11', overflow: 'hidden', background: color.paperWarm }}>
        <img
          src={service.photo}
          alt={service.alt}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
            transition: `transform .9s ${ease.out}`
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(18px,1.9vw,26px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Icon name={service.icon} size={20} color={color.ink} />
          <span style={numeral}>{service.number}</span>
          <Icon
            name="arrow_outward"
            size={18}
            color={hovered ? color.orange : 'rgba(17,17,17,.22)'}
            style={{
              marginLeft: 'auto',
              transform: hovered ? 'translate(3px,-3px)' : 'none',
              transition: `transform .4s ${ease.out}, color .3s`
            }}
          />
        </div>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 'clamp(19px,1.7vw,23px)',
            fontWeight: 800,
            letterSpacing: '-.028em',
            lineHeight: 1.15,
            color: color.ink
          }}
        >
          {service.title}
        </h3>
        <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.55, color: color.body, textWrap: 'pretty' }}>
          {service.copy}
        </p>
      </div>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))',
            gap: 'clamp(18px,2.2vw,28px)',
            alignItems: 'stretch'
          }}
        >
          {SERVICES.map((service, index) => (
            <ServiceCard key={service.number} service={service} delay={`${80 + index * 80}ms`} />
          ))}
        </div>
      </div>
    </section>
  );
}

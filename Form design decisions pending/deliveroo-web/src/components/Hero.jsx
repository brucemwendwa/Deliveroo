import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCtaHover } from '../store/uiSlice';
import useStartBooking, { BOOKING_PATH } from '../hooks/useStartBooking';
import { color, ease, layout } from '../theme';
import WorldMap from './WorldMap';
import Icon from './Icon';

const KNOB = 'clamp(50px,5.4vw,62px)';

const pin = {
  position: 'absolute',
  transform: 'translate(-50%,-50%)',
  width: 'clamp(34px,4.3vw,48px)',
  height: 'clamp(34px,4.3vw,48px)',
  borderRadius: '999px',
  background: color.white,
  border: `2px solid ${color.orange}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 10px 20px -12px rgba(17,17,17,.55)'
};

const MAP_PINS = [
  { icon: 'directions_boat', left: '28%', top: '48%' },
  { icon: 'local_shipping', left: '78%', top: '30%' },
  { icon: 'flight', left: '55%', top: '62%' }
];

export default function Hero() {
  const dispatch = useDispatch();
  const ctaHover = useSelector((state) => state.ui.ctaHover);
  const startBooking = useStartBooking();

  return (
    <div
      id="top"
      style={{
        position: 'relative',
        minHeight: 'clamp(640px,100vh,1040px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: color.ink
      }}
    >
      {/*
        The photo sits in a stage that emulates object-fit:cover while staying
        addressable in image coordinates (so overlays can be pinned to features
        in the photo). width/height come from the image's own 1.5 aspect ratio;
        the negative margin anchors the crop on the truck (27% across the frame)
        instead of the left edge, which keeps it framed on phone widths.
      */}
      <div
        data-parallax="0.015"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '-8%',
          height: '116%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          containerType: 'size',
          willChange: 'transform'
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '0 0 auto',
            width: 'max(100cqw,150cqh)',
            height: 'max(100cqh,calc(100cqw / 1.5))',
            marginLeft:
              'calc(0px - clamp(0px,calc(max(100cqw,150cqh) * 0.27 - 50cqw),calc(max(100cqw,150cqh) - 100cqw)))'
          }}
        >
          <img
            src="/photos/hero-truck-sunset.jpeg"
            alt="Freight truck on an open road at sunset"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(1.06) contrast(1.02)'
            }}
          />
        </div>
      </div>

      <div
        style={{
          order: 2,
          position: 'relative',
          zIndex: 5,
          width: '100%',
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `0 ${layout.gutter} clamp(26px,4vh,50px)`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'clamp(18px,2.5vw,36px)'
        }}
      >
        <p
          style={{
            margin: 0,
            flex: '1 1 320px',
            maxWidth: '40ch',
            fontSize: 'clamp(17px,1.55vw,23px)',
            lineHeight: 1.5,
            color: color.white,
            textWrap: 'pretty',
            textShadow: '0 2px 16px rgba(17,17,17,.8),0 1px 3px rgba(17,17,17,.65)'
          }}
        >
          Book a rider in under a minute, watch every handover live, and know the exact hour your parcel lands.
        </p>

        <Link
          to={BOOKING_PATH}
          aria-label="Send a package"
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
              padding: '0 clamp(28px,3.4vw,52px)',
              fontSize: 'clamp(14px,1.15vw,16.5px)',
              fontWeight: 700,
              letterSpacing: '-.01em',
              whiteSpace: 'nowrap'
            }}
          >
            Send a Package
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
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `clamp(108px,13vh,160px) ${layout.gutter} clamp(18px,3vh,38px)`
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,350px),1fr))',
            gap: 'clamp(30px,4.5vw,66px)',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 'clamp(26px,3.6vw,46px)',
              width: 'min(100%,660px)',
              marginLeft: 'auto'
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(26px,3.3vw,52px)',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-.036em',
                textAlign: 'right',
                color: color.white,
                textShadow: '0 2px 22px rgba(17,17,17,.85),0 1px 3px rgba(17,17,17,.7)'
              }}
            >
              <span style={{ display: 'block' }}>Same-day couriers</span>
              <span style={{ display: 'block', marginRight: 'clamp(12px,3vw,44px)' }}>door to door</span>
              <span style={{ display: 'block', marginRight: 'clamp(5px,1.3vw,20px)' }}>tracked every mile</span>
            </h1>

            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 'clamp(320px,44vw,620px)',
                marginLeft: 'auto',
                transform: 'translateX(clamp(8px,2.4vw,44px))'
              }}
            >
              <WorldMap />
              {MAP_PINS.map((item) => (
                <div key={item.icon} style={{ ...pin, left: item.left, top: item.top }}>
                  <Icon name={item.icon} size="clamp(17px,2vw,23px)" color={color.ink} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

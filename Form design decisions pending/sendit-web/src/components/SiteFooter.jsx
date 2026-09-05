import { Link } from 'react-router-dom';
import { color, font, hover, layout, radius } from '../theme';
import HoverLink from './HoverLink';
import SocialIcon, { SOCIAL_NETWORKS } from './SocialIcon';
import Wordmark from './Wordmark';

// §20. Four columns under a closing line, nothing more.
const COLUMNS = [
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/#services' },
      { label: 'Services', to: '/#services' },
      { label: 'Contact', to: '/#footer' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', to: '/#footer' },
      { label: 'Track Delivery', to: '/track' },
      { label: 'Terms', to: '/#footer' },
      { label: 'Privacy', to: '/#footer' }
    ]
  }
];

const colTitle = {
  fontFamily: font.mono,
  fontSize: '10.5px',
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: color.orange,
  marginBottom: '18px'
};

const footLink = { fontSize: '14.5px', color: 'rgba(243,243,241,.7)' };

export default function SiteFooter({ brand = 'Send it' }) {
  return (
    <footer id="footer" style={{ background: color.greenDeep, padding: 'clamp(64px,7vw,104px) 0 34px' }}>
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `0 ${layout.gutter}` }}>
        <h2
          data-reveal=""
          style={{
            margin: '0 0 clamp(48px,6vw,86px)',
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: 'clamp(38px,7.4vw,116px)',
            lineHeight: 1.04,
            letterSpacing: '-.025em',
            color: color.paper,
            maxWidth: '14ch'
          }}
        >
          Wherever it needs to go, <span style={{ color: color.orange }}>we&apos;ll get it there.</span>
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px,4vw,72px)' }}>
          <div style={{ flex: '1 1 240px', maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '18px' }}>
              <Wordmark fontSize="25px" tone={color.paper} shadow={false} dot />
            </div>
            <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: 'rgba(243,243,241,.55)', textWrap: 'pretty' }}>
              Same day courier delivery, door to door, tracked every mile.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} style={{ flex: '1 1 140px' }}>
              <div style={colTitle}>{column.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {column.links.map((link) => (
                  <HoverLink key={link.label} as={Link} to={link.to} style={footLink} hoverStyle={hover.foot}>
                    {link.label}
                  </HoverLink>
                ))}
              </div>
            </div>
          ))}

          <div style={{ flex: '1 1 170px' }}>
            <div style={colTitle}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <HoverLink href="tel:+254700000000" style={footLink} hoverStyle={hover.foot}>
                +254 700 000 000
              </HoverLink>
              <HoverLink href="mailto:hello@sendit.co" style={footLink} hoverStyle={hover.foot}>
                hello@sendit.co
              </HoverLink>
              <span style={{ fontSize: '14.5px', color: 'rgba(243,243,241,.5)', lineHeight: 1.5 }}>
                Westlands
                <br />
                Nairobi, Kenya
              </span>
            </div>
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <div style={colTitle}>Social</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
              {SOCIAL_NETWORKS.map((social) => (
                <HoverLink
                  key={social.id}
                  href="#footer"
                  aria-label={social.label}
                  hoverStyle={hover.social}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: radius.pill,
                    border: '1px solid rgba(243,243,241,.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(243,243,241,.75)',
                    transition: 'background .2s, color .2s'
                  }}
                >
                  <SocialIcon network={social.id} size={18} />
                </HoverLink>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
            marginTop: 'clamp(48px,6vw,80px)',
            paddingTop: '26px',
            borderTop: '1px solid rgba(243,243,241,.14)'
          }}
        >
          <span style={{ fontFamily: font.mono, fontSize: '11.5px', letterSpacing: '.06em', color: 'rgba(243,243,241,.45)' }}>
            © 2026 {brand}. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}

// Single source of truth for the values repeated across the inline styles.
export const color = {
  // Text.
  ink: '#1C201F',
  inkSoft: '#1C201F',
  body: '#5A605C',
  // The brief's secondary grey is #737873; at body size on the card and content
  // grounds that lands at 4.3:1 and 4.1:1, under the 4.5:1 §24 holds itself to.
  // Two steps darker is indistinguishable side by side and clears AA on both.
  muted: '#6B706B',

  // Surfaces, lightest content plane inward.
  paper: '#F3F3F1',
  paperWarm: '#C8D1D1',
  card: '#FAFAF8',
  white: '#FFFFFF',

  // Lines. `border` is the drawn hairline; `borderSoft` is the same line at the
  // 80% the card recipe asks for, so a card edge never reads harder than the
  // shadow sitting under it.
  border: '#D9DEDA',
  borderSoft: 'rgba(217,222,218,.8)',

  // Greens carry every dark surface — bands, footer, filled buttons, toasts.
  green: '#244B42',
  greenDeep: '#163D36',
  sage: '#AAB5AA',
  lime: '#B4C66A',

  // Orange is the highlight, not a second brand colour: CTAs, key figures and
  // the feature sections only.
  orange: '#F88735',
  orangeLight: '#FFA45C',
  // Carries error text, so it is set from the same contrast floor rather than
  // from the orange ramp: #C4611C would read at 4.0:1 on a card.
  orangeDeep: '#AD5415',

  black: '#0F1A17'
};

export const font = {
  // §Typography: one face across the whole product. `display`, `mono` and `brand`
  // stay as separate entries so a heading, a figure or the logo can be retyped
  // later without dragging the other two with it — today they all resolve to Inter.
  display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  icon: "'Material Symbols Rounded'",
  brand: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
};

export const ease = {
  out: 'cubic-bezier(.16,1,.3,1)',
  spring: 'cubic-bezier(.34,1.5,.5,1)'
};

export const layout = {
  maxWidth: '1320px',
  gutter: 'clamp(20px,4vw,56px)'
};

/**
 * Two elevations, both very soft. `card` is the resting state of any raised
 * surface, `lift` is the same surface under the cursor — the pair is what keeps
 * the hover from reading as a jump.
 */
export const shadow = {
  card: '0 10px 30px rgba(30,40,40,.05)',
  lift: '0 14px 35px rgba(30,40,40,.08)',
  raised: '0 18px 44px rgba(30,40,40,.1)'
};

// Hover style objects, shared by several sections. Every one of them is the same
// gesture at a different weight: rise 2px, deepen the shadow, nothing else.
export const hover = {
  link: { color: color.orange },
  yellow: { transform: 'translateY(-2px)', boxShadow: '0 14px 35px rgba(248,135,53,.28)' },
  dark: { transform: 'translateY(-2px)', boxShadow: '0 14px 35px rgba(22,61,54,.28)' },
  ghost: { borderColor: color.sage, background: 'rgba(36,75,66,.05)' },
  yellowGhost: { borderColor: color.green, background: 'rgba(36,75,66,.07)' },
  card: {
    transform: 'translateY(-2px)',
    boxShadow: shadow.lift,
    borderColor: color.sage
  },
  drop: { background: 'rgba(248,135,53,.14)', color: color.ink },
  social: { background: color.orange, color: color.white, borderColor: color.orange },
  foot: { color: color.orange }
};

// §3 keeps the palette closed, so order statuses reuse the colors above rather
// than introducing a traffic-light set of their own.
export const statusTone = {
  PENDING: color.muted,
  ASSIGNED: color.orange,
  PICKED_UP: color.orange,
  IN_TRANSIT: color.orangeDeep,
  DELIVERED: color.green,
  CANCELLED: color.body
};

export const radius = {
  field: '16px',
  card: '24px',
  cardLarge: '28px',
  pill: '999px'
};

/**
 * The raised-surface recipe, in one object. Cards across booking, tracking, orders
 * and the portal spread this rather than restating a radius, a hairline and a
 * shadow that would drift apart the moment one of them changed.
 */
export const surface = {
  card: {
    borderRadius: radius.card,
    border: `1px solid ${color.borderSoft}`,
    background: color.card,
    boxShadow: shadow.card,
    transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease'
  },
  panel: {
    borderRadius: radius.cardLarge,
    border: `1px solid ${color.borderSoft}`,
    background: color.card,
    boxShadow: shadow.card
  }
};

// Form controls repeat across booking, auth and admin. They live here for the same
// reason the hover objects do: one place to change them.
export const control = {
  field: {
    width: '100%',
    height: '56px',
    padding: '0 18px',
    borderRadius: radius.field,
    border: `1px solid ${color.border}`,
    background: color.white,
    fontFamily: font.body,
    fontSize: '16px',
    fontWeight: 400,
    color: color.ink,
    outline: 'none',
    transition: 'border-color .2s ease, box-shadow .2s ease'
  },
  fieldFocus: {
    borderColor: color.green,
    boxShadow: '0 0 0 3px rgba(36,75,66,.12)'
  },
  fieldInvalid: {
    borderColor: color.orangeDeep,
    boxShadow: '0 0 0 3px rgba(173,84,21,.14)'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: color.muted
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '46px',
    padding: '0 20px',
    borderRadius: radius.pill,
    border: `1px solid ${color.border}`,
    background: color.card,
    fontFamily: font.body,
    fontSize: '15px',
    fontWeight: 500,
    color: color.ink,
    cursor: 'pointer',
    transition: 'border-color .2s ease, background .2s ease, color .2s ease'
  },
  chipActive: {
    borderColor: color.green,
    background: color.green,
    color: color.paper
  },
  // §24: focus must be visible on every interactive element, including dark surfaces.
  focusRing: {
    outline: `2px solid ${color.orange}`,
    outlineOffset: '2px'
  }
};

export const eyebrow = {
  fontFamily: font.mono,
  fontSize: '11.5px',
  fontWeight: 500,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: color.muted
};

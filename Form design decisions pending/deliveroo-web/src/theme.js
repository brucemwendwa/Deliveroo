// Single source of truth for the values repeated across the inline styles.
export const color = {
  ink: '#141414',
  inkSoft: '#101820',
  body: '#4A5A61',
  muted: '#6E6862',
  paper: '#F3F1ED',
  paperWarm: '#E6E2DC',
  white: '#FFFFFF',
  orange: '#F5911E',
  orangeDeep: '#C4700F',
  black: '#0A0A0A'
};

export const font = {
  display: "'Space Grotesk', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
  icon: "'Material Symbols Rounded'",
  /**
   * The wordmark only. It shares a face with `display` today, but stays its own
   * entry so the logo can be retyped without dragging every heading with it.
   */
  brand: "'Space Grotesk', system-ui, sans-serif"
};

export const ease = {
  out: 'cubic-bezier(.16,1,.3,1)',
  spring: 'cubic-bezier(.34,1.5,.5,1)'
};

export const layout = {
  maxWidth: '1320px',
  gutter: 'clamp(20px,4vw,56px)'
};

// Hover style objects, shared by several sections.
export const hover = {
  link: { color: color.orange },
  yellow: { transform: 'translateY(-2px)', boxShadow: '0 16px 30px -14px rgba(17,17,17,.55)' },
  dark: { transform: 'translateY(-2px)', boxShadow: '0 16px 30px -14px rgba(17,17,17,.7)' },
  ghost: { borderColor: 'rgba(17,17,17,.55)', background: 'rgba(17,17,17,.04)' },
  yellowGhost: { borderColor: color.ink, background: 'rgba(17,17,17,.07)' },
  card: {
    transform: 'translateY(-6px)',
    boxShadow: '0 32px 56px -34px rgba(17,17,17,.5)',
    borderColor: 'rgba(17,17,17,.16)'
  },
  drop: { background: 'rgba(245,145,30,.16)', color: color.ink },
  social: { background: color.orange, color: color.ink, borderColor: color.orange },
  foot: { color: color.orange }
};

// §3 keeps the palette closed, so order statuses reuse the nine colors above
// rather than introducing a traffic-light set of their own.
export const statusTone = {
  PENDING: color.muted,
  ASSIGNED: color.orange,
  PICKED_UP: color.orange,
  IN_TRANSIT: color.orangeDeep,
  DELIVERED: color.inkSoft,
  CANCELLED: color.body
};

export const radius = {
  field: '14px',
  card: '22px',
  pill: '999px'
};

// Form controls are new to this codebase and repeat across booking, auth and admin.
// They live here for the same reason the hover objects do: one place to change them.
export const control = {
  field: {
    width: '100%',
    height: '56px',
    padding: '0 16px',
    borderRadius: radius.field,
    border: '1.5px solid rgba(17,17,17,.14)',
    background: color.white,
    fontFamily: font.body,
    fontSize: '16px',
    color: color.ink,
    outline: 'none',
    transition: 'border-color .18s, box-shadow .18s'
  },
  fieldFocus: {
    borderColor: color.orange,
    boxShadow: `0 0 0 3px rgba(245,145,30,.22)`
  },
  fieldInvalid: {
    borderColor: color.orangeDeep,
    boxShadow: '0 0 0 3px rgba(196,112,15,.16)'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontFamily: font.mono,
    fontSize: '10.5px',
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: color.muted
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '46px',
    padding: '0 18px',
    borderRadius: radius.pill,
    border: '1.5px solid rgba(17,17,17,.14)',
    background: color.white,
    fontFamily: font.body,
    fontSize: '15px',
    fontWeight: 600,
    color: color.ink,
    cursor: 'pointer',
    transition: `border-color .18s, background .18s, color .18s`
  },
  chipActive: {
    borderColor: color.ink,
    background: color.ink,
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
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: color.muted
};

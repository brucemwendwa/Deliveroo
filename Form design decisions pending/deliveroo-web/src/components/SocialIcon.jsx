/**
 * §20 — the four social marks, drawn here for the same reason TransportGlyph draws
 * the quadcopter: Material Symbols carries no brand logos, so an <Icon name="instagram">
 * would render the literal word. Paths are the official marks on their own viewBox,
 * normalised to one square and filled with currentColor so the button's hover state
 * (paper on ink, ink on orange) carries the glyph with it and nothing has to be
 * restated per network.
 *
 * Instagram is an outline in its own right — that is the mark, not a lighter variant.
 */
const MARKS = {
  instagram: {
    label: 'Instagram',
    viewBox: '0 0 24 24',
    // Rounded square, lens and flash: the mark is geometric, so it is drawn as
    // geometry rather than carrying a thousand characters of traced path.
    render: (
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" />
        <circle cx="12" cy="12" r="4.6" />
        <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
      </g>
    )
  },
  facebook: {
    label: 'Facebook',
    viewBox: '0 0 320 512',
    render: (
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    )
  },
  linkedin: {
    label: 'LinkedIn',
    viewBox: '0 0 448 512',
    render: (
      <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
    )
  },
  x: {
    label: 'X',
    viewBox: '0 0 24 24',
    // The counter inside the crossing strokes is a reversed subpath, so it needs the
    // even-odd rule to read as a hole rather than filling solid.
    render: (
      <path
        fillRule="evenodd"
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z"
      />
    )
  }
};

export const SOCIAL_NETWORKS = Object.entries(MARKS).map(([id, mark]) => ({ id, label: mark.label }));

export default function SocialIcon({ network, size = 18 }) {
  const mark = MARKS[network];
  if (!mark) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={mark.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: 'none' }}
    >
      {mark.render}
    </svg>
  );
}

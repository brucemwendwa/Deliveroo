/** SVG gooey-blur filter used by the hero CTA's morphing knob. */
export default function GooFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>
        <filter id="ctaGoo" x="-40%" y="-60%" width="180%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
            result="goo"
          />
        </filter>
      </defs>
    </svg>
  );
}

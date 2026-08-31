import { color, layout, radius } from '../../theme';

/**
 * A block standing in for content that is still loading. Shape first: a skeleton that
 * matches the layout it replaces stops the page jumping when the data lands, which a
 * centred spinner cannot do.
 */
export function Skeleton({ width = '100%', height = 16, rounded = '10px', tone = 'light', style }) {
  const onDark = tone === 'dark';
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: rounded,
        background: onDark
          ? 'linear-gradient(100deg, rgba(243,243,241,.06) 30%, rgba(243,243,241,.13) 50%, rgba(243,243,241,.06) 70%)'
          : 'linear-gradient(100deg, rgba(28,32,31,.045) 30%, rgba(28,32,31,.09) 50%, rgba(28,32,31,.045) 70%)',
        backgroundSize: '260% 100%',
        animation: 'shimmer 1.5s linear infinite',
        ...style
      }}
    />
  );
}

/** The two-column tracking/details layout, before its order arrives. */
export function TrackingSkeleton({ tone = 'dark' }) {
  const onDark = tone === 'dark';

  return (
    <div role="status" aria-label="Loading delivery" style={{ background: onDark ? color.greenDeep : color.paper }}>
      {/* The fixed nav is white text sized for the hero photo, so any screen that
          starts on paper still needs something dark beneath it at scroll zero. */}
      <div style={{ background: color.greenDeep, height: '80px' }} />
      <div
        style={{
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `clamp(30px,5vw,64px) ${layout.gutter} clamp(56px,7vw,104px)`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(28px,3.5vw,56px)',
          alignItems: 'flex-start'
        }}
      >
        <div style={{ flex: '1 1 340px', minWidth: 'min(100%,300px)', display: 'grid', gap: '14px' }}>
          <Skeleton tone={tone} width="140px" height={12} />
          <Skeleton tone={tone} width="80%" height={48} rounded="16px" />
          <Skeleton tone={tone} height={92} rounded={radius.card} style={{ marginTop: '10px' }} />
          <Skeleton tone={tone} height={78} rounded={radius.card} />
          <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} tone={tone} width={`${70 - row * 8}%`} height={14} />
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 440px', minWidth: 'min(100%,300px)', display: 'grid', gap: '14px' }}>
          <Skeleton tone={tone} height="clamp(300px,44vh,460px)" rounded={radius.card} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Skeleton tone={tone} height={72} rounded="18px" />
            <Skeleton tone={tone} height={72} rounded="18px" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Skeleton;

import { color, ease, font } from '../../theme';

/**
 * A ranked list of one measure across categories, drawn as bars against a shared
 * scale. The value is printed on every row rather than left to the eye: this is a
 * table that happens to be readable at a glance, which is what an operations screen
 * needs — and it means the chart still works with the colour taken away.
 */
export default function BarList({ rows = [], format = (value) => value, tone = color.orange, empty = 'Nothing yet.' }) {
  const peak = Math.max(1, ...rows.map((row) => row.value));

  if (!rows.length) {
    return <p style={{ margin: 0, fontSize: '13.5px', color: color.muted }}>{empty}</p>;
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '13px' }}>
      {rows.map((row) => (
        <li key={row.key || row.label}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0,
                fontSize: '13.5px',
                fontWeight: 600,
                color: color.ink,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {row.glyph}
              {row.label}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: font.mono,
                fontSize: '12px',
                letterSpacing: '.03em',
                fontWeight: 700,
                color: row.value ? color.ink : color.muted,
                whiteSpace: 'nowrap'
              }}
            >
              {format(row.value)}
              {row.hint && <span style={{ marginLeft: '8px', fontWeight: 400, color: color.muted }}>{row.hint}</span>}
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(17,17,17,.07)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(row.value ? 2 : 0, (row.value / peak) * 100)}%`,
                height: '100%',
                borderRadius: '4px',
                background: row.tone || tone,
                transition: `width .32s ${ease.out}`
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

import { useState } from 'react';
import { color, ease, font } from '../../theme';

/**
 * One measure over time. A column per day — a bar chart, not a line, because these
 * are counts of discrete bookings rather than a continuous reading, and a line
 * between Tuesday and Wednesday implies values in between that do not exist.
 *
 * One series, so there is no legend and no palette: the heading names the measure
 * and the single accent hue carries it. Only the peak and the ends are labelled —
 * a number over every column is noise, and the rest are one hover away.
 */
export default function ColumnChart({ data = [], height = 132, format = (value) => value, label = 'Volume' }) {
  const [hovered, setHovered] = useState(null);
  const peak = Math.max(1, ...data.map((row) => row.value));
  const peakIndex = data.findIndex((row) => row.value === Math.max(...data.map((entry) => entry.value)));

  return (
    <figure style={{ margin: 0 }}>
      <div
        role="img"
        aria-label={`${label} by day. ${data
          .map((row) => `${row.label}: ${format(row.value)}`)
          .join(', ')}.`}
        style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: `${height}px` }}
      >
        {data.map((row, index) => {
          const share = row.value / peak;
          const on = hovered === index;
          const showValue = on || index === peakIndex;
          return (
            <div
              key={row.key}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: '10.5px',
                  letterSpacing: '.04em',
                  color: on ? color.ink : color.muted,
                  opacity: showValue ? 1 : 0,
                  transition: 'opacity .15s',
                  whiteSpace: 'nowrap'
                }}
              >
                {format(row.value)}
              </span>
              <span
                title={`${row.label} · ${format(row.value)}`}
                style={{
                  display: 'block',
                  width: '100%',
                  // A zero still draws a hairline: an empty Sunday is a fact, and a
                  // column of nothing reads as missing data rather than as none.
                  height: `${Math.max(2, share * (height - 26))}px`,
                  borderRadius: '4px 4px 0 0',
                  background: row.value === 0 ? 'rgba(17,17,17,.12)' : on ? color.orangeDeep : color.orange,
                  transition: `background .18s ${ease.out}`
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        style={{ height: '1px', background: 'rgba(17,17,17,.14)', margin: '0 0 7px' }}
      />
      <figcaption
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: font.mono,
          fontSize: '10px',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: color.muted
        }}
      >
        <span>{data[0]?.label}</span>
        <span>{hovered !== null ? data[hovered].label : data[data.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}

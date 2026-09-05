import { useMemo } from 'react';

// 64 x 29 lat/lon grid, ~5.6° per column: inclusive column ranges of land per row.
const LAND_ROWS = [
  [[13, 14], [17, 18], [22, 25]],
  [[9, 10], [12, 13], [15, 18], [21, 26], [33, 33], [47, 48], [52, 53]],
  [[3, 6], [8, 19], [22, 26], [32, 34], [37, 45], [47, 55], [57, 60]],
  [[2, 7], [9, 20], [22, 25], [27, 28], [30, 34], [36, 44], [46, 58], [60, 61]],
  [[2, 6], [8, 13], [17, 20], [23, 24], [30, 33], [35, 47], [49, 58], [60, 62]],
  [[4, 13], [16, 20], [29, 29], [31, 33], [35, 48], [50, 59], [61, 62]],
  [[7, 12], [14, 20], [29, 30], [31, 37], [39, 50], [52, 58], [60, 61]],
  [[9, 19], [30, 37], [39, 52], [54, 58], [59, 59]],
  [[9, 19], [29, 31], [32, 37], [38, 40], [41, 53], [55, 58], [59, 59]],
  [[10, 17], [29, 37], [39, 44], [46, 57], [58, 58]],
  [[11, 18], [29, 40], [41, 44], [45, 47], [48, 56]],
  [[11, 15], [17, 18], [29, 41], [42, 44], [45, 47], [48, 55]],
  [[12, 16], [18, 19], [29, 41], [45, 47], [48, 53]],
  [[14, 17], [19, 20], [28, 42], [45, 47], [48, 52]],
  [[15, 17], [19, 23], [28, 42], [45, 46], [49, 52]],
  [[17, 24], [29, 40], [46, 46], [50, 54]],
  [[17, 25], [30, 40], [49, 55]],
  [[17, 26], [31, 39], [50, 56]],
  [[18, 25], [32, 39], [51, 54], [56, 58]],
  [[18, 25], [32, 38], [53, 57]],
  [[18, 24], [33, 38], [41, 41], [52, 59]],
  [[19, 24], [33, 38], [41, 41], [52, 59]],
  [[19, 23], [34, 38], [52, 59]],
  [[20, 23], [34, 37], [53, 58], [61, 62]],
  [[20, 22], [35, 36], [55, 57], [61, 62]],
  [[20, 22], [56, 56], [61, 62]],
  [[20, 21]],
  [[20, 21]],
  [[20, 20]]
];

const ROUTES = [
  { d: 'M 96 142 C 116 130 130 119 143 111', dur: '2.8s' },
  { d: 'M 143 111 C 190 128 236 141 282 144', dur: '3.2s' },
  { d: 'M 282 144 C 318 120 354 92 399 70', dur: '3.5s' },
  { d: 'M 143 111 C 200 76 272 62 340 74', dur: '4s' },
  { d: 'M 399 70 C 430 90 448 108 462 124', dur: '3s' }
];

const NODES = [
  [96, 142], [143, 111], [282, 144], [340, 74], [399, 70], [462, 124]
];

/** Dotted world map with animated freight routes. Memoised — ~700 circles. */
export default function WorldMap() {
  const dots = useMemo(() => {
    const seen = new Set();
    const out = [];
    LAND_ROWS.forEach((ranges, row) => {
      ranges.forEach(([from, to]) => {
        for (let col = from; col <= to; col += 1) {
          const key = `${row},${col}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(
            <circle
              key={key}
              cx={col * 8 + 4}
              cy={row * 8 + 4}
              r={2.1}
              fill="rgba(15,26,23,.95)"
              stroke="rgba(255,255,255,.85)"
              strokeWidth={1.2}
              paintOrder="stroke"
            />
          );
        }
      });
    });
    return out;
  }, []);

  return (
    <>
      <svg viewBox="0 0 512 232" style={{ display: 'block', width: '100%', height: 'auto' }}>
        {dots}
      </svg>
      <svg
        viewBox="0 0 512 232"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {ROUTES.map((route) => (
          <path
            key={route.d}
            d={route.d}
            fill="none"
            stroke="#F88735"
            strokeWidth={2}
            strokeDasharray="6 7"
            style={{ animation: `dashmove ${route.dur} linear infinite` }}
          />
        ))}
        {NODES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.4} fill="#F88735" />
        ))}
      </svg>
    </>
  );
}

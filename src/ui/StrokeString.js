import React from 'react';

/**
 * Strokes as beads on the telephone string: a red flag marks par, the knot at the
 * far end is the max ("end of the line"). Beads are blue up to par, red after.
 */
export default function StrokeString({ used, par = 2, max = 5, failed = false }) {
  const W = 320;
  const H = 70;
  const pad = 18;
  const y = 46;
  const step = (W - pad * 2) / max;
  const slotX = (i) => pad + step * (i - 0.5); // slot i = 1..max
  const flagX = slotX(par);
  return (
    <svg className="stroke-string" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${used} of ${max} strokes used, par ${par}`}>
      <path
        d={`M${pad} ${y} Q ${W / 4} ${y - 7}, ${W / 2} ${y} T ${W - pad} ${y}`}
        stroke="var(--cream)"
        strokeWidth="3"
        fill="none"
        opacity={failed ? 0.35 : 0.85}
      />
      {Array.from({ length: max }, (_, k) => k + 1).map((i) =>
        i <= used ? (
          <g key={i}>
            <circle cx={slotX(i)} cy={y + 3} r="11" fill="var(--bg-deep)" />
            <circle cx={slotX(i)} cy={y} r="11" fill={i > par ? 'var(--tomato)' : 'var(--sky)'} />
          </g>
        ) : (
          <circle key={i} cx={slotX(i)} cy={y} r="8" fill="var(--bg)" stroke="rgba(255,244,220,.35)" strokeWidth="2" strokeDasharray="3 3" />
        )
      )}
      <line x1={flagX} y1={y - 14} x2={flagX} y2={y - 40} stroke="var(--cream)" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${flagX} ${y - 40} L${flagX + 17} ${y - 34.5} L${flagX} ${y - 29} Z`} fill="var(--tomato)" />
      <text x={flagX + 21} y={y - 31} fill="var(--cream)" fontSize="12" fontWeight="800">
        par
      </text>
      <circle cx={pad - 6} cy={y} r="6" fill="var(--tomato)" />
      <circle cx={W - pad + 6} cy={y} r="8" fill={failed ? 'var(--tomato)' : 'var(--butter)'} />
      {failed && (
        <text x={W - pad + 6} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--ink)">
          ✕
        </text>
      )}
    </svg>
  );
}

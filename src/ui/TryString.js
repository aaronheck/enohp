import React from 'react';

/**
 * Tries as beads on the telephone string, from the red knot to the yellow knot at
 * the end (which turns red if you run out).
 */
export default function TryString({ used, max = 5, failed = false }) {
  const W = 320;
  const H = 44;
  const pad = 18;
  const y = 22;
  const step = (W - pad * 2) / max;
  const slotX = (i) => pad + step * (i - 0.5); // slot i = 1..max
  return (
    <svg className="try-string" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${used} of ${max} tries used`}>
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
            <circle cx={slotX(i)} cy={y} r="11" fill={failed ? 'var(--tomato)' : 'var(--sky)'} />
          </g>
        ) : (
          <circle key={i} cx={slotX(i)} cy={y} r="8" fill="var(--bg)" stroke="rgba(255,244,220,.35)" strokeWidth="2" strokeDasharray="3 3" />
        )
      )}
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

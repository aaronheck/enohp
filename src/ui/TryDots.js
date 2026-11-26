import React from 'react';
import './TryDots.css';

/** "Tries ●●○○○ 2 of 5": one dot per try, filled when used. */
export default function TryDots({ used, max = 5, failed = false, note }) {
  return (
    <div className={'try-dots' + (failed ? ' try-dots-failed' : '')}>
      <div className="try-dots-row">
        <b>Tries</b>
        <span className="try-dots-dots" aria-hidden="true">
          {Array.from({ length: max }, (_, i) => (
            <i key={i} className={i < used ? 'on' : ''} />
          ))}
        </span>
        <span className="try-dots-count">
          {Math.min(used, max)} of {max}
        </span>
      </div>
      {note && <p className="try-dots-note">{note}</p>}
    </div>
  );
}

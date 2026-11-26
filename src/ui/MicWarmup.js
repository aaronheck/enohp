import React from 'react';

/** Sits where the live wave will be while the mic warms up: "wait, not yet". */
export default function MicWarmup({ height = 56 }) {
  return (
    <div className="mic-warmup" style={{ height }} role="status" aria-live="assertive">
      <span className="mic-warmup-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      Mic warming up… wait for it
    </div>
  );
}

import React, { useEffect } from 'react';
import { playerStats, score } from '../lib/daily';
import { track } from '../lib/analytics';
import './HowToPlaySheet.css';
import './StatsSheet.css';

const STATUS_LABEL = { solved: 'solved', late: 'solved late', failed: 'out of tries', today: 'today', none: 'not played' };

/** "Your stats": totals, tries distribution and the last four weeks, from this device. */
export default function StatsSheet({ open, onClose, today, todayState }) {
  useEffect(() => {
    if (open) track('howto_open', { game: 'stats', source: 'sheet' });
  }, [open]);
  if (!open) return null;
  const s = playerStats(today);
  const todayLabel = todayState && (todayState.solved || todayState.failed) ? score(todayState).split('/')[0] : null;
  const max = Math.max(1, ...s.dist.map((d) => d.count));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet stats-sheet" role="dialog" aria-modal="true" aria-label="Your stats" onClick={(e) => e.stopPropagation()}>
        <button className="stats-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="stats-title">Your stats</h2>

        <div className="stats-tiles">
          <div>
            <b>{s.played}</b>
            <span>played</span>
          </div>
          <div>
            <b>{s.winRate == null ? '–' : `${Math.round(s.winRate * 100)}%`}</b>
            <span>solved</span>
          </div>
          <div>
            <b>{s.streak}</b>
            <span>🔥 streak</span>
          </div>
          <div>
            <b>{s.best}</b>
            <span>best streak</span>
          </div>
        </div>

        <h3 className="stats-h">Tries to solve</h3>
        {s.played ? (
          <div className="stats-dist" role="table" aria-label="Tries to solve">
            {s.dist.map((d) => (
              <div className="stats-row" role="row" key={d.label}>
                <span className="stats-lbl" role="rowheader">
                  {d.label}
                </span>
                <span className="stats-track" role="cell">
                  <i
                    className={(d.label === todayLabel ? 'on' : '') + (d.label === 'X' ? ' x' : '')}
                    style={{ width: `${Math.max(d.count ? 8 : 0, (d.count / max) * 100)}%` }}
                  />
                  <em>{d.count}</em>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Finish a puzzle to see this.</p>
        )}
        {s.mindReaders > 0 && <p className="stats-mind">🤯 Mind reader {s.mindReaders === 1 ? 'once' : `${s.mindReaders} times`}</p>}

        <h3 className="stats-h">Last {s.days.length} days</h3>
        <div className="stats-cal">
          {s.days.map((d) => (
            <span key={d.n} className={`cal cal-${d.status}`} title={`#${d.n}: ${STATUS_LABEL[d.status]}`} aria-label={`Puzzle ${d.n}: ${STATUS_LABEL[d.status]}`} />
          ))}
        </div>
        <p className="stats-legend">
          <span className="cal cal-solved" /> solved <span className="cal cal-late" /> late <span className="cal cal-failed" /> out of tries{' '}
          <span className="cal cal-none" /> didn’t play
        </p>
      </div>
    </div>
  );
}

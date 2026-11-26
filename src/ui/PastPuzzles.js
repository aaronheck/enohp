import React from 'react';
import { Link } from 'react-router-dom';
import { pastPuzzles, rating } from '../lib/daily';
import './PastPuzzles.css';

/** The last few puzzles: play any you missed (free), or see how you did. */
export default function PastPuzzles({ today, todayDate, title = 'Missed one? Play the last 5 puzzles' }) {
  const list = today && todayDate ? pastPuzzles(today, todayDate) : [];
  if (!list.length) return null;
  return (
    <div className="past">
      {title && <p className="past-title">{title}</p>}
      <ul className="past-list">
        {list.map(({ n, date, state, finished }) => (
          <li key={n}>
            <Link to={`/puzzle/${n}`} className={'past-row' + (finished ? ' done' : '')}>
              <span className="past-n">#{n}</span>
              <span className="past-date">{date}</span>
              <span className="past-status">
                {state.solved || state.failed ? `${rating(state).emoji} ${rating(state).word}` : state.heard || state.mimics ? 'Keep going →' : 'Play →'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

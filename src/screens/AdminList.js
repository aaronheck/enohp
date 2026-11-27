import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Notice, Screen } from '../ui/components';
import { listCandidates } from '../lib/admin';
import '../ui/AdminReview.css';
import './screens.css';

const LEVEL = { 1: 'Easy', 2: 'Fair', 3: 'Medium', 4: 'Hard', 5: 'Brutal' };

/** Puzzle review home: every candidate; the phrase stays hidden until you've played it. */
export default function AdminList() {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    listCandidates().then(setList, (e) => setError(e.message));
  }, []);

  const played = list ? list.filter((c) => c.played).length : 0;
  const kept = list ? list.filter((c) => c.verdict === 'keep').length : 0;
  return (
    <Screen left="yelnats review" right={list ? `${played}/${list.length} played` : null}>
      <h1 className="title title-sm">Puzzle review</h1>
      <p className="lede" style={{ marginTop: 8 }}>
        Play each one blind, then keep or ditch it. Phrases show up here once you’ve finished them.
      </p>
      {error && <Notice>{error}</Notice>}
      {list && (
        <p className="cands-summary">
          {kept} kept · {list.filter((c) => c.verdict === 'ditch').length} ditched · {list.length - played} to play
        </p>
      )}
      <ul className="cands">
        {(list || []).map((c) => (
          <li key={c.id}>
            <Link className="cand" to={`/puzzle/${c.id}`}>
              <span className="cand-n">#{c.id}</span>
              <span className="cand-main">
                <span className="cand-phrase">{c.phrase || 'Not played yet'}</span>
                {c.last && (
                  <span className="cand-sub">
                    {c.last.outcome === 'failed' ? 'Out of tries' : `Solved in ${c.last.tries}`} · {c.last.mimics} mimics
                    {c.difficulty ? ` · ${LEVEL[c.difficulty]}` : ''}
                    {c.recordings ? ` · ${c.recordings} recordings` : ''}
                  </span>
                )}
              </span>
              {c.verdict ? <span className="cand-verdict">{c.verdict === 'keep' ? '👍' : '👎'}</span> : <span className="cand-go">{c.played ? 'Review →' : 'Play →'}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

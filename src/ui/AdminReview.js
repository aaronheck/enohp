import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCandidates, saveReview } from '../lib/admin';
import './AdminReview.css';

const LEVELS = [
  [1, 'Easy'],
  [2, 'Fair'],
  [3, 'Medium'],
  [4, 'Hard'],
  [5, 'Brutal'],
];

/** On the results screen in the review build: keep or ditch, how hard, notes. */
export default function AdminReview({ n, state }) {
  const [verdict, setVerdict] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(null);
  const [next, setNext] = useState(null);

  useEffect(() => {
    listCandidates()
      .then((list) => {
        const me = list.find((c) => c.id === n);
        if (me) {
          setVerdict(me.verdict);
          setDifficulty(me.difficulty);
          setNotes(me.notes || '');
        }
        const unplayed = list.find((c) => c.id !== n && !c.played);
        setNext(unplayed ? unplayed.id : null);
      })
      .catch(() => {});
  }, [n]);

  const save = async (patch) => {
    const review = { verdict, difficulty, notes, ...patch };
    setVerdict(review.verdict);
    setDifficulty(review.difficulty);
    try {
      await saveReview(n, review);
      setSaved('Saved ✓');
    } catch (e) {
      setSaved(`Couldn’t save: ${e.message}`);
    }
  };

  const playAgain = () => {
    try {
      const d = JSON.parse(localStorage.getItem('yelnats.daily')) || { puzzles: {} };
      delete d.puzzles[n];
      localStorage.setItem('yelnats.daily', JSON.stringify(d));
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  return (
    <section className="review">
      <p className="review-title">Keep this puzzle?</p>
      <div className="review-verdict">
        <button className={'review-btn keep' + (verdict === 'keep' ? ' on' : '')} onClick={() => save({ verdict: 'keep' })}>
          👍 Keep
        </button>
        <button className={'review-btn ditch' + (verdict === 'ditch' ? ' on' : '')} onClick={() => save({ verdict: 'ditch' })}>
          👎 Ditch
        </button>
      </div>
      <p className="review-sub">How hard was it?</p>
      <div className="review-levels">
        {LEVELS.map(([v, label]) => (
          <button key={v} className={'review-level' + (difficulty === v ? ' on' : '')} onClick={() => save({ difficulty: v })}>
            <b>{v}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <textarea
        className="review-notes"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => save({ notes })}
        rows={2}
      />
      {saved && <p className="review-saved">{saved}</p>}
      <div className="review-actions">
        {next ? (
          <Link className="btn btn-primary" to={`/puzzle/${next}`} reloadDocument>
            Next candidate →
          </Link>
        ) : (
          <Link className="btn btn-primary" to="/">
            All candidates
          </Link>
        )}
        <button className="btn-text review-again" onClick={playAgain}>
          Play it again
        </button>
      </div>
      <p className="review-meta">{state.failed ? 'You ran out of tries.' : ''} Your plays and recordings are saved.</p>
    </section>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchRecording, getDaily, guessDaily, revealDaily } from '../api/client';
import useRecorder from '../audio/useRecorder';
import {
  ACTION_LABEL,
  MAX_TRIES,
  actionEmoji,
  canMimic,
  msUntilNextPuzzle,
  getPuzzleState,
  isMindReader,
  score,
  triesUsed,
  plural,
  shareText,
  hasPlayedDaily,
  streak,
  updatePuzzleState,
} from '../lib/daily';
import { shareLink } from '../lib/share';
import { drawShareImage } from '../lib/shareImage';
import { listMimics, saveMimic } from '../lib/mimicStore';
import { stopShared, unlockAudio } from '../audio/context';
import { isDev, resetDaily } from '../lib/devReset';
import { track } from '../lib/analytics';
import { practiceDone } from '../lib/practice';
import { Button, Notice, Screen } from '../ui/components';
import { ReversedPlayer } from '../ui/audio';
import { VibratingString } from '../ui/waves';
import TryDots from '../ui/TryDots';
import DailyHowTo from '../ui/DailyHowTo';
import './screens.css';
import './Daily.css';

const SITE = 'https://yelnatsgame.com';
const DEFAULT_VOICE = 'Kevin';

/** Loads (and caches) one voice's audio for a puzzle. */
function useClip(url) {
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setBlob(null);
    setError(null);
    if (!url) return undefined;
    fetchRecording(url, { retries: 1 }).then(
      (b) => !cancelled && setBlob(b),
      () => !cancelled && setError("Couldn't load the audio.")
    );
    return () => {
      cancelled = true;
    };
  }, [url]);
  return { blob, error };
}

export default function Daily() {
  const [puzzle, setPuzzle] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // TEMPORARY (pre-launch): ?puzzle=3 plays puzzle #3 instead of today's.
  const [forced] = useState(() => {
    const v = Number(new URLSearchParams(window.location.search).get('puzzle'));
    return Number.isInteger(v) && v >= 1 ? v : null;
  });

  useEffect(() => {
    getDaily(forced).then(setPuzzle, (e) =>
      setLoadError(e.status === 503 ? "Today's puzzle isn't ready yet. Check back soon!" : e.message)
    );
  }, [forced]);

  if (loadError || !puzzle) {
    return (
      <Screen left="yelnats" right={<Link to="/friends">Play with friends</Link>}>
        <h1 className="title title-sm turn-title">
          {loadError ? 'Hmm.' : 'Rewinding'}
          <br />
          <span className="accent">{loadError ? '' : "today's puzzle…"}</span>
        </h1>
        {loadError && <p className="lede" style={{ marginTop: 12 }}>{loadError}</p>}
        <div className="spacer" />
        <Button variant="ghost" to="/friends">
          Play with friends instead
        </Button>
      </Screen>
    );
  }

  return <Puzzle puzzle={puzzle} forced={forced && puzzle.number === forced} />;
}

function Puzzle({ puzzle, forced }) {
  const n = puzzle.number;
  const [state, setState] = useState(() => getPuzzleState(n));
  // One voice for now; the backend still offers others for later.
  const voice = puzzle.audio[DEFAULT_VOICE] ? DEFAULT_VOICE : puzzle.voices[0].id;
  const [answers, setAnswers] = useState(null);
  const [guess, setGuess] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [mimics, setMimics] = useState([]); // [{ index, blob }], oldest first
  const [justRecorded, setJustRecorded] = useState(null);
  // Open the how-to automatically the first time someone plays any daily puzzle.
  const [howOpen, setHowOpen] = useState(() => !hasPlayedDaily());
  const [howSource, setHowSource] = useState(() => (hasPlayedDaily() ? 'button' : 'auto'));
  const navigate = useNavigate();

  // Analytics: one view per puzzle load (and whether the how-to opened by itself).
  useEffect(() => {
    track('daily_view', {
      puzzle: n,
      forced: !!forced,
      returning: hasPlayedDaily(),
      streak: streak(n),
      state: state.solved ? 'solved' : state.failed ? 'failed' : state.mimics || state.guesses.length ? 'in_progress' : 'new',
    });
    if (howOpen) track('howto_open', { game: 'daily', source: 'auto' });
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  const recorder = useRecorder();
  const recording = recorder.status === 'recording';
  const update = (patch) => setState(updatePuzzleState(n, patch));

  // Coming back to a finished puzzle: fetch fresh answer audio links.
  useEffect(() => {
    if (answers) return;
    if (state.failed) revealDaily(n).then((r) => setAnswers(r.answers), () => {});
    else if (state.solved && state.phrase) {
      guessDaily(n, state.phrase).then((r) => r.correct && setAnswers(r.answers), () => {});
    }
  }, [state.solved, state.failed, state.phrase, answers, n]);

  // Earlier mimics for this puzzle, saved on this device.
  useEffect(() => {
    let cancelled = false;
    listMimics(n).then((saved) => !cancelled && setMimics(saved));
    return () => {
      cancelled = true;
    };
  }, [n]);

  async function stopMimic() {
    const blob = await recorder.stop();
    if (blob && blob.size) {
      const index = state.mimics + 1;
      update({ mimics: index, actions: [...state.actions, 'mimic'] });
      setMimics((prev) => [...prev, { index, blob }]);
      setJustRecorded(index);
      track('mimic', { puzzle: n, n: index, tries_used: triesUsed({ ...state, mimics: index }) });
      saveMimic(n, index, blob);
    }
  }

  const used = triesUsed(state);
  const left = MAX_TRIES - used;
  const mimicOk = canMimic(state);

  async function submit(e) {
    e.preventDefault();
    const g = guess.trim();
    if (!g || checking || left < 1) return;
    setChecking(true);
    setError(null);
    try {
      const r = await guessDaily(n, g);
      if (r.correct) {
        setAnswers(r.answers);
        const done = { ...state, solved: true };
        track('guess', { puzzle: n, correct: true, try: used + 1 });
        track('daily_solved', { puzzle: n, tries: triesUsed(done), mimics: state.mimics, mind_reader: isMindReader(done) });
        update({ solved: true, phrase: r.phrase, voice, actions: [...state.actions, 'hit'] });
      } else {
        const next = { guesses: [...state.guesses, g], actions: [...state.actions, 'miss'] };
        track('guess', { puzzle: n, correct: false, try: used + 1, text: g });
        setGuess('');
        if (triesUsed({ ...state, ...next }) >= MAX_TRIES) {
          // Out of tries: show the answer.
          const rev = await revealDaily(n);
          setAnswers(rev.answers);
          track('daily_failed', { puzzle: n, mimics: state.mimics });
          update({ ...next, failed: true, phrase: rev.phrase, voice });
        } else {
          update(next);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  // Done with the puzzle: give the microphone back.
  const finished = state.solved || state.failed;
  const { release } = recorder;
  useEffect(() => {
    if (finished) release();
  }, [finished, release]);

  const days = streak(n);
  const top = {
    left: 'yelnats',
    right: forced ? <span className="forced-tag">forced #{n}</span> : days > 0 ? `🔥 ${plural(days, 'day')}` : `Daily #${n}`,
  };

  if (state.solved || state.failed) {
    return <Solved n={n} state={state} answers={answers} voice={voice} days={days} top={top} mimics={mimics} />;
  }

  // Until the first mimic, the Mimic button leads; after it, the Guess button does.
  const firstMimic = state.mimics === 0;
  // You have to hear the puzzle all the way through once before mimicking or guessing.
  const heard = state.heard || state.mimics > 0 || state.guesses.length > 0;
  const starting = recorder.status === 'starting';
  const startMimic = () => {
    unlockAudio(); // during the tap, so the flipped take can autoplay
    stopShared(); // don't record the puzzle playing
    recorder.start();
  };
  const finishMimic = () => {
    unlockAudio();
    stopMimic();
  };

  return (
    <Screen {...top}>
      <div className="daily-head">
        <h1 className="title title-sm">
          Yelnats Daily
          <br />
          <span className="accent">Puzzle #{n}</span>
        </h1>
        <button
          className="how-btn"
          onClick={() => {
            setHowSource('button');
            setHowOpen(true);
            track('howto_open', { game: 'daily', source: 'button' });
          }}
        >
          How to play
        </button>
      </div>
      <DailyHowTo
        open={howOpen}
        source={howSource}
        onClose={(how, slide) => {
          setHowOpen(false);
          track('howto_close', { game: 'daily', how, slide: (slide || 0) + 1, source: howSource });
          if (how === 'practice') navigate('/practice/1');
        }}
      />
      <p className="lede" style={{ marginTop: 8 }}>
        Here's the phrase in reverse.
      </p>
      {!heard && !practiceDone().length && (
        <Link to="/practice/1" className="practice-link" onClick={() => track('page_view', { path: '/practice-link' })}>
          First time? Try a quick practice game →
        </Link>
      )}

      <div className="section">
        <PuzzleClip
          url={puzzle.audio[voice]}
          highlight={!heard}
          onEnded={() => {
            if (heard) return;
            update({ heard: true });
            track('daily_listened', { puzzle: n });
          }}
        />
      </div>

      {/* Same layout throughout; only the emphasis moves from Mimic (before the
          first mimic) to Guess (after). */}
      <div className="mimic-area">
        {recording && <VibratingString active getLevel={recorder.getLevel} height={56} />}
        <Button
          variant={recording || firstMimic ? 'primary' : 'ghost'}
          onClick={recording ? finishMimic : startMimic}
          disabled={starting || (!recording && (!mimicOk || !heard))}
          className={'mimic-cta' + (heard && firstMimic && !recording && mimicOk ? ' mimic-shimmer' : '')}
        >
          {recording ? (
            '■ Stop recording'
          ) : state.mimics ? (
            '🎙 Mimic again (uses a try)'
          ) : (
            <>
              <span className="mic-wiggle" aria-hidden="true">
                🎙
              </span>{' '}
              Mimic it
            </>
          )}
        </Button>
        <p className="cta-note">
          {recording
            ? 'Copy the sound you just heard, as best you can.'
            : !heard
            ? 'Listen to the puzzle first.'
            : !mimicOk
            ? 'Your last try has to be a guess.'
            : 'Mimic the puzzle audio to decode the word.'}
        </p>
        <Notice>{recorder.error}</Notice>
      </div>

      {!recording && <MimicList mimics={mimics} autoPlayIndex={justRecorded} />}

      <div className="guess-area">
        <label className="label" htmlFor="daily-guess">
          What does it say?
        </label>
        {state.guesses.length > 0 && (
          <div className="misses" aria-label="Wrong guesses">
            {state.guesses.map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>
        )}
        <form className="guess-row" onSubmit={submit}>
          <input
            id="daily-guess"
            className="input"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Your guess"
            aria-label="Your guess"
            autoComplete="off"
            autoCapitalize="off"
            maxLength={60}
            disabled={!heard}
          />
          <Button
            type="submit"
            variant={firstMimic ? 'ghost' : 'primary'}
            disabled={!heard || !guess.trim() || checking}
            className="guess-btn"
          >
            {checking ? '…' : 'Guess'}
          </Button>
        </form>
        <p className={'guesses-left' + (left === 1 ? ' guesses-out' : '')}>
          {left === 1 ? 'Last try! Make this guess count.' : 'Every guess uses a try, right or wrong.'}
        </p>
        <Notice>{error}</Notice>
      </div>

      <div className="tries-area">
        <TryDots used={used} max={MAX_TRIES} note="Guesses and mimics cost tries." />
      </div>
      <div className="spacer" />
      <div className="daily-foot">
        <Link to="/friends" onClick={() => track('play_with_friends', { from: 'puzzle' })}>
          Play with friends
        </Link>
        <Link to="/practice/1">Practice</Link>
        <Link to="/previous">My chains</Link>
      </div>
      <DevReset />
    </Screen>
  );
}

// TEMPORARY: only shown with ?dev=1 (see lib/devReset.js).
function DevReset() {
  if (!isDev()) return null;
  return (
    <button className="dev-reset" onClick={resetDaily}>
      ⟲ Reset puzzle (dev only)
    </button>
  );
}

function PuzzleClip({ url, highlight, onEnded }) {
  const { blob, error } = useClip(url);
  return (
    <ReversedPlayer
      key={url}
      blob={blob}
      error={error}
      caption={highlight ? 'tap to hear the puzzle' : 'the puzzle'}
      tilt
      hideDuration
      highlight={highlight}
      onEnded={onEnded}
      tapAnywhere
      reverse={false}
    />
  );
}

function useCountdown() {
  const [ms, setMs] = useState(() => msUntilNextPuzzle());
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilNextPuzzle()), 30000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.max(1, Math.ceil(ms / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function Solved({ n, state, answers, voice, days, top, mimics }) {
  const [status, setStatus] = useState(null);
  const [showMimics, setShowMimics] = useState(false);
  const [image, setImage] = useState(null);
  const total = triesUsed(state);
  const answerVoice = state.voice || voice;
  const answer = useClip(answers ? answers[answerVoice] : null);
  const text = shareText(n, state, SITE, days);
  const next = useCountdown();
  const actions = state.actions && state.actions.length ? state.actions : [state.failed ? 'miss' : 'hit'];

  // Draw the share image up front: phones only open the share sheet straight from a tap.
  useEffect(() => {
    let cancelled = false;
    drawShareImage({
      number: n,
      score: score(state),
      failed: state.failed,
      mindReader: isMindReader(state),
      used: total,
      max: MAX_TRIES,
      actions,
      streak: days,
    }).then((blob) => {
      if (!cancelled && blob) setImage(new File([blob], `yelnats-daily-${n}.png`, { type: 'image/png' }));
    });
    return () => {
      cancelled = true;
    };
  }, [n, state, total, days]); // eslint-disable-line react-hooks/exhaustive-deps

  async function share() {
    const r = await shareLink(SITE, text.replace(`\n${SITE}`, ''), { copyText: text, file: image });
    track('share', { puzzle: n, result: r, method: image ? 'image' : 'text', solved: !!state.solved });
    setStatus({ shared: 'Shared!', copied: 'Result copied. Paste it anywhere.', failed: "Couldn't share this time." }[r] || null);
  }

  return (
    <Screen {...top}>
      <div className="result-card">
        <p className="result-kicker">Yelnats Daily · Puzzle #{n}</p>
        <div className={'result-score' + (state.failed ? ' hot' : '')}>{score(state)}</div>
        <div className="result-dots" aria-hidden="true">
          {Array.from({ length: MAX_TRIES }, (_, i) => (
            <i key={i} className={i < Math.min(total, MAX_TRIES) ? (state.failed ? 'on failed' : 'on') : ''} />
          ))}
        </div>
        <div className="result-moves" aria-label="Your moves">
          {actions.map((a, i) => (
            <span key={i} className={'move move-' + a}>
              {actionEmoji(a)} {ACTION_LABEL[a]}
            </span>
          ))}
        </div>
        {isMindReader(state) ? (
          <span className="mind-reader">🤯 Mind reader</span>
        ) : days >= 2 ? (
          <span className="result-streak">🔥 {days}-day streak</span>
        ) : null}
      </div>

      <div className="answer-row">
        <div>
          <p className="step-note">{state.failed ? 'The answer was' : 'It was'}</p>
          <div className="answer-word">{state.phrase}</div>
        </div>
      </div>
      <ReversedPlayer blob={answer.blob} error={answer.error} caption="hear it forwards" dark compact reverse={false} />

      <div className="stack" style={{ marginTop: 18 }}>
        <Button onClick={share}>{image ? '📤 Share result' : 'Share result'}</Button>
        {status && <p className="muted center">{status}</p>}
        <Button variant="ghost" to="/friends" onClick={() => track('play_with_friends', { from: 'solved' })}>
          Play with friends
        </Button>
      </div>
      <p className="next-puzzle">
        {state.failed ? 'Out of tries. ' : ''}Next puzzle in <b>{next}</b>
      </p>

      {mimics.length > 0 && (
        <div className="section">
          <button className="btn-text mimics-toggle" onClick={() => setShowMimics((v) => !v)} aria-expanded={showMimics}>
            {showMimics ? '▾' : '▸'} Your mimics ({mimics.length})
          </button>
          {showMimics && <MimicList mimics={mimics} />}
        </div>
      )}
      <div className="spacer" />
      <DevReset />
    </Screen>
  );
}

/** Every mimic for this puzzle, newest first. Only a just-recorded one plays by itself. */
function MimicList({ mimics, autoPlayIndex }) {
  if (!mimics.length) return null;
  return (
    <div className="mimic-list">
      {mimics
        .slice()
        .reverse()
        .map((m) => (
          <ReversedPlayer
            key={m.index}
            blob={m.blob}
            caption={`mimic #${m.index}, flipped`}
            dark
            compact
            autoPlay={m.index === autoPlayIndex}
          />
        ))}
    </div>
  );
}

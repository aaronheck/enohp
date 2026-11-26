import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecording, getDaily, guessDaily, revealDaily } from '../api/client';
import useRecorder from '../audio/useRecorder';
import {
  MAX_STROKES,
  PAR,
  canMimic,
  getPuzzleState,
  mimicCost,
  result,
  strokes,
  plural,
  shareText,
  hasPlayedDaily,
  streak,
  updatePuzzleState,
} from '../lib/daily';
import { shareLink } from '../lib/share';
import { listMimics, saveMimic } from '../lib/mimicStore';
import { Button, Notice, Screen } from '../ui/components';
import { RecordButton, ReversedPlayer } from '../ui/audio';
import { VibratingString } from '../ui/waves';
import StrokeString from '../ui/StrokeString';
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

  useEffect(() => {
    getDaily().then(setPuzzle, (e) =>
      setLoadError(e.status === 503 ? "Today's puzzle isn't ready yet. Check back soon!" : e.message)
    );
  }, []);

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

  return <Puzzle puzzle={puzzle} />;
}

function Puzzle({ puzzle }) {
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
      saveMimic(n, index, blob);
    }
  }

  const used = strokes(state);
  const left = MAX_STROKES - used;
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
        update({ solved: true, phrase: r.phrase, voice, actions: [...state.actions, 'hit'] });
      } else {
        const next = { guesses: [...state.guesses, g], actions: [...state.actions, 'miss'] };
        setGuess('');
        if (strokes({ ...state, ...next }) >= MAX_STROKES) {
          // Out of strokes: end of the line, show the answer.
          const rev = await revealDaily(n);
          setAnswers(rev.answers);
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

  const days = streak(n);
  const top = {
    left: 'yelnats',
    right: days > 0 ? `🔥 ${plural(days, 'day')}` : `Daily #${n}`,
  };

  if (state.solved || state.failed) {
    return <Solved n={n} state={state} answers={answers} voice={voice} days={days} top={top} mimics={mimics} />;
  }

  return (
    <Screen {...top}>
      <div className="daily-head">
        <p className="step-note">Daily puzzle #{n}</p>
        <button className="how-btn" onClick={() => setHowOpen(true)}>
          How to play
        </button>
      </div>
      <DailyHowTo open={howOpen} onClose={() => setHowOpen(false)} />
      <h1 className="title title-sm">
        Today's phrase,
        <br />
        <span className="accent">backwards.</span>
      </h1>
      <p className="lede" style={{ marginTop: 8 }}>
        Can you work out what it says?
      </p>

      <div className="section">
        <PuzzleClip url={puzzle.audio[voice]} />
      </div>

      {state.guesses.length > 0 && (
        <div className="misses" aria-label="Wrong guesses">
          {state.guesses.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
      )}
      <form className="guess-row" onSubmit={submit}>
        <input
          className="input"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Your guess"
          aria-label="Your guess"
          autoComplete="off"
          autoCapitalize="off"
          maxLength={60}
        />
        <Button type="submit" disabled={!guess.trim() || checking} className="guess-btn">
          {checking ? '…' : 'Guess'}
        </Button>
      </form>
      <p className={'guesses-left' + (left === 1 ? ' guesses-out' : '')}>
        {left === 1 ? 'Last stroke! Make this guess count.' : 'Every guess is a stroke, right or wrong.'}
      </p>
      <Notice>{error}</Notice>

      <div className="par-box">
        <div className="par-text">
          <b>
            Strokes: {used} <span>/ {MAX_STROKES}</span>
          </b>
          <small>Par {PAR}</small>
        </div>
        <StrokeString used={used} par={PAR} max={MAX_STROKES} />
      </div>

      <div className="mimic-box">
        <div className="mimic-head">
          <RecordButton
            recording={recording}
            starting={recorder.status === 'starting'}
            onStart={recorder.start}
            onStop={stopMimic}
            disabled={!mimicOk && !recording}
            idleHint=""
          />
          <div>
            <b>{recording ? 'Recording… tap to stop' : state.mimics ? 'Mimic again' : 'Stuck? Mimic it'}</b>
            <small>
              {!mimicOk
                ? 'Your last stroke has to be a guess.'
                : `Copy the backwards sound and we'll flip it so it plays forwards. ${
                    mimicCost(state) ? 'Costs a stroke.' : 'Your first mimic is free.'
                  }`}
            </small>
          </div>
        </div>
        {recording && <VibratingString active={recording} getLevel={recorder.getLevel} height={56} />}
        <Notice>{recorder.error}</Notice>
        {!recording && <MimicList mimics={mimics} autoPlayIndex={justRecorded} />}
      </div>

      <div className="daily-foot">
        <Link to="/friends">Play with friends</Link>
        <Link to="/previous">My chains</Link>
      </div>
    </Screen>
  );
}

function PuzzleClip({ url }) {
  const { blob, error } = useClip(url);
  return <ReversedPlayer key={url} blob={blob} error={error} caption="the puzzle" tilt reverse={false} />;
}

function Solved({ n, state, answers, voice, days, top, mimics }) {
  const [status, setStatus] = useState(null);
  const g = result(state);
  const total = strokes(state);
  const answerVoice = state.voice || voice;
  const answer = useClip(answers ? answers[answerVoice] : null);
  const text = shareText(n, state, SITE);

  async function share() {
    const r = await shareLink(SITE, text.replace(`\n${SITE}`, ''), { copyText: text });
    setStatus({ shared: 'Shared!', copied: 'Copied! Paste it anywhere.', failed: "Couldn't share. Copy it below." }[r] || null);
  }

  return (
    <Screen {...top}>
      <p className="step-note" style={{ marginTop: 14 }}>
        Daily #{n} · {state.failed ? 'the answer was…' : 'it was…'}
      </p>
      <div className="word-big">{state.phrase}</div>
      <div className={'golf' + (g.name.length > 12 ? ' golf-long' : '')}>
        <b className="accent">{g.name}</b>
        <span aria-hidden="true">{g.emoji}</span>
      </div>
      <p className="lede">
        {state.failed
          ? 'Out of strokes. A new puzzle comes out tomorrow.'
          : `Solved in ${plural(total, 'stroke')}. Par is ${PAR}.`}
      </p>
      <div className="solved-string">
        <StrokeString used={Math.min(total, MAX_STROKES)} par={PAR} max={MAX_STROKES} failed={state.failed} />
      </div>
      <div className="stats">
        <div>
          <b>{total}</b>
          <small>{total === 1 ? 'stroke' : 'strokes'}</small>
        </div>
        <div>
          <b>{state.mimics}</b>
          <small>{state.mimics === 1 ? 'mimic' : 'mimics'}</small>
        </div>
        <div>
          <b>🔥 {days}</b>
          <small>day streak</small>
        </div>
      </div>
      <pre className="share-card">{text}</pre>
      <div className="section">
        <ReversedPlayer
          blob={answer.blob}
          error={answer.error}
          caption="hear it forwards"
          dark
          reverse={false}
        />
      </div>
      {mimics.length > 0 && (
        <div className="section">
          <p className="step-note">Your mimics</p>
          <MimicList mimics={mimics} />
        </div>
      )}
      <div className="spacer" />
      <div className="stack">
        {status && <p className="muted center">{status}</p>}
        <Button onClick={share}>Share result</Button>
        <Button variant="ghost" to="/friends">
          Play with friends
        </Button>
      </div>
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

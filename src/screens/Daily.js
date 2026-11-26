import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecording, getDaily, guessDaily, revealDaily } from '../api/client';
import useRecorder from '../audio/useRecorder';
import {
  MAX_TRIES,
  canMimic,
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
import { listMimics, saveMimic } from '../lib/mimicStore';
import { stopShared, unlockAudio } from '../audio/context';
import { isDev, resetDaily } from '../lib/devReset';
import { Button, Notice, Screen } from '../ui/components';
import { ReversedPlayer } from '../ui/audio';
import { VibratingString } from '../ui/waves';
import TryString from '../ui/TryString';
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
        update({ solved: true, phrase: r.phrase, voice, actions: [...state.actions, 'hit'] });
      } else {
        const next = { guesses: [...state.guesses, g], actions: [...state.actions, 'miss'] };
        setGuess('');
        if (triesUsed({ ...state, ...next }) >= MAX_TRIES) {
          // Out of tries: show the answer.
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

  // Until the first mimic, the Mimic button leads; after it, the Guess button does.
  const firstMimic = state.mimics === 0;
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

      {/* Same layout throughout; only the emphasis moves from Mimic (before the
          first mimic) to Guess (after). */}
      <div className="mimic-area">
        {recording && <VibratingString active getLevel={recorder.getLevel} height={56} />}
        <Button
          variant={recording || firstMimic ? 'primary' : 'ghost'}
          onClick={recording ? finishMimic : startMimic}
          disabled={starting || (!recording && !mimicOk)}
          className="mimic-cta"
        >
          {recording ? '■ Stop recording' : state.mimics ? '🎙 Mimic again' : '🎙 Mimic it'}
        </Button>
        <p className="cta-note">
          {recording
            ? 'Copy the sound you just heard, as best you can.'
            : !mimicOk
            ? 'Your last try has to be a guess.'
            : state.mimics
            ? 'Uses a try.'
            : "Copy the sound and we'll flip it so it plays forwards. Your first mimic doesn't use a try."}
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
          />
          <Button
            type="submit"
            variant={firstMimic ? 'ghost' : 'primary'}
            disabled={!guess.trim() || checking}
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

      <div className="spacer" />
      <div className="tries-line">
        <TryString used={used} max={MAX_TRIES} />
        <span>
          <b>
            Tries {used}/{MAX_TRIES}
          </b>{' '}
          · guesses and mimics cost tries
        </span>
      </div>
      <div className="daily-foot">
        <Link to="/friends">Play with friends</Link>
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

function PuzzleClip({ url }) {
  const { blob, error } = useClip(url);
  return <ReversedPlayer key={url} blob={blob} error={error} caption="the puzzle" tilt reverse={false} />;
}

function Solved({ n, state, answers, voice, days, top, mimics }) {
  const [status, setStatus] = useState(null);
  const total = triesUsed(state);
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
      <div className="score">
        <b className={state.failed ? 'hot' : 'accent'}>{score(state)}</b>
        {isMindReader(state) && <span className="mind-reader">🤯 Mind reader</span>}
      </div>
      <p className="lede">
        {state.failed ? 'Out of tries. A new puzzle comes out tomorrow.' : `Solved in ${plural(total, 'try')}.`}
      </p>
      <div className="solved-string">
        <TryString used={Math.min(total, MAX_TRIES)} max={MAX_TRIES} failed={state.failed} />
      </div>
      <div className="stats">
        <div>
          <b>{Math.min(total, MAX_TRIES)}</b>
          <small>{total === 1 ? 'try' : 'tries'}</small>
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

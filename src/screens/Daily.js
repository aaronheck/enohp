import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecording, getDaily, guessDaily } from '../api/client';
import useRecorder from '../audio/useRecorder';
import {
  PAR,
  getPuzzleState,
  getVoice,
  golf,
  plural,
  setVoice as saveVoice,
  shareText,
  streak,
  updatePuzzleState,
} from '../lib/daily';
import { shareLink } from '../lib/share';
import { Button, Notice, Screen } from '../ui/components';
import { RecordButton, ReversedPlayer } from '../ui/audio';
import { VibratingString } from '../ui/waves';
import './screens.css';
import './Daily.css';

const SITE = 'https://yelnatsgame.com';

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
          {loadError ? 'Hmm.' : 'Warming up'}
          <br />
          <span className="accent">{loadError ? '' : 'the robot…'}</span>
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
  const [voice, setVoiceState] = useState(() => {
    const saved = getVoice();
    return puzzle.voices.some((v) => v.id === saved) ? saved : puzzle.voices[0].id;
  });
  const [answers, setAnswers] = useState(null);
  const [guess, setGuess] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [mimic, setMimic] = useState(null);
  const recorder = useRecorder();
  const recording = recorder.status === 'recording';
  const update = (patch) => setState(updatePuzzleState(n, patch));

  // Coming back to an already-solved puzzle: fetch fresh answer audio links.
  useEffect(() => {
    if (state.solved && state.phrase && !answers) {
      guessDaily(n, state.phrase).then((r) => r.correct && setAnswers(r.answers), () => {});
    }
  }, [state.solved, state.phrase, answers, n]);

  const pickVoice = (id) => {
    setVoiceState(id);
    saveVoice(id);
  };

  async function stopMimic() {
    const blob = await recorder.stop();
    if (blob && blob.size) {
      setMimic(blob);
      update({ mimics: state.mimics + 1 });
    }
  }

  async function submit(e) {
    e.preventDefault();
    const g = guess.trim();
    if (!g || checking) return;
    setChecking(true);
    setError(null);
    try {
      const r = await guessDaily(n, g);
      if (r.correct) {
        setAnswers(r.answers);
        update({ solved: true, phrase: r.phrase, voice });
      } else {
        update({ guesses: [...state.guesses, g] });
        setGuess('');
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

  if (state.solved) {
    return <Solved n={n} state={state} answers={answers} voice={voice} days={days} top={top} />;
  }

  return (
    <Screen {...top}>
      <p className="step-note" style={{ marginTop: 14 }}>
        Daily puzzle #{n}
      </p>
      <h1 className="title title-sm">
        What's the
        <br />
        <span className="accent">robot saying?</span>
      </h1>

      <div className="section">
        <PuzzleClip url={puzzle.audio[voice]} />
        <div className="voice-row">
          <span className="voice-label">Robot voice</span>
          <div className="chips">
            {puzzle.voices.map((v) => (
              <button
                key={v.id}
                className={'chip chip-btn' + (v.id === voice ? ' chip-on' : '')}
                onClick={() => pickVoice(v.id)}
                aria-pressed={v.id === voice}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
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
      <Notice>{error}</Notice>

      <div className="par-box">
        <div>
          <b>Mimics: {state.mimics}</b>
          <small>Par {PAR} · guessing is free</small>
        </div>
        <div className="par-dots" aria-hidden="true">
          {Array.from({ length: Math.max(PAR, state.mimics) }, (_, i) => (
            <span key={i} className={'par-dot' + (i < state.mimics ? ' par-dot-used' : '')} />
          ))}
        </div>
      </div>

      <div className="mimic-box">
        <div className="mimic-head">
          <RecordButton
            recording={recording}
            starting={recorder.status === 'starting'}
            onStart={recorder.start}
            onStop={stopMimic}
            idleHint=""
          />
          <div>
            <b>{recording ? 'Recording… tap to stop' : state.mimics ? 'Mimic again' : 'Stuck? Mimic it'}</b>
            <small>Copy the robot's sound. We'll flip your recording so it sounds forwards. Costs a stroke.</small>
          </div>
        </div>
        {recording && <VibratingString active={recording} getLevel={recorder.getLevel} height={56} />}
        <Notice>{recorder.error}</Notice>
        {mimic && !recording && (
          <div style={{ marginTop: 12 }}>
            <ReversedPlayer blob={mimic} caption={`mimic #${state.mimics}, flipped`} dark autoPlay />
          </div>
        )}
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

function Solved({ n, state, answers, voice, days, top }) {
  const [status, setStatus] = useState(null);
  const g = golf(state.mimics);
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
        Daily #{n} · it was…
      </p>
      <div className="word-big">{state.phrase}</div>
      <div className="golf">
        <b className="accent">{g.name}</b>
        <span aria-hidden="true">{g.emoji}</span>
      </div>
      <p className="lede">
        Solved with {plural(state.mimics, 'mimic')}. Par is {PAR}.
      </p>
      <div className="stats">
        <div>
          <b>{state.mimics}</b>
          <small>{state.mimics === 1 ? 'mimic' : 'mimics'}</small>
        </div>
        <div>
          <b>{state.guesses.length + 1}</b>
          <small>guesses</small>
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

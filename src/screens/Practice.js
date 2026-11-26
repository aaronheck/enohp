import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchRecording } from '../api/client';
import useRecorder from '../audio/useRecorder';
import { reportError } from '../lib/errors';
import { stopShared, unlockAudio } from '../audio/context';
import { PRACTICE, coachStep, isCorrect, markPracticeDone, practiceAudio } from '../lib/practice';
import { Button, Notice, Screen } from '../ui/components';
import { ReversedPlayer } from '../ui/audio';
import { VibratingString } from '../ui/waves';
import CoachMark from '../ui/CoachMark';
import Confetti from '../ui/Confetti';
import MicWarmup from '../ui/MicWarmup';
import './screens.css';
import './Daily.css';

const STEPS = {
  listen: { target: '.practice-clip .player-play', text: 'Tap play to hear the puzzle. It’s a word said backwards.' },
  mimic: { target: '.mimic-cta', text: 'Now tap Mimic it and copy that sound out loud. Weird is good!' },
  stop: { target: '.mimic-cta', text: 'Go! Copy the sound you heard, then tap the red button to stop.' },
  hear: { target: '.mimic-list .player', text: 'This is you, flipped forwards. Listen: does it sound like a word?' },
};
const ORDER = ['listen', 'mimic', 'stop', 'hear'];
// Practice 2 only coaches the two key moves; practice 3 none.
const SHOWN = { full: ORDER, some: ['mimic', 'hear'], none: [] };

function useClip(url) {
  const [blob, setBlob] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setBlob(null);
    fetchRecording(url, { retries: 1 }).then(
      (b) => !cancelled && setBlob(b),
      (e) => reportError('audio', { msg: e && e.message, status: e && e.status, where: 'practice' })
    );
    return () => {
      cancelled = true;
    };
  }, [url]);
  return blob;
}

export default function Practice() {
  const { n: param } = useParams();
  const game = PRACTICE.find((p) => String(p.n) === param) || PRACTICE[0];
  // Fresh state per practice game.
  return <PracticeGame key={game.n} game={game} />;
}

function PracticeGame({ game }) {
  const puzzle = useClip(practiceAudio(game.n, 'puzzle'));
  const answer = useClip(practiceAudio(game.n, 'answer'));
  const [heard, setHeard] = useState(false);
  const [mimics, setMimics] = useState([]); // [{ index, blob }]
  // Tips run once: they end when the player acts after hearing their first mimic.
  const [coached, setCoached] = useState(false);
  const [guess, setGuess] = useState('');
  const [misses, setMisses] = useState([]);
  const [solved, setSolved] = useState(false);
  const recorder = useRecorder({ warm: heard && !solved }); // pre-open the mic if it's already allowed
  const recording = recorder.status === 'recording';
  const starting = recorder.status === 'starting';
  const { release } = recorder;

  useEffect(() => {
    if (solved) {
      release();
      markPracticeDone(game.n);
    }
  }, [solved, release, game.n]);

  const startMimic = () => {
    if (mimics.length) setCoached(true);
    unlockAudio();
    stopShared();
    recorder.start();
  };
  const stopMimic = async () => {
    unlockAudio();
    const blob = await recorder.stop();
    if (blob && blob.size) {
      setMimics((prev) => [...prev, { index: prev.length + 1, blob }]);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    setCoached(true);
    const g = guess.trim();
    if (!g) return;
    if (isCorrect(g, game.phrase)) setSolved(true);
    else {
      setMisses((m) => [...m, g]);
      setGuess('');
    }
  };

  const step = coachStep({ heard, recording, mimics: mimics.length, coached });
  const coach = step && !starting && SHOWN[game.coach].includes(step) ? STEPS[step] : null; // no tip while the mic warms up
  const next = PRACTICE.find((p) => p.n === game.n + 1);
  const top = { left: <Link to="/">← Daily puzzle</Link>, right: `Practice ${game.n} of ${PRACTICE.length}` };

  if (solved) {
    return (
      <Screen {...top}>
        <Confetti />
        <h1 className="title title-sm turn-title">
          You got it!
          <br />
          <span className="accent">“{game.phrase}”</span>
        </h1>
        <p className="lede" style={{ marginTop: 10 }}>
          {misses.length === 0 && mimics.length === 0
            ? 'First guess, no mimic. Mind reader!'
            : `That's how it works. ${next ? 'Ready for the next one?' : 'You’re ready for the real thing.'}`}
        </p>
        <div className="section">
          <ReversedPlayer blob={answer} caption="hear it forwards" dark compact reverse={false} />
        </div>
        <div className="spacer" />
        <div className="stack">
          {next ? (
            <Button to={`/practice/${next.n}`}>
              Practice {next.n}
              {next.coach === 'none' ? ': on your own' : ': fewer tips'} →
            </Button>
          ) : (
            <Button to="/">Play today’s puzzle →</Button>
          )}
          {next && (
            <Button variant="ghost" to="/">
              Skip to today’s puzzle
            </Button>
          )}
        </div>
      </Screen>
    );
  }

  return (
    <Screen {...top} className="practice">
      {coach && <CoachMark target={coach.target} text={coach.text} step={game.coach === 'full' ? ORDER.indexOf(step) + 1 : null} total={game.coach === 'full' ? ORDER.length : null} onClose={() => setCoached(true)} />}
      <h1 className="title title-sm turn-title">
        Practice {game.n}
        <br />
        <span className="accent">
          {game.coach === 'full' ? 'Step by step.' : game.coach === 'some' ? 'A few tips.' : 'On your own.'}
        </span>
      </h1>
      <p className="lede" style={{ marginTop: 8 }}>
        A warm-up with an easy word. Nothing counts here.
      </p>

      <div className="section practice-clip">
        <ReversedPlayer
          blob={puzzle}
          caption={heard ? 'the puzzle' : 'tap to hear the puzzle'}
          tilt
          hideDuration
          tapAnywhere
          highlight={!heard}
          onEnded={() => setHeard(true)}
          reverse={false}
        />
      </div>

      <div className="mimic-area">
        {starting && <MicWarmup height={56} />}
        {recording && <VibratingString active getLevel={recorder.getLevel} height={56} />}
        <Button
          variant={recording || starting || !mimics.length ? 'primary' : 'ghost'}
          onClick={recording ? stopMimic : startMimic}
          disabled={!heard || starting}
          className={'mimic-cta' + (starting ? ' mimic-starting' : recording ? ' mimic-recording' : '')}
        >
          {starting ? (
            'Getting the mic ready…'
          ) : recording ? (
            <>
              <span className="rec-dot" aria-hidden="true" />
              Recording · tap to stop
            </>
          ) : mimics.length ? (
            '🎙 Mimic again'
          ) : (
            '🎙 Mimic it'
          )}
        </Button>
        <p className={'cta-note' + (recording ? ' go' : '')}>
          {starting
            ? 'Don’t start yet. It turns red when it’s listening.'
            : recording
            ? 'Go! Copy the sound you just heard.'
            : heard
            ? 'Copy the puzzle sound. We’ll flip it forwards.'
            : 'Listen to the puzzle first.'}
        </p>
        <Notice>{recorder.error}</Notice>
      </div>

      {!recording && mimics.length > 0 && (
        <div className="mimic-list">
          {mimics
            .slice()
            .reverse()
            .map((m, i) => (
              <ReversedPlayer
                key={m.index}
                blob={m.blob}
                caption={`mimic #${m.index}, flipped`}
                dark
                compact
                autoPlay={i === 0}
              />
            ))}
        </div>
      )}

      <div className="guess-area">
        <label className="label" htmlFor="practice-guess">
          What does it say?
        </label>
        {misses.length > 0 && (
          <div className="misses" aria-label="Wrong guesses">
            {misses.map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>
        )}
        <form className="guess-row" onSubmit={submit}>
          <input
            id="practice-guess"
            className="input"
            value={guess}
            onChange={(e) => {
              setGuess(e.target.value);
              if (mimics.length) setCoached(true);
            }}
            onFocus={() => mimics.length && setCoached(true)}
            placeholder="Your guess"
            aria-label="Your guess"
            autoComplete="off"
            autoCapitalize="off"
            maxLength={60}
            disabled={!heard}
          />
          <Button type="submit" variant={mimics.length ? 'primary' : 'ghost'} disabled={!heard || !guess.trim()} className="guess-btn">
            Guess
          </Button>
        </form>
        {misses.length > 0 && <p className="practice-hint">💡 Hint: {game.hint}</p>}
      </div>
      <div className="spacer" />
    </Screen>
  );
}

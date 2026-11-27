import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchRecording, getDaily, guessDaily, revealDaily } from '../api/client';
import useRecorder from '../audio/useRecorder';
import { ding, nope, sadTrombone } from '../audio/sfx';
import {
  ACTION_LABEL,
  MAX_TRIES,
  actionEmoji,
  canMimic,
  msUntilNextPuzzle,
  getPuzzleState,
  isMindReader,
  score,
  rating,
  triesTone,
  triesUsed,
  plural,
  shareText,
  hasPlayedDaily,
  howtoSeen,
  markHowtoSeen,
  streak,
  updatePuzzleState,
  longDate,
} from '../lib/daily';
import { shareLink } from '../lib/share';
import { drawShareImage } from '../lib/shareImage';
import { listMimics, saveMimic } from '../lib/mimicStore';
import { stopShared, unlockAudio } from '../audio/context';
import { isDev, resetDaily } from '../lib/devReset';
import { deviceContext, track } from '../lib/analytics';
import { reportError } from '../lib/errors';
import { SLOGAN } from '../lib/brand';
import { IS_ADMIN, finishPlay, serverMimics, uploadMimic } from '../lib/admin';
import AdminReview from '../ui/AdminReview';
import { practiceDone } from '../lib/practice';
import { Button, Notice, Screen } from '../ui/components';
import { ReversedPlayer } from '../ui/audio';
import { VibratingString } from '../ui/waves';
import TryDots from '../ui/TryDots';
import Confetti from '../ui/Confetti';
import MicWarmup from '../ui/MicWarmup';
import { MicTipCard, MicTipPopup } from '../ui/MicTip';
import { shouldPopMicTip, shouldShowMicCard } from '../lib/micTip';
import DailyHowTo from '../ui/DailyHowTo';
import PastPuzzles from '../ui/PastPuzzles';
import PuzzleVideo, { canMakeVideo } from '../ui/PuzzleVideo';
import StatsSheet from '../ui/StatsSheet';
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
      (e) => {
        reportError('audio', { msg: e && e.message, status: e && e.status, where: 'clip' });
        if (!cancelled) setError("Couldn't load the audio.");
      },
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

  // /puzzle/4 plays a past puzzle (the backend allows the last 5).
  const params = useParams();
  const target = Number(params.n) || forced;

  useEffect(() => {
    let cancelled = false;
    setPuzzle(null);
    getDaily(target).then(
      (p) => !cancelled && setPuzzle(p),
      (e) => {
        reportError('api', { what: 'daily', msg: e.message, status: e.status });
        if (!cancelled) setLoadError(e.status === 503 ? "Today's puzzle isn't ready yet. Check back soon!" : e.message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (loadError) {
    return (
      <Screen left="yelnats">
        <h1 className="title title-sm turn-title">Hmm.</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          {loadError}
        </p>
        <div className="spacer" />
        <Button variant="ghost" to="/friends">
          Play with friends instead
        </Button>
      </Screen>
    );
  }
  if (!puzzle) return <PuzzleSkeleton />;

  return <Puzzle key={puzzle.number} puzzle={puzzle} forced={!params.n && forced && puzzle.number === forced} />;
}

/**
 * While today's puzzle loads: the same layout, greyed out and shimmering, with nothing
 * to tap. (It used to show a lone "Play with friends" button, which people tapped.)
 */
function PuzzleSkeleton() {
  return (
    <Screen left="yelnats" right={<span className="skel skel-pill" />}>
      <div className="daily-head" aria-busy="true">
        <h1 className="title title-sm">
          Yelnats Daily
          <br />
          <span className="accent skel-text">Puzzle #…</span>
        </h1>
      </div>
      <p className="lede" style={{ marginTop: 8 }}>
        Rewinding today’s puzzle…
      </p>
      <div className="section">
        <div className="skel skel-player" role="status" aria-label="Loading today's puzzle" />
      </div>
      <div className="mimic-area">
        <div className="skel skel-button" />
      </div>
      <div className="guess-area">
        <div className="skel skel-input" />
      </div>
    </Screen>
  );
}

function Puzzle({ puzzle, forced }) {
  const n = puzzle.number;
  const archive = !!puzzle.archive; // a past puzzle, played late
  const [state, setState] = useState(() => getPuzzleState(n));
  // One voice for now; the backend still offers others for later.
  const voice = puzzle.audio[DEFAULT_VOICE] ? DEFAULT_VOICE : puzzle.voices[0].id;
  const [answers, setAnswers] = useState(null);
  const [guess, setGuess] = useState('');
  const [checking, setChecking] = useState(false);
  const [micPop, setMicPop] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [justSolved, setJustSolved] = useState(false); // confetti only for a solve this visit, not on reload
  const [error, setError] = useState(null);
  const [mimics, setMimics] = useState([]); // [{ index, blob }], oldest first
  const [justRecorded, setJustRecorded] = useState(null);
  // Open the how-to automatically the first time someone plays any daily puzzle.
  // Inside Instagram/TikTok etc. the "open in your browser" banner comes first.
  const autoHow = () => !IS_ADMIN && !hasPlayedDaily() && !howtoSeen() && !deviceContext().in_app;
  const [howOpen, setHowOpen] = useState(autoHow);
  const [howSource, setHowSource] = useState(() => (autoHow() ? 'auto' : 'button'));
  const navigate = useNavigate();

  // Analytics: one view per puzzle load (and whether the how-to opened by itself).
  useEffect(() => {
    track('daily_view', {
      puzzle: n,
      forced: !!forced,
      archive,
      returning: hasPlayedDaily(),
      streak: streak(n),
      state: state.solved ? 'solved' : state.failed ? 'failed' : state.mimics || state.guesses.length ? 'in_progress' : 'new',
    });
    if (howOpen) track('howto_open', { game: 'daily', source: 'auto' });
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  // Once they've heard the puzzle, open the mic in the background (only if it's already
  // allowed) so Mimic it starts right away.
  const recorder = useRecorder({
    warm: (state.heard || state.mimics > 0 || state.guesses.length > 0) && !state.solved && !state.failed && canMimic(state),
  });
  const recording = recorder.status === 'recording';
  const [shake, setShake] = useState(0);
  const update = (patch) => setState(updatePuzzleState(n, patch));

  // Coming back to a finished puzzle: fetch fresh answer audio links.
  useEffect(() => {
    if (answers) return;
    if (state.failed)
      revealDaily(n).then(
        (r) => setAnswers(r.answers),
        () => {},
      );
    else if (state.solved && state.phrase) {
      guessDaily(n, state.phrase).then(
        (r) => r.correct && setAnswers(r.answers),
        () => {},
      );
    }
  }, [state.solved, state.failed, state.phrase, answers, n]);

  // Earlier mimics for this puzzle, saved on this device.
  useEffect(() => {
    let cancelled = false;
    listMimics(n)
      .then((saved) => (saved.length || !IS_ADMIN ? saved : serverMimics(n)))
      .then((saved) => !cancelled && setMimics(saved));
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
      if (IS_ADMIN) uploadMimic(n, blob);
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
        ding();
        setAnswers(r.answers);
        const done = { ...state, solved: true };
        track('guess', { puzzle: n, correct: true, try: used + 1 });
        track('daily_solved', {
          puzzle: n,
          tries: triesUsed(done),
          mimics: state.mimics,
          mind_reader: isMindReader(done),
          archive,
        });
        setJustSolved(true);
        update({ solved: true, phrase: r.phrase, voice, actions: [...state.actions, 'hit'], ...(archive ? { late: true } : {}) });
        if (IS_ADMIN)
          finishPlay(n, { outcome: 'solved', tries: triesUsed(done), mimics: state.mimics, actions: [...state.actions, 'hit'] });
      } else {
        const next = { guesses: [...state.guesses, g], actions: [...state.actions, 'miss'] };
        nope();
        setShake((k) => k + 1);
        track('guess', { puzzle: n, correct: false, try: used + 1, text: g });
        setGuess('');
        if (triesUsed({ ...state, ...next }) >= MAX_TRIES) {
          // Out of tries: show the answer.
          const rev = await revealDaily(n);
          setAnswers(rev.answers);
          track('daily_failed', { puzzle: n, mimics: state.mimics });
          sadTrombone();
          if (IS_ADMIN) finishPlay(n, { outcome: 'failed', tries: MAX_TRIES, mimics: state.mimics, actions: next.actions });
          update({ ...next, failed: true, phrase: rev.phrase, voice, ...(archive ? { late: true } : {}) });
        } else {
          update(next);
        }
      }
    } catch (err) {
      reportError('api', { what: 'guess', msg: err.message, status: err.status });
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
    left: IS_ADMIN ? <Link to="/">← All candidates</Link> : 'yelnats',
    right: IS_ADMIN ? (
      `Candidate #${n}`
    ) : forced ? (
      <span className="forced-tag">forced #{n}</span>
    ) : archive ? (
      <Link to="/">Today’s puzzle →</Link>
    ) : (
      <button className="btn-text streak-btn" onClick={() => setStatsOpen(true)} aria-label="Your stats">
        {days > 0 ? `🔥 ${plural(days, 'day')}` : `📊 Daily #${n}`}
      </button>
    ),
  };

  if (state.solved || state.failed) {
    return (
      <>
        {justSolved && <Confetti />}
        <Solved
          n={n}
          state={state}
          answers={answers}
          voice={voice}
          days={days}
          top={top}
          mimics={mimics}
          puzzle={puzzle}
          onStats={() => setStatsOpen(true)}
        />
        <StatsSheet
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          today={puzzle.today || n}
          todayState={archive ? null : state}
        />
      </>
    );
  }

  // Until the first mimic, the Mimic button leads; after it, the Guess button does.
  const firstMimic = state.mimics === 0;
  // You have to hear the puzzle all the way through once before mimicking or guessing.
  const heard = state.heard || state.mimics > 0 || state.guesses.length > 0;
  const starting = recorder.status === 'starting';
  const beginRecording = () => {
    unlockAudio(); // during the tap, so the flipped take can autoplay
    stopShared(); // don't record the puzzle playing
    recorder.start();
  };
  const startMimic = () => {
    // 3rd day on iPhone Safari: first show how to stop Safari asking for the mic every time.
    if (shouldPopMicTip(n)) {
      stopShared();
      track('howto_open', { game: 'mic', source: 'popup', puzzle: n });
      setMicPop(true);
      return;
    }
    beginRecording();
  };
  const finishMimic = () => {
    unlockAudio();
    stopMimic();
  };

  return (
    <Screen {...top}>
      <p className="daily-date">
        {longDate(puzzle.date)}
        {archive && <span className="daily-date-past"> · past puzzle</span>}
      </p>
      <div className="daily-head daily-head-dated">
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
          markHowtoSeen();
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
        {starting && <MicWarmup height={56} />}
        {recording && <VibratingString active getLevel={recorder.getLevel} height={56} />}
        <Button
          variant={recording || starting || firstMimic ? 'primary' : 'ghost'}
          onClick={recording ? finishMimic : startMimic}
          disabled={starting || (!recording && (!mimicOk || !heard))}
          className={
            'mimic-cta' +
            (starting
              ? ' mimic-starting'
              : recording
                ? ' mimic-recording'
                : heard && firstMimic && mimicOk
                  ? ' mimic-shimmer'
                  : '')
          }
        >
          {starting ? (
            'Getting the mic ready…'
          ) : recording ? (
            <>
              <span className="rec-dot" aria-hidden="true" />
              Recording · tap to stop
            </>
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
        <p className={'cta-note' + (recording ? ' go' : '')}>
          {starting
            ? 'Don’t start yet. It turns red when it’s listening.'
            : recording
              ? 'Go! Copy the sound you just heard.'
              : !heard
                ? 'Listen to the puzzle first.'
                : !mimicOk
                  ? 'Your last try has to be a guess.'
                  : 'Mimic the puzzle audio to decode the word.'}
        </p>
        <Notice>{recorder.error}</Notice>
        <MicTipPopup
          open={micPop}
          puzzle={n}
          onContinue={() => {
            setMicPop(false);
            beginRecording();
          }}
        />
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
        <form className={'guess-row' + (shake ? ' shake' : '')} key={`guess-${shake}`} onSubmit={submit}>
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
      {!IS_ADMIN && (
        <>
          <p className="slogan">{SLOGAN}</p>
          <div className="daily-foot">
            <Link to="/friends" onClick={() => track('play_with_friends', { from: 'puzzle' })}>
              Play with friends
            </Link>
            <Link to="/practice/1">Practice</Link>
            <Link to="/past">Past puzzles</Link>
            <Link to="/previous">My chains</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
        </>
      )}
      <DevReset />
      <StatsSheet open={statsOpen} onClose={() => setStatsOpen(false)} today={puzzle.today || n} todayState={null} />
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

function Solved({ n, state, answers, voice, days, top, mimics, puzzle, onStats }) {
  const archive = !!puzzle.archive;
  const [status, setStatus] = useState(null);
  const [showMimics, setShowMimics] = useState(false);
  const [image, setImage] = useState(null);
  const [micTip, setMicTip] = useState(() => shouldShowMicCard(n));
  const [videoOk] = useState(() => canMakeVideo());
  const [videoError, setVideoError] = useState(null);
  const total = triesUsed(state);
  const rated = rating(state);
  const answerVoice = state.voice || voice;
  // Older saves may name a voice we no longer serve: fall back to the one we do.
  const answer = useClip(answers ? answers[answerVoice] || Object.values(answers)[0] : null);
  const link = `${SITE}/p/${n}`; // shows a preview card for this puzzle
  const text = shareText(n, state, link, days, puzzle.date);
  const next = useCountdown();
  const actions = state.actions && state.actions.length ? state.actions : [state.failed ? 'miss' : 'hit'];

  // Draw the share image up front: phones only open the share sheet straight from a tap.
  useEffect(() => {
    let cancelled = false;
    drawShareImage({
      number: n,
      date: longDate(puzzle.date),
      score: score(state),
      rating: rated,
      tone: triesTone(state),
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
    const r = await shareLink(link, text.replace(`\n${link}`, ''), { copyText: text, file: image });
    track('share', { puzzle: n, result: r, method: image ? 'image' : 'text', solved: !!state.solved });
    setStatus({ shared: 'Shared!', copied: 'Result copied. Paste it anywhere.', failed: "Couldn't share this time." }[r] || null);
  }

  return (
    <Screen {...top}>
      <div className="result-card">
        <p className="result-date">{longDate(puzzle.date)}</p>
        <p className="result-kicker">Yelnats Daily · Puzzle #{n}</p>
        <div className={'result-rating' + (state.failed ? ' hot' : '')}>
          <span className="result-emoji" aria-hidden="true">
            {rated.emoji}
          </span>
          <span className="result-word">{rated.word}</span>
        </div>
        <p className="result-line">{rated.line}</p>
        <div className="result-dots" aria-hidden="true">
          {Array.from({ length: MAX_TRIES }, (_, i) => (
            <i key={i} className={i < Math.min(total, MAX_TRIES) ? `on ${triesTone(state)}` : ''} />
          ))}
        </div>
        <div className="result-moves" aria-label="Your moves">
          {actions.map((a, i) => (
            <span key={i} className={'move move-' + a}>
              {actionEmoji(a)} {ACTION_LABEL[a]}
            </span>
          ))}
        </div>
        {days >= 2 && <span className="result-streak">🔥 {days}-day streak</span>}
      </div>

      <div className="answer-row">
        <div>
          <p className="step-note">{state.failed ? 'The answer was' : 'It was'}</p>
          <div className="answer-word">{state.phrase}</div>
        </div>
      </div>
      <ReversedPlayer blob={answer.blob} error={answer.error} caption="hear it forwards" dark compact reverse={false} />
      {mimics.length > 0 && (
        <div className="mimics-near">
          <button className="btn-text mimics-toggle" onClick={() => setShowMimics((v) => !v)} aria-expanded={showMimics}>
            {showMimics ? '▾' : '▸'} Your mimics ({mimics.length})
          </button>
          {showMimics && <MimicList mimics={mimics} />}
        </div>
      )}

      {IS_ADMIN && <AdminReview n={n} state={state} />}
      {!IS_ADMIN && (
        <>
          {/* Bragging: one row, two ways (image card or video). */}
          <div className={'brag-row' + (videoOk ? '' : ' single')}>
            <button className="btn btn-primary brag-btn" onClick={share}>
              🖼 Brag with an image
            </button>
            {videoOk && (
              <PuzzleVideo
                url={puzzle.audio[puzzle.audio[voice] ? voice : Object.keys(puzzle.audio)[0]]}
                n={n}
                date={puzzle.date}
                mimic={mimics.length ? mimics[mimics.length - 1].blob : null}
                result={{
                  tries: total,
                  used: total,
                  failed: !!state.failed,
                  mindReader: isMindReader(state),
                  actions,
                  streak: days,
                  rating: rated,
                }}
                onError={setVideoError}
              />
            )}
          </div>
          {status && (
            <p className="muted center" style={{ marginTop: 8 }}>
              {status}
            </p>
          )}
          {videoError && <p className="pvideo-err">{videoError}</p>}
          {archive ? (
            <p className="next-puzzle">
              {state.failed ? 'Out of tries. ' : ''}
              <Link to="/">Back to today’s puzzle →</Link>
            </p>
          ) : (
            <p className="next-puzzle">
              {state.failed ? 'Out of tries. ' : ''}Next puzzle in <b>{next}</b>
              <span aria-hidden="true"> · </span>
              <button className="btn-text stats-link" onClick={onStats}>
                📊 Your stats
              </button>
            </p>
          )}
          {micTip && <MicTipCard puzzle={n} onGone={() => setMicTip(false)} />}
          <PastPuzzles today={puzzle.today} todayDate={puzzle.todayDate} title={archive ? 'More past puzzles' : undefined} />
        </>
      )}

      <div className="spacer" />
      {!IS_ADMIN && (
        <>
          <p className="slogan">{SLOGAN}</p>
          <p className="solved-foot">
            <Link to="/friends" onClick={() => track('play_with_friends', { from: 'solved' })}>
              Play with friends
            </Link>
            <span aria-hidden="true"> · </span>
            <Link to="/practice/1">Practice</Link>
            <span aria-hidden="true"> · </span>
            <Link to="/privacy">Privacy</Link>
          </p>
        </>
      )}
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

/** /past: the last few puzzles, for anyone who missed a day. */
export function PastScreen() {
  const [today, setToday] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    getDaily().then(setToday, (e) => setError(e.message));
  }, []);
  return (
    <Screen left={<Link to="/">← Today’s puzzle</Link>}>
      <h1 className="title title-sm">Past puzzles</h1>
      <p className="lede" style={{ marginTop: 8 }}>
        Missed a day? The last 5 puzzles are free to play. They don’t count toward your streak.
      </p>
      {error && <Notice>{error}</Notice>}
      {!today && !error && <div className="skel skel-player" style={{ marginTop: 24 }} />}
      {today && <PastPuzzles today={today.today} todayDate={today.todayDate} title="" />}
    </Screen>
  );
}

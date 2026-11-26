import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchRecording, getGame, submitTurn } from '../api/client';
import useRecorder from '../audio/useRecorder';
import { initialTurn, turnReducer } from '../lib/turnFlow';
import { getNickname, getPlayedGames, rememberGame, setNickname } from '../lib/storage';
import { gameUrl, shareLink } from '../lib/share';
import { Button, ChainAvatars, Notice, Screen, StageChips } from '../ui/components';
import { VibratingString } from '../ui/waves';
import { RecordButton, ReversedPlayer } from '../ui/audio';
import HowToPlaySheet from '../ui/HowToPlaySheet';
import { track } from '../lib/analytics';
import Chain from '../ui/Chain';
import './screens.css';

const CHIPS = [
  { key: 'guess', label: 'guess' },
  { key: 'say', label: 'say it' },
  { key: 'copy', label: 'flip it' },
  { key: 'sent', label: 'pass it on' },
];

const SHARE_TEXT = 'Your turn in Yelnats. What did I say?';

function sendErrorMessage(e, alreadyShared) {
  if (e.status === 400 && /turn key/i.test(e.message)) {
    return 'Someone else played this turn before you. Reload to hear their recording.';
  }
  const msg = e.message || 'Something went wrong sending your turn.';
  return alreadyShared
    ? `${msg} The link went out, but your recording didn't save — tap Send again before they open it.`
    : msg;
}

export default function Turn() {
  const [params] = useSearchParams();
  const gameId = params.get('id');
  const [game, setGame] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [prevBlob, setPrevBlob] = useState(null);
  const [prevError, setPrevError] = useState(null);
  const [turn, dispatch] = useReducer(turnReducer, initialTurn);
  const [nickname, setNick] = useState(getNickname);
  const recorder = useRecorder();
  // null | 'pending' (sheet open) | 'shared' | 'copied' | 'cancelled' | 'failed'
  const [shareState, setShareState] = useState(null);
  const linkSent = useRef(false);
  // Open the how-to-play slideshow automatically for people who have never played
  // on this device (no finished turns and no saved name).
  const [howOpen, setHowOpen] = useState(() => !getPlayedGames().length && !getNickname());

  useEffect(() => {
    let cancelled = false;
    getGame(gameId).then(
      (g) => !cancelled && setGame(g),
      (e) => !cancelled && setLoadError(e.status === 404 ? "We couldn't find that game." : e.message)
    );
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const prevTurn = game && game.turns.length ? game.turns[game.turns.length - 1] : null;

  // Analytics: someone opened a turn (starting a chain, or a friend's link).
  useEffect(() => {
    if (!game) return;
    const starter = !game.turns.length;
    track('turn_opened', { turn: game.turns.length + 1, starter, new_player: !getPlayedGames().length && !getNickname() });
    if (!starter && !getPlayedGames().length && !getNickname()) track('howto_open', { game: 'chain', source: 'auto' });
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!prevTurn) return;
    // Retry briefly: the link can arrive moments before the upload finishes.
    fetchRecording(prevTurn.signedGet, { retries: 4 }).then(setPrevBlob, (e) => setPrevError(e.message));
  }, [prevTurn]);

  // Turn sent: give the microphone back.
  const { release } = recorder;
  useEffect(() => {
    if (turn.stage === 'sent') release();
  }, [turn.stage, release]);

  if (loadError) {
    return (
      <Screen left={<Link to="/">yelnats</Link>}>
        <h1 className="title title-sm turn-title">Hmm.</h1>
        <p className="lede" style={{ marginTop: 12 }}>{loadError}</p>
        <div className="spacer" />
        <Button to="/">Back home</Button>
      </Screen>
    );
  }

  if (!game) {
    return (
      <Screen left={<Link to="/">yelnats</Link>}>
        <p className="lede turn-title">Dialing in…</p>
      </Screen>
    );
  }

  const isStarter = !prevTurn;
  const turnNumber = game.turns.length + 1;
  const prevName = prevTurn ? prevTurn.nickname || 'Someone' : null;
  const recording = recorder.status === 'recording';
  const starting = recorder.status === 'starting';

  async function stopAnd(type) {
    const blob = await recorder.stop();
    if (blob && blob.size) dispatch({ type, blob });
  }

  // The game link never changes between turns, so the share sheet opens in the
  // same tap (Safari requires that) while the recording uploads alongside it.
  function send() {
    const name = nickname.trim();
    if (!name || turn.sending) return;
    setNickname(name);
    dispatch({ type: 'SEND' });
    const upload = submitTurn({
      gameId,
      consistencyToken: prevTurn ? prevTurn.consistencyToken : '',
      nickname: name,
      guess: turn.guess,
      recording: turn.backwards,
    });
    if (!linkSent.current) {
      setShareState('pending');
      shareLink(gameUrl(gameId), SHARE_TEXT).then((r) => {
        track('share', { game: 'chain', result: r, method: 'link', turn: turnNumber });
        if (r === 'shared' || r === 'copied') linkSent.current = true;
        setShareState(r);
      });
    }
    upload.then(
      () => {
        rememberGame({ id: gameId, guess: turn.guess, turn: turnNumber });
        track('turn_sent', { turn: turnNumber });
        dispatch({ type: 'SENT' });
      },
      (e) => dispatch({ type: 'SEND_FAILED', error: sendErrorMessage(e, linkSent.current) })
    );
  }

  const top = { left: <Link to="/">yelnats</Link>, right: `turn ${turnNumber}` };

  // ---------- guess ----------
  if (turn.stage === 'guess') {
    const submit = (e) => {
      e.preventDefault();
      dispatch({ type: 'CONFIRM_GUESS' });
    };
    return (
      <Screen {...top}>
        {!isStarter && (
          <div className="turn-head turn-head-row">
            <ChainAvatars names={game.turns.map((t) => t.nickname || '?')} />
            <button
              className="how-btn"
              onClick={() => {
                setHowOpen(true);
                track('howto_open', { game: 'chain', source: 'button' });
              }}
            >
              How to play
            </button>
          </div>
        )}
        <HowToPlaySheet
          open={howOpen && !isStarter}
          onClose={(how, slide) => {
            setHowOpen(false);
            track('howto_close', { game: 'chain', how, slide: (slide || 0) + 1 });
          }}
          from={prevName}
        />
        <h1 className="title title-sm turn-title">
          {isStarter ? (
            <>
              You're first.
              <br />
              <span className="accent">Pick a word.</span>
            </>
          ) : (
            <>
              {prevName}'s on
              <br />
              the line.
            </>
          )}
        </h1>
        {isStarter ? (
          <p className="lede" style={{ marginTop: 12 }}>
            A word or short phrase. Fun to say, hard to say backwards.
          </p>
        ) : (
          <div className="section">
            <ReversedPlayer blob={prevBlob} error={prevError} caption="rewound for you" tilt />
          </div>
        )}
        <form className="section" onSubmit={submit}>
          <label className="label" htmlFor="guess" style={{ display: 'block' }}>
            {isStarter ? 'Your word' : `What did ${prevName} say?`}
          </label>
          <input
            id="guess"
            className="input"
            value={turn.guess}
            onChange={(e) => dispatch({ type: 'SET_GUESS', guess: e.target.value })}
            placeholder={isStarter ? 'pickle jar' : 'I think it was…'}
            autoComplete="off"
            autoCapitalize="off"
            maxLength={60}
          />
          <Button type="submit" disabled={!turn.guess.trim()} style={{ marginTop: 14 }}>
            {isStarter ? 'Use this word' : 'Lock in guess'}
          </Button>
        </form>
      </Screen>
    );
  }

  // ---------- sent ----------
  if (turn.stage === 'sent') {
    return <Sent gameId={gameId} top={top} shared={shareState} />;
  }

  // ---------- say + copy ----------
  return (
    <Screen {...top}>
      <div className="turn-head">
        <StageChips stages={CHIPS} current={turn.stage} />
      </div>

      {turn.stage === 'say' && (
        <>
          <p className="step-note" style={{ marginTop: 24 }}>Say it forwards, normally</p>
          <div className="word-big">{turn.guess}</div>
          <p className="lede" style={{ marginTop: 10 }}>
            We'll flip your recording so you can hear what to copy.
          </p>
          <div className="spacer" />
          <VibratingString active={recording} getLevel={recorder.getLevel} />
          <div className="section">
            <Notice>{recorder.error}</Notice>
            <RecordButton
              recording={recording}
              starting={starting}
              onStart={recorder.start}
              onStop={() => stopAnd('RECORDED_FORWARDS')}
              idleHint="Tap to record"
            />
          </div>
          <div className="link-actions">
            <button className="btn-text" onClick={() => dispatch({ type: 'EDIT_GUESS' })} disabled={recording}>
              ← Change {isStarter ? 'word' : 'guess'}
            </button>
          </div>
        </>
      )}

      {turn.stage === 'copy' && (
        <>
          <p className="step-note" style={{ marginTop: 22 }}>1 · This is “{turn.guess}” flipped</p>
          <ReversedPlayer blob={turn.forwards} caption="your word, flipped" dark autoPlay />
          <div className="link-actions" style={{ marginTop: 4 }}>
            <button
              className="btn-text"
              onClick={() => dispatch({ type: 'REDO_FORWARDS' })}
              disabled={recording || turn.sending}
            >
              ↺ Redo forwards
            </button>
          </div>

          <p className="step-note" style={{ marginTop: 14 }}>2 · Now copy that sound</p>
          {!turn.backwards ? (
            <>
              <VibratingString active={recording} getLevel={recorder.getLevel} />
              <div className="section">
                <Notice>{recorder.error}</Notice>
                <RecordButton
                  recording={recording}
                  starting={starting}
                  onStart={recorder.start}
                  onStop={() => stopAnd('RECORDED_BACKWARDS')}
                  idleHint="Tap to record it backwards"
                />
              </div>
            </>
          ) : (
            <>
              <ReversedPlayer blob={turn.backwards} caption="how the next person hears it" autoPlay />
              <div className="link-actions">
                <button
                  className="btn-text"
                  onClick={() => dispatch({ type: 'REDO_BACKWARDS' })}
                  disabled={turn.sending}
                >
                  ↺ Try again
                </button>
              </div>
              <div className="spacer" />
              <div className="stack">
                {!getNickname() && (
                  <div>
                    <label className="label" htmlFor="nick" style={{ display: 'block' }}>
                      Your name (so the chain knows who you are)
                    </label>
                    <input
                      id="nick"
                      className="input input-sm"
                      value={nickname}
                      onChange={(e) => setNick(e.target.value)}
                      placeholder="Air Bud"
                      maxLength={24}
                      autoComplete="nickname"
                    />
                  </div>
                )}
                <Notice>{turn.error}</Notice>
                <Button onClick={send} disabled={turn.sending || !nickname.trim()}>
                  {turn.sending ? 'Sending…' : turn.error ? 'Send again' : 'Send it on'}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const SHARE_STATUS = {
  shared: 'Shared! Send it to more people if you like — the first to play takes the turn.',
  copied: 'Link copied. Paste it to the next person.',
  failed: "Couldn't open sharing. Copy the link below instead.",
};

function Sent({ gameId, top, shared }) {
  const [again, setAgain] = useState(null);
  const [game, setGame] = useState(null);
  const status = again || SHARE_STATUS[shared] || null;
  const linkOut = shared === 'shared' || shared === 'copied';
  const url = gameUrl(gameId);

  // Reload the game so the chain includes this turn (and fresh playback links).
  useEffect(() => {
    let cancelled = false;
    getGame(gameId).then((g) => !cancelled && setGame(g), () => {});
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  async function share() {
    const result = await shareLink(url, SHARE_TEXT);
    track('share', { game: 'chain', result, method: 'link', again: true });
    setAgain(SHARE_STATUS[result] || null);
  }

  return (
    <Screen {...top}>
      <h1 className="title turn-title">
        Sent.
        <br />
        <span className="accent">Pass it on.</span>
      </h1>
      <p className="lede" style={{ marginTop: 12 }}>
        Here's the chain so far. Tap anyone to hear their recording.
      </p>
      <div className="section">
        {game ? (
          <Chain turns={game.turns} lastNote="that's you" waiting />
        ) : (
          <p className="muted">Winding the string…</p>
        )}
      </div>
      <div className="spacer" />
      <div className="stack sent-actions">
        {status && <p className="muted center">{status}</p>}
        <Button onClick={share} variant={linkOut ? 'ghost' : 'primary'}>
          {linkOut ? 'Share again' : 'Share the link'}
        </Button>
        <input className="input input-sm" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Game link" />
      </div>
    </Screen>
  );
}


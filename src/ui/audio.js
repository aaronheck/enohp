import React, { useEffect, useRef } from 'react';
import useReversedPlayer from '../audio/useReversedPlayer';
import { stopShared, unlockAudio } from '../audio/context';
import { PlayIcon, StopIcon } from './components';
import { Waveshape } from './waves';

function fmt(seconds) {
  if (!seconds) return '0:00';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Card that plays a recording rewound, with a ½× toggle. */
export function ReversedPlayer({ blob, caption, dark, tilt, error: loadError, autoPlay, reverse = true }) {
  const p = useReversedPlayer(blob, { reverse });
  const error = loadError || p.error;
  const slow = p.rate !== 1;

  // Changing speed mid-play is confusing; stop first.
  useEffect(() => p.stop, [p.rate, p.stop]);

  // Auto-play each new recording once, as soon as it's processed.
  const autoPlayed = useRef(null);
  const { ready, play } = p;
  useEffect(() => {
    if (autoPlay && ready && autoPlayed.current !== blob) {
      autoPlayed.current = blob;
      play();
    }
  }, [autoPlay, ready, blob, play]);

  const toggle = () => {
    unlockAudio();
    p.toggle();
  };

  return (
    <div className={'player' + (dark ? ' player-dark' : '') + (tilt ? ' player-tilt' : '')}>
      <div className="player-main">
        <button
          className="player-play"
          onClick={toggle}
          disabled={!p.ready}
          aria-label={p.playing ? 'Stop' : 'Play'}
        >
          {p.playing ? <StopIcon /> : <PlayIcon />}
        </button>
        <Waveshape peaks={error ? [] : p.peaks} progress={p.progress} color={dark ? 'var(--butter)' : 'var(--ink)'} />
      </div>
      <div className="player-meta">
        <span>{error ? error : p.ready ? `${fmt(p.duration)} · ${caption}` : 'Loading…'}</span>
        <button aria-pressed={slow} onClick={() => p.setRate(slow ? 1 : 0.5)}>
          ½× slow
        </button>
      </div>
    </div>
  );
}

/** Big tap-to-start / tap-to-stop record button. */
export function RecordButton({ recording, starting, onStart, onStop, disabled, idleHint }) {
  const hint = starting ? 'Waiting for the mic…' : recording ? 'Recording — tap to stop' : idleHint;
  return (
    <div className="rec-wrap">
      <button
        className={'rec' + (recording ? ' rec-on' : '')}
        onClick={() => {
          // Unlock playback during the tap so the take can auto-play afterwards,
          // and silence any playback so it isn't picked up by the mic.
          unlockAudio();
          stopShared();
          (recording ? onStop : onStart)();
        }}
        disabled={disabled || starting}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        <span className="rec-ring" />
        <span className="rec-icon" />
      </button>
      <span className="rec-hint">{hint}</span>
    </div>
  );
}

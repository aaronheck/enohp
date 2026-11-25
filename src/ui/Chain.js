import React, { useEffect, useState } from 'react';
import { fetchRecording } from '../api/client';
import useReversedPlayer from '../audio/useReversedPlayer';
import { unlockAudio } from '../audio/context';
import { avatarColor, initials, PlayIcon, StopIcon } from './components';

function ChainNode({ turn, index, last, lastNote }) {
  const [blob, setBlob] = useState(null);
  const player = useReversedPlayer(blob);

  useEffect(() => {
    let cancelled = false;
    fetchRecording(turn.signedGet, { retries: 2 }).then((b) => !cancelled && setBlob(b), () => {});
    return () => {
      cancelled = true;
    };
  }, [turn.signedGet]);

  const name = turn.nickname || 'Someone';
  const who = index === 0 ? `${name} started it` : last ? `${name} · ${lastNote}` : name;

  return (
    <div className="chain-node">
      <div className="avatar" style={{ background: avatarColor(name) }}>
        {initials(name)}
      </div>
      <button
        className={
          'chain-bubble' + (last ? ' chain-bubble-last' : '') + (player.playing ? ' chain-bubble-playing' : '')
        }
        onClick={() => {
          unlockAudio();
          player.toggle();
        }}
        disabled={!player.ready}
        aria-label={`Play ${name}'s recording`}
      >
        <span>
          {turn.guess}
          <small>{who}</small>
        </span>
        <span className="play-dot">{player.playing ? <StopIcon /> : <PlayIcon />}</span>
      </button>
    </div>
  );
}

/**
 * The chain of turns joined by a string. Tap a turn to hear it rewound.
 * `waiting` adds an empty "?" seat at the end for the next player.
 */
export default function Chain({ turns, lastNote = 'last on the line', waiting = false }) {
  const seats = turns.length + (waiting ? 1 : 0);
  return (
    <div className="chain">
      <svg className="chain-wire" viewBox="0 0 48 100" preserveAspectRatio="none" aria-hidden="true">
        <path
          d={`M24 4 ${Array.from({ length: seats * 2 }, (_, i) => {
            const y = 4 + ((i + 1) * 92) / (seats * 2);
            return `Q ${i % 2 ? 40 : 8} ${y - 46 / (seats * 2)} 24 ${y}`;
          }).join(' ')}`}
          stroke="var(--cream)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          fill="none"
          opacity=".8"
        />
      </svg>
      {turns.map((t, i) => (
        <ChainNode
          key={t.recording || i}
          turn={t}
          index={i}
          last={i === turns.length - 1 && i > 0}
          lastNote={lastNote}
        />
      ))}
      {waiting && (
        <div className="chain-node">
          <div className="avatar avatar-waiting">?</div>
          <div className="chain-bubble chain-bubble-waiting">
            <span>
              Who's next?
              <small>waiting for your friend</small>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

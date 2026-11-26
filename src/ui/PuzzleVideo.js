import React, { useState } from 'react';
import { fetchRecording } from '../api/client';
import { unlockAudio } from '../audio/context';
import { canMakeVideo, makePuzzleVideo } from '../lib/puzzleVideo';
import { track } from '../lib/analytics';
import { reportError } from '../lib/errors';
import './PuzzleVideo.css';

const SITE = 'https://yelnatsgame.com';

/**
 * "Challenge friends": makes a short video of the puzzle (backwards audio + waveform,
 * no answer) and shares it. Two taps: phones only open the share sheet straight from a
 * tap, and the video takes a few seconds to make.
 */
export default function PuzzleVideo({ url, n }) {
  const [state, setState] = useState('idle'); // idle | making | ready | error
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [errMsg, setErrMsg] = useState(null);

  if (!url || !canMakeVideo()) return null;

  const make = async () => {
    unlockAudio();
    setState('making');
    setProgress(0);
    track('share', { puzzle: n, method: 'video', result: 'make' });
    try {
      const blob = await fetchRecording(url, { retries: 1 });
      const f = await makePuzzleVideo({ blob, n, onProgress: setProgress });
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setState('ready');
    } catch (e) {
      reportError('crash', { msg: e && e.message, err: e && e.name, where: 'puzzle-video' });
      setErrMsg(`${(e && e.name) || 'Error'}: ${(e && e.message) || e}`);
      setState('error');
    }
  };

  const text = `Can you decode this? 🔊 Yelnats Daily #${n} — it's played backwards.`;
  const share = async () => {
    let result = 'failed';
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: `${text} ${SITE}` });
        } catch (e) {
          if (e && e.name === 'AbortError') throw e;
          // Some apps refuse a video with text attached: try the video on its own.
          await navigator.share({ files: [file] });
        }
        result = 'shared';
      } else {
        // Desktop: save the file instead.
        const a = document.createElement('a');
        a.href = preview;
        a.download = file.name;
        a.click();
        result = 'downloaded';
      }
    } catch (e) {
      result = e && e.name === 'AbortError' ? 'cancelled' : 'failed';
      if (result === 'failed') {
        reportError('crash', { msg: e && e.message, err: e && e.name, where: 'puzzle-video-share' });
        setErrMsg(`${(e && e.name) || 'Error'}: ${(e && e.message) || e}`);
      }
    }
    track('share', { puzzle: n, method: 'video', result });
    setStatus({ shared: 'Shared!', downloaded: 'Video saved.', failed: "Couldn't share this time." }[result] || null);
  };

  return (
    <div className="pvideo">
      {state === 'idle' && (
        <>
          <button className="btn btn-ghost" onClick={make}>
            🎬 Challenge friends with a video
          </button>
          <p className="pvideo-note">A 7-second clip of the puzzle, played backwards. No spoilers.</p>
        </>
      )}
      {state === 'making' && (
        <div className="pvideo-making" role="status">
          <div className="pvideo-bar">
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="pvideo-note">Making your video… {Math.round(progress * 100)}%</p>
        </div>
      )}
      {state === 'ready' && (
        <div className="pvideo-ready">
          <video className="pvideo-preview" src={preview} controls playsInline muted={false} />
          <button className="btn btn-primary" onClick={share}>
            📤 Share video
          </button>
          {status && <p className="pvideo-note">{status}</p>}
          {errMsg && <p className="pvideo-err">{errMsg}</p>}
        </div>
      )}
      {state === 'error' && (
        <p className="pvideo-note">
          Couldn’t make the video on this browser.{' '}
          {errMsg && <span className="pvideo-err">{errMsg} </span>}
          <button className="btn-text" onClick={make}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

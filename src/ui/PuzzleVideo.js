import React, { useState } from 'react';
import { fetchRecording } from '../api/client';
import { unlockAudio } from '../audio/context';
import { bragFor, canMakeVideo, makePuzzleVideo } from '../lib/puzzleVideo';
import { track } from '../lib/analytics';
import { reportError } from '../lib/errors';
import './PuzzleVideo.css';

const SITE = 'https://yelnatsgame.com';

/**
 * "Challenge friends": makes a short video of the puzzle (backwards audio + waveform,
 * no answer) and shares it. Two taps: phones only open the share sheet straight from a
 * tap, and the video takes a few seconds to make.
 */
export default function PuzzleVideo({ url, n, result, mimic }) {
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
      const f = await makePuzzleVideo({ blob, mimic, n, result, onProgress: setProgress });
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setState('ready');
    } catch (e) {
      reportError('crash', { msg: e && e.message, err: e && e.name, where: 'puzzle-video' });
      setErrMsg(`${(e && e.name) || 'Error'}: ${(e && e.message) || e}`);
      setState('error');
    }
  };

  const brag = bragFor(result);
  const text = result ? `${brag.headline} Yelnats Daily #${n}. ${brag.dare}` : `Can you decode this? 🔊 Yelnats Daily #${n}, played backwards.`;
  const canShareFile = () => {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) {
      return false;
    }
  };

  // target 'story': the video on its own, which is what Instagram/TikTok/Snapchat stories
  // want. 'friend': video plus the brag text, for Messages/WhatsApp. 'save': to Photos.
  const share = async (target) => {
    let result = 'failed';
    try {
      if (canShareFile()) {
        if (target === 'friend') {
          try {
            await navigator.share({ files: [file], text: `${text} ${SITE}` });
          } catch (e) {
            if (e && e.name === 'AbortError') throw e;
            await navigator.share({ files: [file] }); // some apps refuse text with a video
          }
        } else {
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
    track('share', { puzzle: n, method: 'video', target, result });
    setStatus(
      {
        shared: target === 'story' ? 'Nice! 🎉' : 'Sent!',
        downloaded: 'Video saved. Post it from your downloads.',
        failed: "Couldn't share this time.",
      }[result] || null
    );
  };


  return (
    <div className="pvideo">
      {state === 'idle' && (
        <>
          <button className="btn btn-ghost" onClick={make}>
            🎬 Brag with a video
          </button>
          <p className="pvideo-note">
            {mimic ? 'Your score, the puzzle, then your own attempt. No spoilers.' : 'Your score + the puzzle played backwards. No spoilers.'}
          </p>
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
          <video className="pvideo-preview" src={preview} controls playsInline />
          {canShareFile() ? (
            <>
              <button className="btn btn-primary" onClick={() => share('story')}>
                📲 Post to your story
              </button>
              <p className="pvideo-note">Pick Instagram, TikTok or Snapchat in the menu. “Save Video” puts it in Photos.</p>
              <button className="btn btn-ghost" onClick={() => share('friend')}>
                💬 Send to a friend
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => share('save')}>
              ⬇️ Download video
            </button>
          )}
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

import React, { useEffect, useState } from 'react';
import { fetchRecording } from '../api/client';
import { unlockAudio } from '../audio/context';
import { bragFor, canMakeVideo, makePuzzleVideo } from '../lib/puzzleVideo';
import { track } from '../lib/analytics';
import { reportError } from '../lib/errors';
import './HowToPlaySheet.css';
import './PuzzleVideo.css';

const SITE = 'https://yelnatsgame.com';

export { canMakeVideo };

/**
 * "Brag with a video": a half-width button that makes the clip in place (progress fills
 * the button), then opens a sheet with the preview and the ways to post it. Posting
 * needs its own tap: phones only open the share sheet straight from a tap.
 */
export default function PuzzleVideo({ url, n, result, mimic, onError }) {
  const [state, setState] = useState('idle'); // idle | making | ready | error
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const make = async () => {
    if (state === 'ready') return setOpen(true);
    unlockAudio();
    setState('making');
    setErrMsg(null);
    if (onError) onError(null);
    setProgress(0);
    track('share', { puzzle: n, method: 'video', result: 'make' });
    try {
      const blob = await fetchRecording(url, { retries: 1 });
      const f = await makePuzzleVideo({ blob, mimic, n, result, onProgress: setProgress });
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setState('ready');
      setStatus(null);
      setOpen(true);
    } catch (e) {
      reportError('crash', { msg: e && e.message, err: e && e.name, where: 'puzzle-video' });
      const msg = `${(e && e.name) || 'Error'}: ${(e && e.message) || e}`;
      setErrMsg(msg);
      if (onError) onError(`Couldn’t make the video. ${msg}`);
      setState('error');
    }
    return undefined;
  };

  const brag = bragFor(result);
  const text = `${brag.headline} Yelnats Daily #${n}. ${brag.dare}`;
  const canShareFile = () => {
    try {
      return !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) {
      return false;
    }
  };

  // 'story': the video on its own (what Instagram/TikTok/Snapchat want).
  // 'friend': video plus the brag text. 'save': download (computers).
  const share = async (target) => {
    let res = 'failed';
    try {
      if (target !== 'save' && canShareFile()) {
        if (target === 'friend') {
          try {
            await navigator.share({ files: [file], text: `${text} ${SITE}/p/${n}` });
          } catch (e) {
            if (e && e.name === 'AbortError') throw e;
            await navigator.share({ files: [file] }); // some apps refuse text with a video
          }
        } else {
          await navigator.share({ files: [file] });
        }
        res = 'shared';
      } else {
        const a = document.createElement('a');
        a.href = preview;
        a.download = file.name;
        a.click();
        res = 'downloaded';
      }
    } catch (e) {
      res = e && e.name === 'AbortError' ? 'cancelled' : 'failed';
      if (res === 'failed') {
        reportError('crash', { msg: e && e.message, err: e && e.name, where: 'puzzle-video-share' });
        setErrMsg(`${(e && e.name) || 'Error'}: ${(e && e.message) || e}`);
      }
    }
    track('share', { puzzle: n, method: 'video', target, result: res });
    setStatus({ shared: 'Nice! 🎉', downloaded: 'Video saved.', failed: "Couldn't share this time." }[res] || null);
  };

  const pct = Math.round(progress * 100);
  return (
    <>
      <button
        className={'btn btn-primary brag-btn pvideo-btn' + (state === 'making' ? ' is-making' : '')}
        onClick={make}
        disabled={state === 'making'}
        style={state === 'making' ? { '--fill': `${pct}%` } : undefined}
      >
        {state === 'making' ? `Making… ${pct}%` : state === 'ready' ? '🎬 Your video' : state === 'error' ? '🎬 Try again' : '🎬 Brag with a video'}
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet pvideo-sheet" role="dialog" aria-modal="true" aria-label="Your brag video" onClick={(e) => e.stopPropagation()}>
            <button className="pvideo-close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
            <video className="pvideo-preview" src={preview} controls playsInline autoPlay />
            {canShareFile() ? (
              <>
                <button className="btn btn-primary" onClick={() => share('story')}>
                  📲 Post to your story
                </button>
                <p className="pvideo-note">Pick Instagram, TikTok or Snapchat. “Save Video” puts it in Photos.</p>
                <button className="btn-text pvideo-friend" onClick={() => share('friend')}>
                  💬 Or send it to a friend
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
        </div>
      )}
    </>
  );
}


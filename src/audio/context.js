// Shared audio plumbing.
//
// iOS only lets audio start inside a tap handler, before any await. So:
//  - one AudioContext for the whole app (used for decoding and the mic meter);
//  - one <audio> element for all playback, "unlocked" during a tap so it can
//    later play on its own (e.g. auto-playing a take after it's processed).
// Sharing one element also means only one recording plays at a time.

let ctx = null;
let audio = null;
let owner = null; // handlers of the player currently using `audio`

// 0.1 s of silence, used to unlock the element.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';

export function getAudioContext() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

function getAudio() {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('ended', () => release());
  }
  return audio;
}

function release() {
  const prev = owner;
  owner = null;
  if (prev) prev.onStop();
}

/** Call synchronously from a tap handler so later playback is allowed. */
export function unlockAudio() {
  getAudioContext();
  const a = getAudio();
  if (a.dataset.unlocked || !a.paused) return;
  a.dataset.unlocked = '1';
  a.src = SILENT_WAV;
  a.play().catch(() => {
    delete a.dataset.unlocked;
  });
}

/** Plays `url`, stopping whatever else was playing. handlers: { onStop }. */
export function playShared(url, rate, handlers) {
  const a = getAudio();
  if (owner && owner !== handlers) release();
  a.pause();
  owner = handlers;
  a.src = url;
  a.defaultPlaybackRate = rate;
  a.playbackRate = rate;
  return a.play().catch((e) => {
    if (owner === handlers) owner = null;
    throw e;
  });
}

export function stopShared(handlers) {
  if (handlers && owner !== handlers) return;
  if (audio) audio.pause();
  release();
}

/** Playback position 0..1 for the given player, or 0 if it isn't playing. */
export function sharedProgress(handlers) {
  if (owner !== handlers || !audio || !audio.duration) return 0;
  return audio.currentTime / audio.duration;
}

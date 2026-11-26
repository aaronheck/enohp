// Makes a short vertical video of the day's puzzle ("Can you decode this?"): the
// backwards audio played twice over an animated waveform, ending on the site name.
// Spoiler-free: only the puzzle audio is in it, never the answer. Built in the browser
// by recording a canvas plus the audio in real time (about 7 seconds).
import { getAudioContext } from '../audio/context';

const W = 720;
const H = 1280;
const C = {
  bg: '#0f3a2d',
  raised: '#15493a',
  deep: '#0a2a20',
  cream: '#fff4dc',
  muted: 'rgba(255,244,220,0.62)',
  butter: '#ffd84d',
  tomato: '#ff5b3a',
};
const FONT = "'Bricolage Grotesque', system-ui, sans-serif";
const INTRO = 0.9; // seconds before the first listen
const GAP = 0.7; // between the two listens
const OUTRO = 1.8;

/** Can this browser make the video at all? */
export function canMakeVideo() {
  const c = typeof document !== 'undefined' && document.createElement('canvas');
  return !!(videoMimeTypes().length && c && c.captureStream && (window.AudioContext || window.webkitAudioContext));
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function peaksOf(buffer, count) {
  const data = buffer.getChannelData(0);
  const size = Math.floor(data.length / count) || 1;
  const out = [];
  let max = 0;
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (let j = i * size; j < Math.min(data.length, (i + 1) * size); j++) sum += data[j] * data[j];
    const rms = Math.sqrt(sum / size);
    out.push(rms);
    max = Math.max(max, rms);
  }
  return out.map((p) => (max ? p / max : 0));
}

function wrap(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawFrame(g, t, { n, peaks, d }) {
  const first = [INTRO, INTRO + d];
  const second = [INTRO + d + GAP, INTRO + 2 * d + GAP];
  const end = second[1];
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  g.fillStyle = C.bg;
  g.fillRect(0, 0, W, H);

  // Header
  const inA = ease(t / 0.5);
  g.globalAlpha = inA;
  g.fillStyle = C.butter;
  g.font = `800 34px ${FONT}`;
  g.textAlign = 'left';
  g.fillText(`YELNATS DAILY · #${n}`, 64, 150);
  g.fillStyle = C.cream;
  g.font = `800 96px ${FONT}`;
  wrap(g, 'Can you decode this?', W - 128).forEach((l, i) => g.fillText(l, 64, 270 + i * 100));
  g.fillStyle = C.muted;
  g.font = `600 36px ${FONT}`;
  g.fillText('A phrase, played backwards. 🔊', 64, 500);
  g.globalAlpha = 1;

  // Waveform card
  const cardY = 580;
  const cardH = 360;
  g.fillStyle = C.raised;
  roundRect(g, 48, cardY, W - 96, cardH, 40);
  g.fill();

  let progress = 0;
  let label = 'listen…';
  if (t >= first[0] && t < first[1]) {
    progress = (t - first[0]) / d;
    label = '1st listen';
  } else if (t >= first[1] && t < second[0]) {
    progress = 1;
    label = 'again…';
  } else if (t >= second[0] && t < second[1]) {
    progress = (t - second[0]) / d;
    label = '2nd listen';
  } else if (t >= end) {
    progress = 1;
    label = 'what did it say?';
  }
  const bars = peaks.length;
  const left = 96;
  const span = W - 192;
  const mid = cardY + cardH / 2 - 10;
  const bw = span / bars;
  for (let i = 0; i < bars; i++) {
    const h = Math.max(8, peaks[i] * 220);
    const played = i / bars < progress;
    // A little bounce on the bar under the playhead.
    const live = played && Math.abs(i / bars - progress) < 0.04 && t < end ? 1.12 : 1;
    g.fillStyle = played ? C.butter : 'rgba(255,244,220,0.35)';
    roundRect(g, left + i * bw + bw * 0.18, mid - (h * live) / 2, bw * 0.64, h * live, Math.min(6, bw * 0.3));
    g.fill();
  }
  g.fillStyle = C.cream;
  g.font = `700 32px ${FONT}`;
  g.textAlign = 'center';
  g.fillText(label, W / 2, cardY + cardH - 40);

  // Footer / outro
  const outA = ease((t - end) / 0.5);
  g.textAlign = 'center';
  g.globalAlpha = 1 - outA * 0.0;
  g.fillStyle = C.muted;
  g.font = `600 34px ${FONT}`;
  g.fillText('Mimic it. Flip it. Guess it.', W / 2, 1050);
  g.globalAlpha = 0.55 + 0.45 * outA;
  g.fillStyle = C.butter;
  roundRect(g, 96, 1100, W - 192, 104, 52);
  g.fill();
  g.fillStyle = C.deep;
  g.font = `800 44px ${FONT}`;
  g.fillText('yelnatsgame.com', W / 2, 1167);
  g.globalAlpha = 1;
  g.textAlign = 'left';
}

/**
 * blob: the puzzle's (backwards) audio. onProgress(0..1) while recording.
 * Resolves to a File (MP4 or WebM).
 */
/** Every format this browser claims to record, best first. */
function videoMimeTypes() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return [];
  const types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return MediaRecorder.isTypeSupported ? types.filter((t) => MediaRecorder.isTypeSupported(t)) : [];
}

/** Errors carry the step that failed, so reports say where it broke. */
const step = (name, fn) =>
  Promise.resolve()
    .then(fn)
    .catch((e) => {
      const err = new Error(`${name}: ${(e && e.message) || e}`);
      err.name = (e && e.name) || 'Error';
      err.step = name;
      throw err;
    });

export async function makePuzzleVideo({ blob, n, onProgress }) {
  if (!videoMimeTypes().length) throw new Error('This browser can’t make videos.');
  if (document.fonts && document.fonts.load) {
    await Promise.all([document.fonts.load(`800 96px ${FONT}`), document.fonts.load(`600 36px ${FONT}`)]).catch(() => {});
  }
  const ctx = getAudioContext();
  if (ctx.state !== 'running') await ctx.resume().catch(() => {});
  const bytes = await step('read audio', () => blob.arrayBuffer());
  // Old Safari only has the callback form of decodeAudioData.
  const buffer = await step('decode audio', () => new Promise((res, rej) => ctx.decodeAudioData(bytes, res, rej)));
  const d = buffer.duration;
  const total = INTRO + 2 * d + GAP + OUTRO;
  const peaks = peaksOf(buffer, 44);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // Safari only produces frames from a canvas that's in the page: add it, invisibly.
  Object.assign(canvas.style, { position: 'fixed', left: '0', bottom: '0', width: '2px', height: '2px', opacity: '0.01', pointerEvents: 'none', zIndex: '-1' });
  document.body.appendChild(canvas);
  const g = canvas.getContext('2d');
  drawFrame(g, 0, { n, peaks, d });

  // Audio goes only into the recording (not the speakers).
  const dest = ctx.createMediaStreamDestination();
  const stream = await step('capture', () => new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]));
  // Some browsers claim a format and then refuse it: try each until one starts.
  let recorder = null;
  let mimeType = null;
  let lastErr = null;
  for (const t of videoMimeTypes()) {
    try {
      recorder = new MediaRecorder(stream, { mimeType: t, videoBitsPerSecond: 2500000 });
      recorder.start(250);
      mimeType = t;
      break;
    } catch (e) {
      lastErr = e;
      recorder = null;
    }
  }
  if (!recorder) {
    canvas.remove();
    throw Object.assign(new Error(`start recorder: ${(lastErr && lastErr.message) || 'no format worked'}`), { name: (lastErr && lastErr.name) || 'Error' });
  }
  const chunks = [];
  recorder.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  const stopped = new Promise((res) => (recorder.onstop = res));
  const t0 = ctx.currentTime + 0.05;
  for (const at of [INTRO, INTRO + d + GAP]) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(dest);
    src.start(t0 + at);
  }

  await new Promise((resolve) => {
    const tick = () => {
      const t = ctx.currentTime - t0;
      drawFrame(g, Math.max(0, t), { n, peaks, d });
      if (onProgress) onProgress(Math.min(1, Math.max(0, t / total)));
      if (t >= total) return resolve();
      // rAF pauses in background tabs; a timer keeps going.
      setTimeout(tick, 1000 / 30);
    };
    tick();
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((tr) => tr.stop());
  canvas.remove();
  if (!chunks.length) throw new Error('record: the video came out empty');

  const type = (recorder.mimeType || mimeType).split(';')[0] || 'video/mp4';
  const ext = type === 'video/mp4' ? 'mp4' : 'webm';
  return new File(chunks, `yelnats-${n}.${ext}`, { type });
}

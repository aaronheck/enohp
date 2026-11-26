// Makes a short vertical video of the day's puzzle ("Can you decode this?"): the
// backwards audio played twice over an animated waveform, ending on the site name.
// Spoiler-free: only the puzzle audio is in it, never the answer. Built in the browser
// by recording a canvas plus the audio in real time (about 7 seconds).
import { getAudioContext } from '../audio/context';
import { SLOGAN } from './brand';

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
  sky: '#8fd3ff',
};
const FONT = "'Bricolage Grotesque', system-ui, sans-serif";
const INTRO = 0.9; // seconds before the first listen
const OUTRO = 1.8;
const TAIL = 1.0; // extra recorded after the outro, as a safety margin

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

const ACTION_EMOJI = { mimic: '🎙', miss: '❌', hit: '✅' };

/** The brag: headline + dare, from how they did. */
export function bragFor(r) {
  if (!r) return { headline: 'Can you decode this?', dare: `${SLOGAN} 🔊` };
  if (r.failed) return { headline: 'This one beat me 😵', dare: 'Think you can crack it? 🔊' };
  if (r.mindReader) return { headline: 'First try. No mimic. 🤯', dare: 'Mind reader. Beat that. 🔊' };
  const line = {
    1: 'I got it in 1! 🤯',
    2: 'I got it in 2! 🔥',
    3: 'I got it in 3! 💪',
    4: 'Got it in 4! 😎',
    5: 'Clutch: got it in 5! 😮‍💨',
  }[r.tries] || `I got it in ${r.tries}!`;
  return { headline: line, dare: r.tries <= 2 ? 'Bet you can’t beat that. 🔊' : 'Can you beat that? 🔊' };
}

function drawScorecard(g, x, y, w, h, r) {
  g.fillStyle = C.cream;
  roundRect(g, x, y, w, h, 32);
  g.fill();
  // The rating in words ("🔥 Brilliant"): fewer tries reads as better, unlike "1/5".
  const rated = r.rating || { emoji: '', word: `${r.failed ? 'X' : r.tries}/5` };
  g.textAlign = 'left';
  g.font = `56px ${FONT}`;
  g.fillStyle = C.deep;
  g.fillText(rated.emoji, x + 28, y + h / 2 + 20);
  const ew = g.measureText(rated.emoji).width;
  g.fillStyle = r.failed ? C.tomato : C.deep;
  g.font = `800 54px ${FONT}`;
  g.fillText(rated.word, x + 28 + ew + 14, y + h / 2 + 4);
  g.font = `700 26px ${FONT}`;
  g.fillStyle = 'rgba(20,36,29,0.6)';
  const moves = (r.actions || []).map((a) => ACTION_EMOJI[a] || '').join('');
  g.fillText(`${rated.line || ''}  ${moves}`, x + 28 + ew + 14, y + h / 2 + 40);
  if (r.streak >= 2) {
    g.textAlign = 'right';
    g.font = `800 30px ${FONT}`;
    g.fillStyle = C.deep;
    g.fillText(`🔥 ${r.streak}`, x + w - 28, y + 46);
  }
  g.textAlign = 'left';
}

function drawFrame(g, t, { n, clips, end, result, dateLabel }) {
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const brag = bragFor(result);

  g.fillStyle = C.bg;
  g.fillRect(0, 0, W, H);

  // Header: the brag
  const inA = ease(t / 0.5);
  g.globalAlpha = inA;
  g.fillStyle = C.butter;
  g.font = `800 34px ${FONT}`;
  g.textAlign = 'left';
  g.fillText(dateLabel ? `${dateLabel.toUpperCase()} · DAILY #${n}` : `YELNATS DAILY · #${n}`, 64, 130);
  g.fillStyle = C.cream;
  g.font = `800 84px ${FONT}`;
  const lines = wrap(g, brag.headline, W - 128).slice(0, 2);
  lines.forEach((l, i) => g.fillText(l, 64, 230 + i * 92));
  g.fillStyle = C.muted;
  g.font = `600 36px ${FONT}`;
  g.fillText(brag.dare, 64, 230 + lines.length * 92 + 8);
  g.globalAlpha = 1;
  // Scorecard pops in just after the headline.
  if (result) {
    const pop = ease((t - 0.25) / 0.45);
    g.save();
    g.globalAlpha = pop;
    g.translate(0, (1 - pop) * 24);
    drawScorecard(g, 48, 430, W - 96, 130, result);
    g.restore();
  }

  // Waveform card
  const cardY = result ? 600 : 580;
  const cardH = result ? 330 : 360;
  g.fillStyle = C.raised;
  roundRect(g, 48, cardY, W - 96, cardH, 40);
  g.fill();

  // Which clip the card shows: the one playing, or the last one that played.
  let k = 0;
  for (let i = 0; i < clips.length; i++) if (t >= clips[i].at) k = i;
  const clip = clips[k];
  const progress = Math.min(1, Math.max(0, (t - clip.at) / clip.d));
  const playing = t >= clip.at && t < clip.at + clip.d;
  const peaks = clip.peaks;
  const bars = peaks.length;
  const left = 96;
  const span = W - 192;
  const mid = cardY + cardH / 2;
  const bw = span / bars;
  for (let i = 0; i < bars; i++) {
    const h = Math.max(8, peaks[i] * 220);
    const played = i / bars < progress;
    // A little bounce on the bar under the playhead.
    const live = playing && played && Math.abs(i / bars - progress) < 0.04 ? 1.12 : 1;
    g.fillStyle = played ? clip.color : 'rgba(255,244,220,0.35)';
    roundRect(g, left + i * bw + bw * 0.18, mid - (h * live) / 2, bw * 0.64, h * live, Math.min(6, bw * 0.3));
    g.fill();
  }

  // Footer / outro
  const outA = ease((t - end) / 0.5);
  g.textAlign = 'center';
  g.globalAlpha = 1 - outA * 0.0;
  g.fillStyle = C.muted;
  g.font = `600 34px ${FONT}`;
  g.fillText(SLOGAN, W / 2, 1050);
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

/** Cuts silence off both ends (keeping a little), caps the length, and returns a gain that evens out loudness. */
function tidy(ctx, buffer, maxSeconds = 6) {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = peak > 0 ? Math.min(4, 0.9 / peak) : 1;
  const floor = peak * 0.06;
  let a = 0;
  let b = data.length - 1;
  while (a < b && Math.abs(data[a]) < floor) a++;
  while (b > a && Math.abs(data[b]) < floor) b--;
  const pad = Math.round(0.12 * buffer.sampleRate);
  a = Math.max(0, a - pad);
  b = Math.min(data.length, b + pad, a + Math.round(maxSeconds * buffer.sampleRate));
  if (b - a < buffer.sampleRate * 0.2) return { buffer, gain };
  const out = ctx.createBuffer(buffer.numberOfChannels, b - a, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) out.copyToChannel(buffer.getChannelData(ch).subarray(a, b), ch);
  return { buffer: out, gain };
}

/**
 * blob: the puzzle's (backwards) audio. mimic: the player's own attempt, as they
 * recorded it (still backwards, so no spoiler). The video plays only the attempt;
 * without one, the puzzle audio plays instead.
 * result: { tries, used, failed, mindReader, actions, streak } for the brag.
 * Resolves to a File (MP4 or WebM).
 */
export async function makePuzzleVideo({ blob, mimic, n, date, result, onProgress }) {
  if (!videoMimeTypes().length) throw new Error('This browser can’t make videos.');
  if (document.fonts && document.fonts.load) {
    await Promise.all([document.fonts.load(`800 96px ${FONT}`), document.fonts.load(`600 36px ${FONT}`)]).catch(() => {});
  }
  const ctx = getAudioContext();
  if (ctx.state !== 'running') await ctx.resume().catch(() => {});
  // Old Safari only has the callback form of decodeAudioData.
  const decode = async (b, name) => {
    const bytes = await step(`read ${name}`, () => b.arrayBuffer());
    return step(`decode ${name}`, () => new Promise((res, rej) => ctx.decodeAudioData(bytes, res, rej)));
  };
  const puzzleBuf = await decode(blob, 'puzzle');
  const mimicBuf = mimic ? await decode(mimic, 'mimic').catch(() => null) : null;

  const p = { buffer: puzzleBuf, gain: 1 };
  const m = mimicBuf ? tidy(ctx, mimicBuf) : null;
  // Just the player's own attempt (as recorded, still backwards: no spoiler). If they
  // never mimicked, the puzzle audio stands in so the video isn't silent.
  const only = m || p;
  const clips = [{ ...only, at: INTRO, d: only.buffer.duration, peaks: peaksOf(only.buffer, 44), color: C.butter }];
  const end = clips[0].at + clips[0].d;
  const total = end + OUTRO;
  const dateLabel = date
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00Z`))
    : null;
  const frame = { n, clips, end, result, dateLabel };

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // Safari only produces frames from a canvas that's in the page: add it, invisibly.
  Object.assign(canvas.style, { position: 'fixed', left: '0', bottom: '0', width: '2px', height: '2px', opacity: '0.01', pointerEvents: 'none', zIndex: '-1' });
  document.body.appendChild(canvas);
  const g = canvas.getContext('2d');
  drawFrame(g, 0, frame);

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
      // No timeslice: Safari is more reliable handing over the whole video at the end.
      recorder.start();
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
  // Recording really begins a moment after start(): wait for it (and a little more)
  // before starting the timeline, so the beginning isn't lost.
  await new Promise((res) => {
    recorder.onstart = res;
    setTimeout(res, 800);
  });
  await new Promise((res) => setTimeout(res, 250));
  const t0 = ctx.currentTime + 0.05;
  for (const c of clips) {
    const src = ctx.createBufferSource();
    src.buffer = c.buffer;
    const gain = ctx.createGain();
    gain.gain.value = c.gain;
    src.connect(gain);
    gain.connect(dest);
    src.start(t0 + c.at);
  }

  await new Promise((resolve) => {
    const tick = () => {
      const t = ctx.currentTime - t0;
      drawFrame(g, Math.max(0, t), frame);
      if (onProgress) onProgress(Math.min(1, Math.max(0, t / (total + TAIL))));
      // Keep recording the last frame a bit longer: the end of a recording can get clipped.
      if (t >= total + TAIL) return resolve();
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

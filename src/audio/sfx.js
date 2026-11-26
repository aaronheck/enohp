// Little sound effects, made on the fly with Web Audio (no files to load), plus
// phone vibration where the browser supports it (Android; iPhones don't allow it).
import { getAudioContext } from './context';

function tone(ctx, { freq, start, dur, type = 'sine', gain = 0.18, slideTo, filter }) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, start + dur);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  let node = osc;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    osc.connect(f);
    node = f;
  }
  node.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function play(fn) {
  try {
    const ctx = getAudioContext();
    fn(ctx, ctx.currentTime + 0.01);
  } catch (e) {
    // sound is a nice-to-have
  }
}

export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {
    // ignore
  }
}

/** Countdown blip: 3, 2, 1 (higher on 1). */
export function tick(n) {
  play((ctx, t) => tone(ctx, { freq: n === 1 ? 880 : 660, start: t, dur: 0.09, type: 'triangle', gain: 0.12 }));
  vibrate(15);
}

/** Right answer: a bright little arpeggio. */
export function ding() {
  play((ctx, t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, { freq: f, start: t + i * 0.08, dur: 0.5 - i * 0.05, type: 'triangle', gain: 0.16 }));
  });
  vibrate([30, 50, 30, 50, 60]);
}

/** Wrong guess: a short low buzz. */
export function nope() {
  play((ctx, t) => tone(ctx, { freq: 150, start: t, dur: 0.18, type: 'square', gain: 0.07, filter: 900 }));
  vibrate(60);
}

/** Out of tries: wah, wah, wah, waaah. */
export function sadTrombone() {
  play((ctx, t) => {
    const notes = [
      [311, 0, 0.32],
      [293.7, 0.38, 0.32],
      [277.2, 0.76, 0.32],
      [261.6, 1.14, 0.95],
    ];
    for (const [f, at, dur] of notes) tone(ctx, { freq: f, start: t + at, dur, type: 'sawtooth', gain: 0.1, slideTo: at > 1 ? f * 0.94 : f * 0.985, filter: 1100 });
  });
  vibrate([120, 80, 120, 80, 300]);
}

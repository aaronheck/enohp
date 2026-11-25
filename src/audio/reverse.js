import toWav from 'audiobuffer-to-wav';
import { getAudioContext } from './context';

/** Returns reversed copies of each channel. Pure; doesn't touch the inputs. */
export function reverseChannels(channels) {
  return channels.map((data) => Float32Array.from(data).reverse());
}

/** Downsamples a channel into `count` peak values between 0 and 1. */
export function peaks(data, count) {
  const out = new Array(count).fill(0);
  if (!data.length) return out;
  const size = data.length / count;
  let max = 0;
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * size);
    const end = Math.max(start + 1, Math.floor((i + 1) * size));
    let peak = 0;
    for (let j = start; j < end && j < data.length; j++) {
      const v = Math.abs(data[j]);
      if (v > peak) peak = v;
    }
    out[i] = peak;
    if (peak > max) max = peak;
  }
  return max ? out.map((p) => p / max) : out;
}

const cache = new WeakMap();

/**
 * Decodes a recording and reverses it.
 * Resolves to { blob: WAV Blob, duration: seconds, peaks: number[] }.
 */
export function reverseRecording(blob) {
  if (!cache.has(blob)) {
    cache.set(blob, decodeAndReverse(blob));
  }
  return cache.get(blob);
}

async function decodeAndReverse(blob) {
  const ctx = getAudioContext();
  const bytes = await blob.arrayBuffer();
  // Promise form isn't available on older Safari, so wrap the callback form.
  const buffer = await new Promise((resolve, reject) =>
    ctx.decodeAudioData(bytes, resolve, (e) =>
      reject(e || new Error("Couldn't decode the recording"))
    )
  );
  const original = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) original.push(buffer.getChannelData(i));
  const reversed = reverseChannels(original);
  reversed.forEach((data, i) => buffer.copyToChannel(data, i));
  const wav = toWav(buffer);
  return {
    blob: new Blob([new DataView(wav)], { type: 'audio/wav' }),
    duration: buffer.duration,
    peaks: peaks(reversed[0], 48),
  };
}

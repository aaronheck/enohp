import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from './context';
import { reportError } from '../lib/errors';

function micErrorMessage(err) {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    return "This browser can't record audio. Try Safari or Chrome.";
  }
  if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
    return 'Microphone access was blocked. Allow it in your browser settings and try again.';
  }
  if (err && err.name === 'NotFoundError') return 'No microphone found.';
  return "Couldn't start the microphone.";
}

/** Resolves once the mic delivers any non-zero sample (warming-up mics send exact zeros). */
function waitForSignal(analyser, sample, timeoutMs) {
  if (!analyser || !sample) return Promise.resolve();
  const until = performance.now() + timeoutMs;
  return new Promise((resolve) => {
    const check = () => {
      analyser.getFloatTimeDomainData(sample);
      for (let i = 0; i < sample.length; i++) {
        if (Math.abs(sample[i]) > 1e-6) return resolve();
      }
      if (performance.now() > until) return resolve();
      setTimeout(check, 30);
    };
    check();
  });
}

/**
 * Microphone recorder. The mic stream is requested on the first start() and kept
 * between takes, until release() is called, the tab is hidden, or the component
 * unmounts. After a release, the next start() asks for the mic again.
 *
 * Returns { status: 'idle' | 'starting' | 'recording', error, start, stop, release, getLevel }.
 * 'starting' lasts until the mic is actually live, so the UI can say "wait" until then.
 * stop() resolves to the recorded Blob. getLevel() returns 0..1 for live meters.
 */
export default function useRecorder({ warm = false } = {}) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const sampleRef = useRef(null);
  const nodesRef = useRef([]);
  const pendingRef = useRef(null); // getUserMedia in flight
  const genRef = useRef(0); // bumped by release(), so a late stream from before it is dropped

  /** The mic stream: the open one, the one being opened, or a new one. */
  const acquire = useCallback(() => {
    if (streamRef.current) return Promise.resolve(streamRef.current);
    if (pendingRef.current) return pendingRef.current;
    const gen = genRef.current;
    const p = navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (genRef.current !== gen) {
          stream.getTracks().forEach((t) => t.stop()); // released while opening
          throw Object.assign(new Error('released'), { name: 'ReleasedError' });
        }
        streamRef.current = stream;
        return stream;
      })
      .finally(() => {
        if (pendingRef.current === p) pendingRef.current = null;
      });
    pendingRef.current = p;
    return p;
  }, []);

  /** Stops any take in progress (discarding it) and gives the microphone back. */
  const release = useCallback(() => {
    genRef.current++;
    pendingRef.current = null;
    const r = recorderRef.current;
    recorderRef.current = null;
    if (r && r.state !== 'inactive') {
      r.onstop = null;
      r.ondataavailable = null;
      try {
        r.stop();
      } catch (e) {
        // already stopped
      }
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    nodesRef.current.forEach((n) => {
      try {
        n.disconnect();
      } catch (e) {
        // already disconnected
      }
    });
    nodesRef.current = [];
    analyserRef.current = null;
    sampleRef.current = null;
    chunksRef.current = [];
    setStatus('idle');
  }, []);

  // Give the mic back whenever the page is hidden (other tab/app, screen locked).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') release();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, [release]);

  const start = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') return;
    // Must run before the first await so iOS lets the context start (see context.js).
    const ctx = getAudioContext();
    setError(null);
    setStatus('starting');
    try {
      const stream = await acquire();
      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        // Safari only pulls audio through nodes that reach the destination, so
        // route the analyser into a muted gain node.
        const mute = ctx.createGain();
        mute.gain.value = 0;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.connect(mute);
        mute.connect(ctx.destination);
        nodesRef.current = [source, analyser, mute];
        analyserRef.current = analyser;
        sampleRef.current = new Float32Array(analyser.fftSize);
      }
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      const started = new Promise((res) => {
        recorder.onstart = res;
        setTimeout(res, 1000);
      });
      recorder.start();
      // Phones take a moment to bring the mic up, and the first stretch of a take is
      // silence. Only say "recording" once the mic is really sending sound, so people
      // don't start talking too early and get cut off.
      await started;
      await waitForSignal(analyserRef.current, sampleRef.current, 1500);
      await new Promise((res) => setTimeout(res, 150));
      if (recorderRef.current !== recorder) return; // released or stopped meanwhile
      setStatus('recording');
    } catch (err) {
      if (err && err.name === 'ReleasedError') return; // released while the mic was opening
      setError(micErrorMessage(err));
      reportError('mic', { msg: err && err.message, err: (err && err.name) || (navigator.mediaDevices ? 'unknown' : 'NoMediaDevices') });
      setStatus('idle');
    }
  }, [acquire]);

  // warm: open the mic ahead of time, so tapping record starts almost instantly.
  // Only when the site already has mic permission, so it never pops up a prompt
  // on its own. Nothing is recorded until start().
  useEffect(() => {
    if (!warm) return undefined;
    let cancelled = false;
    const tryWarm = async () => {
      if (streamRef.current || pendingRef.current || document.visibilityState !== 'visible') return;
      let state;
      try {
        state = (await navigator.permissions.query({ name: 'microphone' })).state;
      } catch (e) {
        return; // can't tell: wait for the tap
      }
      if (!cancelled && state === 'granted') acquire().catch(() => {});
    };
    tryWarm();
    const onVisible = () => document.visibilityState === 'visible' && tryWarm();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [warm, acquire]);

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
          resolve(null);
          return;
        }
        recorder.onstop = () => {
          setStatus('idle');
          resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
    []
  );

  const getLevel = useCallback(() => {
    const analyser = analyserRef.current;
    const sample = sampleRef.current;
    if (!analyser || !recorderRef.current || recorderRef.current.state !== 'recording') return 0;
    analyser.getFloatTimeDomainData(sample);
    let sum = 0;
    for (let i = 0; i < sample.length; i++) sum += sample[i] * sample[i];
    // RMS of normal speech is roughly 0.02–0.2; spread that over 0..1.
    const rms = Math.sqrt(sum / sample.length);
    return Math.min(1, Math.sqrt(rms) * 1.6);
  }, []);

  /** Opens the mic ahead of start() (asks for permission if needed); never throws. */
  const prepare = useCallback(() => acquire().catch(() => null), [acquire]);

  return { status, error, start, stop, release, getLevel, prepare };
}

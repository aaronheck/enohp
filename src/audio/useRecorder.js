import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from './context';

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

/**
 * Microphone recorder. The mic stream is requested on the first start() and kept
 * between takes, until release() is called, the tab is hidden, or the component
 * unmounts. After a release, the next start() asks for the mic again.
 *
 * Returns { status: 'idle' | 'starting' | 'recording', error, start, stop, release, getLevel }.
 * stop() resolves to the recorded Blob. getLevel() returns 0..1 for live meters.
 */
export default function useRecorder() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const sampleRef = useRef(null);
  const nodesRef = useRef([]);

  /** Stops any take in progress (discarding it) and gives the microphone back. */
  const release = useCallback(() => {
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
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        streamRef.current = stream;
        analyserRef.current = analyser;
        sampleRef.current = new Float32Array(analyser.fftSize);
      }
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      const recorder = new MediaRecorder(streamRef.current);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch (err) {
      setError(micErrorMessage(err));
      setStatus('idle');
    }
  }, []);

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

  return { status, error, start, stop, release, getLevel };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reverseRecording } from './reverse';
import { playShared, sharedProgress, stopShared } from './context';

/**
 * Plays a recording in reverse through the app's shared audio element.
 * onEnded fires when a clip plays all the way through.
 * Returns { ready, error, playing, progress (0..1), duration, peaks, rate, setRate, toggle, play, stop }.
 */
export default function useReversedPlayer(blob, { reverse = true, onEnded } = {}) {
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const [reversed, setReversed] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1);
  const frameRef = useRef(null);

  // Stable identity for this player in the shared element.
  const handlers = useMemo(
    () => ({
      onStop: (ended) => {
        cancelAnimationFrame(frameRef.current);
        setPlaying(false);
        setProgress(0);
        if (ended && onEndedRef.current) onEndedRef.current();
      },
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    setReversed(null);
    setError(null);
    if (!blob) return undefined;
    reverseRecording(blob, { reverse }).then(
      (r) => !cancelled && setReversed(r),
      () => !cancelled && setError("Couldn't load this recording.")
    );
    return () => {
      cancelled = true;
    };
  }, [blob, reverse]);

  useEffect(() => {
    if (!reversed) return undefined;
    const u = URL.createObjectURL(reversed.blob);
    setUrl(u);
    return () => {
      stopShared(handlers);
      setUrl(null);
      URL.revokeObjectURL(u);
    };
  }, [reversed, handlers]);

  const stop = useCallback(() => stopShared(handlers), [handlers]);

  const play = useCallback(async () => {
    if (!url) return;
    try {
      await playShared(url, rate, handlers);
    } catch (e) {
      return; // blocked (no tap yet) or interrupted
    }
    setPlaying(true);
    const tick = () => {
      setProgress(sharedProgress(handlers));
      frameRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [url, rate, handlers]);

  const toggle = useCallback(() => (playing ? stop() : play()), [playing, stop, play]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return {
    ready: !!url,
    error,
    playing,
    progress,
    duration: reversed ? reversed.duration : 0,
    peaks: reversed ? reversed.peaks : null,
    rate,
    setRate,
    toggle,
    play,
    stop,
  };
}

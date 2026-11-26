import { useCallback, useEffect, useRef, useState } from 'react';
import { tick } from './sfx';

const STEP_MS = 750; // per number: 450 felt rushed

/**
 * "3, 2, 1" before recording. The mic opens during the count (asking for permission
 * if it has to), so by "go" it's usually ready and the take starts right away.
 * count is 3/2/1 while counting, null otherwise.
 */
export default function useCountIn(recorder) {
  const [count, setCount] = useState(null);
  const timer = useRef(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
      clearTimeout(timer.current);
    },
    []
  );

  const { prepare, start } = recorder;
  const run = useCallback(() => {
    if (timer.current) return;
    const ready = prepare();
    let n = 3;
    setCount(n);
    tick(n);
    const step = async () => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        tick(n);
        timer.current = setTimeout(step, STEP_MS);
        return;
      }
      await ready; // still on "1" if the permission popup is up
      timer.current = null;
      if (!alive.current) return;
      setCount(null);
      start();
    };
    timer.current = setTimeout(step, STEP_MS);
  }, [prepare, start]);

  return { count, run };
}

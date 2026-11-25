import React, { useEffect, useRef, useState } from 'react';
import { ReactComponent as Full } from './art/how-it-works-full.svg';
import { ReactComponent as Compact } from './art/how-it-works-compact.svg';
import './HowItWorksArt.css';

// Below this box height the 2×2 comic gets too small to read, so use the one-row strip.
const COMPACT_BELOW = 200;

// The four-panel "how it works" comic. Drawn as static SVG (see mockups/art/round4).
// (Measured in JS: CRA's CSS minifier mangles @container queries.)
export default function HowItWorksArt() {
  const ref = useRef(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const update = () => setCompact(el.clientHeight < COMPACT_BELOW);
    update();
    if (!window.ResizeObserver) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="how-art" ref={ref}>
      {compact ? <Compact aria-hidden="true" /> : <Full aria-hidden="true" />}
      <ol className="sr-only">
        <li>Pick a word.</li>
        <li>Say it backwards.</li>
        <li>We rewind it, so it sounds forwards.</li>
        <li>Friends guess, and the chain continues.</li>
      </ol>
    </div>
  );
}

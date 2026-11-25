import React, { useEffect, useRef } from 'react';

// ---------- playback: a smooth mirrored wave shape ----------

function smoothPath(points) {
  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

export function wavePath(peaks, { width = 200, height = 64, count = 40 } = {}) {
  const mid = height / 2;
  const top = [];
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const p = peaks.length ? peaks[Math.min(peaks.length - 1, Math.floor(u * peaks.length))] : 0;
    const taper = Math.pow(Math.sin(Math.PI * u), 0.5); // pinch the ends like a string tied off
    const amp = (0.05 + 0.95 * Math.sqrt(p)) * taper * (mid - 2);
    top.push([u * width, mid - amp]);
  }
  const bottom = top.map(([x, y]) => [x, height - y]).reverse();
  return `${smoothPath(top)} L${bottom[0][0]},${bottom[0][1]} ${smoothPath(bottom).slice(1)} Z`;
}

let clipIds = 0;

/** Recording shape with the played part filled in. */
export function Waveshape({ peaks, progress = 0, color = 'currentColor' }) {
  const id = useRef(null);
  if (id.current == null) id.current = `wave-clip-${++clipIds}`;
  if (!peaks) {
    return (
      <svg className="waveshape waveshape-loading" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
        <line x1="2" y1="32" x2="198" y2="32" stroke={color} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  const d = wavePath(peaks);
  return (
    <svg className="waveshape" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id={id.current}>
          <rect x="0" y="0" width={200 * progress} height="64" />
        </clipPath>
      </defs>
      <path d={d} fill={color} opacity={progress > 0 ? 0.28 : 1} />
      {progress > 0 && <path d={d} fill={color} clipPath={`url(#${id.current})`} />}
    </svg>
  );
}

// ---------- recording: a vibrating tin-can string ----------

/**
 * A string tied between two cans that vibrates with the mic level.
 * Still and slightly slack when not recording.
 */
export function VibratingString({ active, getLevel, height = 110 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ amp: 0, phase: 0 });
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const styles = getComputedStyle(document.documentElement);
    const cream = styles.getPropertyValue('--cream').trim() || '#fff4dc';
    const butter = styles.getPropertyValue('--butter').trim() || '#ffd84d';
    const tomato = styles.getPropertyValue('--tomato').trim() || '#ff5b3a';
    let frame;
    let last = performance.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      const target = activeRef.current ? getLevel() : 0;
      s.amp += (target - s.amp) * (target > s.amp ? 0.45 : 0.12);
      if (!reduce) s.phase += dt * (5 + s.amp * 22);

      const w = canvas.clientWidth;
      const mid = height / 2;
      const pad = 14;
      const span = w - pad * 2;
      const maxAmp = (mid - 8) * 1.6; // clamped below
      g.clearRect(0, 0, w, height);

      const stringAt = (u, phaseOffset, scale) => {
        const env = Math.sin(Math.PI * u);
        const slack = (1 - Math.min(1, s.amp * 3)) * 5 * env; // droops when quiet
        const wave =
          0.62 * Math.sin(2 * Math.PI * 1.5 * u - s.phase + phaseOffset) +
          0.38 * Math.sin(2 * Math.PI * 3.3 * u + s.phase * 1.6 + phaseOffset);
        const y = mid + slack + s.amp * maxAmp * scale * env * wave;
        return Math.max(4, Math.min(height - 4, y));
      };

      const line = (phaseOffset, scale, color, width, alpha) => {
        g.beginPath();
        for (let x = 0; x <= span; x += 3) {
          const y = stringAt(x / span, phaseOffset, scale);
          if (x === 0) g.moveTo(pad + x, y);
          else g.lineTo(pad + x, y);
        }
        g.lineTo(pad + span, mid);
        g.globalAlpha = alpha;
        g.strokeStyle = color;
        g.lineWidth = width;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.stroke();
        g.globalAlpha = 1;
      };

      line(2.1, 0.7, butter, 2, 0.35 * Math.min(1, s.amp * 4));
      line(0, 1, cream, 3, 1);

      // knots where the string meets the cans
      g.fillStyle = tomato;
      g.beginPath();
      g.arc(pad, mid, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = butter;
      g.beginPath();
      g.arc(pad + span, mid, 6, 0, Math.PI * 2);
      g.fill();

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [getLevel, height]);

  return <canvas ref={canvasRef} className="string-canvas" style={{ height }} aria-hidden="true" />;
}

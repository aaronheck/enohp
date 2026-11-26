import { useEffect } from 'react';

const COLORS = ['#ffd84d', '#ff5b3a', '#9be7b4', '#8fd3ff', '#c9a7ff', '#ffb3c7', '#fff4dc'];

/**
 * One burst of confetti over the whole screen, fired when this mounts.
 * A plain canvas, removed when the pieces have fallen. Skipped for reduced motion.
 */
export default function Confetti() {
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const canvas = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: 60,
    });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return undefined;
    }
    ctx.scale(dpr, dpr);

    // Two cannons from the bottom corners, plus a sprinkle from the top.
    const pieces = [];
    const add = (x, y, angle, spread, speed, count) => {
      for (let i = 0; i < count; i++) {
        const a = angle + (Math.random() - 0.5) * spread;
        const v = speed * (0.6 + Math.random() * 0.6);
        pieces.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          tilt: Math.random() * Math.PI * 2,
          color: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
    };
    const speed = Math.max(14, H / 45);
    add(0, H, -Math.PI / 3, 0.6, speed, 70);
    add(W, H, (-2 * Math.PI) / 3, 0.6, speed, 70);
    add(W / 2, -20, Math.PI / 2, 2.2, 3, 40);

    let frame;
    const start = performance.now();
    const tick = (t) => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of pieces) {
        p.vy += 0.35;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.tilt += 0.15;
        if (p.y < H + 30) alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.tilt)); // flutter
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive && t - start < 6000) frame = requestAnimationFrame(tick);
      else canvas.remove();
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      canvas.remove();
    };
  }, []);
  return null;
}

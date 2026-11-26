import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './CoachMark.css';

/**
 * A tooltip that points at an element (found by CSS selector) and rings it, telling
 * the player exactly what to do next. Follows the element on scroll/resize, and
 * scrolls it into view when the step starts.
 */
export default function CoachMark({ target, text, step, total }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const el = target && document.querySelector(target);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [target]);

  useLayoutEffect(() => {
    if (!target) return undefined;
    let frame;
    const measure = () => {
      const el = document.querySelector(target);
      const r = el ? el.getBoundingClientRect() : null;
      setRect((prev) =>
        r && (!prev || prev.top !== r.top || prev.left !== r.left || prev.width !== r.width || prev.height !== r.height)
          ? { top: r.top, left: r.left, width: r.width, height: r.height }
          : r
          ? prev
          : null
      );
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (!rect || !text) return null;

  // Put the bubble below the target, unless that would run off the bottom.
  const below = rect.top + rect.height + 150 < window.innerHeight;
  const pad = 8;
  const bubbleWidth = Math.min(300, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - bubbleWidth / 2, window.innerWidth - bubbleWidth - 12));
  const arrowLeft = Math.max(18, Math.min(rect.left + rect.width / 2 - left, bubbleWidth - 18));

  return createPortal(
    <>
      <div
        className="coach-ring"
        style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
      />
      <div
        className={'coach-bubble ' + (below ? 'coach-below' : 'coach-above')}
        role="status"
        aria-live="polite"
        style={{
          left,
          width: bubbleWidth,
          ...(below ? { top: rect.top + rect.height + pad + 14 } : { bottom: window.innerHeight - rect.top + pad + 14 }),
        }}
      >
        <span className="coach-arrow" style={{ left: arrowLeft }} />
        {step && (
          <span className="coach-step">
            Step {step}
            {total ? ` of ${total}` : ''}
          </span>
        )}
        <span className="coach-text">{text}</span>
      </div>
    </>,
    document.body
  );
}

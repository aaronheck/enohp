import React, { useEffect, useRef, useState } from 'react';
import { Button } from './components';
import './HowToPlaySheet.css';
import { ReactComponent as Slide1 } from './art/turn-slide-1.svg';
import { ReactComponent as Slide2 } from './art/turn-slide-2.svg';
import { ReactComponent as Slide3 } from './art/turn-slide-3.svg';
import { ReactComponent as Slide4 } from './art/turn-slide-4.svg';
import { ReactComponent as Slide5 } from './art/turn-slide-5.svg';

// One illustration per step (see mockups/art/turn-slides).
const SLIDE_ART = [Slide1, Slide2, Slide3, Slide4, Slide5];

function turnSlides(from) {
  return [
    ['Listen', `${from} said a word backwards and we reversed it so it sounds forwards.`],
    ['Guess', 'Type what you think they said.'],
    ['Say it normally first', "Record your guess the normal way; we'll flip it for you to try to imitate."],
    [
      'Copy the flipped sound',
      <>
        Listen to your flipped voice and imitate it. That's your backwards recording.{' '}
        <span className="slide-tip">Tip: playback in half speed helps here.</span>
      </>,
    ],
    [
      'Send it on',
      'The next friend hears your backwards recording played in reverse, so it sounds forwards and… it’s confusing, we know. That’s why it’s fun.',
    ],
  ].map(([title, body], i) => {
    const Art = SLIDE_ART[i];
    return { title, body, art: <Art /> };
  });
}

/** How to play a friend's chain turn. */
export default function HowToPlaySheet({ open, onClose, from = 'your friend' }) {
  return <Slideshow open={open} onClose={onClose} slides={turnSlides(from)} label="How to play your turn" />;
}

const SWIPE_PX = 50;

/**
 * Bottom-sheet slideshow, one step per slide. slides: [{ title, body, art }].
 * onClose(how, slideIndex): how = 'done' | 'skip' | 'dismiss'.
 */
export function Slideshow({ open, onClose, slides, label }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const dialogRef = useRef(null);
  const touchX = useRef(null);
  const list = slides;
  const last = index === list.length - 1;

  const go = (next) => {
    if (next < 0 || next >= list.length) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
  };

  useEffect(() => {
    if (!open) return undefined;
    setIndex(0);
    dialogRef.current && dialogRef.current.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose('dismiss', index);
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };
  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -SWIPE_PX) go(index + 1);
    if (dx > SWIPE_PX) go(index - 1);
  };

  const { title, body, art } = list[index];

  return (
    <div className="sheet-backdrop" onClick={() => onClose('dismiss', index)}>
      <div
        className="sheet slideshow"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="slideshow-top">
          <div className="dots" aria-hidden="true">
            {list.map((_, i) => (
              <span key={i} className={'dot' + (i === index ? ' dot-on' : '')} />
            ))}
          </div>
          {!last && (
            <button className="btn-text slideshow-skip" onClick={() => onClose('skip', index)}>
              Skip
            </button>
          )}
        </div>

        <div className={'slide ' + (dir > 0 ? 'slide-next' : 'slide-prev')} key={index} aria-live="polite">
          <div className="slide-art" aria-hidden="true">
            {art}
          </div>
          <p className="slide-step">
            Step {index + 1} of {list.length}
          </p>
          <h2 className="slide-title">{title}</h2>
          <p className="slide-body">{body}</p>
        </div>

        <div className="slideshow-nav">
          {index > 0 && (
            <Button variant="ghost" onClick={() => go(index - 1)} className="slideshow-back">
              Back
            </Button>
          )}
          <Button onClick={last ? () => onClose('done', index) : () => go(index + 1)}>{last ? "Let's go" : 'Next'}</Button>
        </div>
      </div>
    </div>
  );
}

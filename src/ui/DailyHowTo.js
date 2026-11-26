import React from 'react';
import { Slideshow } from './HowToPlaySheet';
import TryDots from './TryDots';
import { ReactComponent as Listen } from './art/turn-slide-1.svg';
import { ReactComponent as Guess } from './art/turn-slide-2.svg';
import { ReactComponent as Mimic } from './art/turn-slide-4.svg';

function TriesArt() {
  return (
    <div className="tries-art">
      <TryDots used={2} max={5} note="Guesses and mimics cost tries." />
    </div>
  );
}

const SLIDES = [
  {
    title: "It's backwards",
    body: 'Every day there’s a new phrase, played backwards. Listen as many times as you like.',
    art: <Listen />,
  },
  {
    title: 'Mimic it',
    body: 'Record yourself copying the backwards sound. We flip your recording so it plays forwards, and the phrase might just pop out.',
    art: <Mimic />,
  },
  {
    title: 'Guess what it says',
    body: 'Type what you think it says. Feeling brave? Guess before mimicking at all, and get it first time to be a mind reader.',
    art: <Guess />,
  },
  {
    title: 'You have 5 tries',
    body: 'Every guess uses a try. Your first mimic is free, but each one after that uses a try. Run out and you lose your streak.',
    art: <TriesArt />,
  },
];

// First visit (opened by itself): nudge towards a guided practice game.
// Opened from the button: "Let's go" first, practice as the smaller option.
const FINISH = {
  auto: { primary: { label: 'Try a practice game', how: 'practice' }, secondary: { label: 'Skip to today’s puzzle', how: 'done' } },
  button: { primary: { label: "Let's go", how: 'done' }, secondary: { label: 'Try a practice game', how: 'practice' } },
};

/** How to play the daily puzzle. onClose(how, slide); how === 'practice' means go practise. */
export default function DailyHowTo({ open, onClose, source = 'button' }) {
  return <Slideshow open={open} onClose={onClose} slides={SLIDES} label="How to play the daily puzzle" finish={FINISH[source]} />;
}

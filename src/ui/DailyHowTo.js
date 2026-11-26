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
    body: 'Every guess uses a try, right or wrong. Your first mimic doesn’t, but each one after that does. The last try has to be a guess; run out and we’ll show you the answer.',
    art: <TriesArt />,
  },
];

/** How to play the daily puzzle. */
export default function DailyHowTo({ open, onClose }) {
  return <Slideshow open={open} onClose={onClose} slides={SLIDES} label="How to play the daily puzzle" />;
}

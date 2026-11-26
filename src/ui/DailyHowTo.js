import React from 'react';
import { Slideshow } from './HowToPlaySheet';
import TryString from './TryString';
import { ReactComponent as Listen } from './art/turn-slide-1.svg';
import { ReactComponent as Guess } from './art/turn-slide-2.svg';
import { ReactComponent as Mimic } from './art/turn-slide-4.svg';

function TriesArt() {
  return (
    <div className="tries-art">
      <TryString used={2} max={5} />
      <p>2 of 5 tries used</p>
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
    title: 'Guess what it says',
    body: 'Type what you think it says. Every guess uses a try, right or wrong. Get it first time without mimicking and you’re a mind reader.',
    art: <Guess />,
  },
  {
    title: 'Stuck? Mimic it',
    body: 'Record yourself copying the backwards sound. We flip your recording so it plays forwards, and the phrase might just pop out. Your first mimic doesn’t use a try; after that, each one does.',
    art: <Mimic />,
  },
  {
    title: 'You have 5 tries',
    body: 'Solve it in as few tries as you can. The last try has to be a guess. Run out and we’ll show you the answer.',
    art: <TriesArt />,
  },
];

/** How to play the daily puzzle. */
export default function DailyHowTo({ open, onClose }) {
  return <Slideshow open={open} onClose={onClose} slides={SLIDES} label="How to play the daily puzzle" />;
}

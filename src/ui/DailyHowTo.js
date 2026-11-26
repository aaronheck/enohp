import React from 'react';
import { Slideshow } from './HowToPlaySheet';
import { ReactComponent as Listen } from './art/turn-slide-1.svg';
import { ReactComponent as Guess } from './art/turn-slide-2.svg';
import { ReactComponent as Mimic } from './art/turn-slide-4.svg';

const SCORECARD = [
  ['🤯', 'Mind reader', '0 mimics'],
  ['🐦', 'Birdie', '1 mimic'],
  ['⛳', 'Par', '2 mimics'],
  ['🌧️', 'Bogey', '3 mimics'],
];

function Scorecard() {
  return (
    <div className="scorecard">
      {SCORECARD.map(([emoji, name, count]) => (
        <div key={name} className={'scorecard-row' + (name === 'Par' ? ' scorecard-par' : '')}>
          <span aria-hidden="true">{emoji}</span>
          <b>{name}</b>
          <small>{count}</small>
        </div>
      ))}
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
    body: 'You get one guess to start. Get it straight away and you’re a mind reader.',
    art: <Guess />,
  },
  {
    title: 'Stuck? Mimic it',
    body: 'Record yourself copying the backwards sound. We flip your recording so it plays forwards, and the phrase might just pop out. Each mimic gives you another guess.',
    art: <Mimic />,
  },
  {
    title: 'Scored like golf',
    body: 'Each mimic is a stroke. Par is 2. Get it with no mimics at all and you’re a mind reader.',
    art: <Scorecard />,
  },
];

/** How to play the daily puzzle. */
export default function DailyHowTo({ open, onClose }) {
  return <Slideshow open={open} onClose={onClose} slides={SLIDES} label="How to play the daily puzzle" />;
}

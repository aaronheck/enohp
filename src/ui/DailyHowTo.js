import React from 'react';
import { Slideshow } from './HowToPlaySheet';
import { ReactComponent as Listen } from './art/turn-slide-1.svg';
import { ReactComponent as Guess } from './art/turn-slide-2.svg';
import { ReactComponent as Mimic } from './art/turn-slide-4.svg';

const SCORECARD = [
  ['🤯', 'Mind reader', '1 · no mimic'],
  ['⛳', 'Hole in one', '1 stroke'],
  ['🏌️', 'Par', '2 strokes'],
  ['🌧️', 'Bogey', '3 strokes'],
  ['🧵', 'End of the line', '5 · out'],
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
    body: 'Every guess is a stroke, right or wrong. Get it first try, without mimicking, and you’re a mind reader.',
    art: <Guess />,
  },
  {
    title: 'Stuck? Mimic it',
    body: 'Record yourself copying the backwards sound. We flip your recording so it plays forwards, and the phrase might just pop out. Your first mimic is free; after that each one is a stroke.',
    art: <Mimic />,
  },
  {
    title: 'Scored like golf',
    body: 'Par is 2. You have 5 strokes, and the last one has to be a guess. Run out and it’s the end of the line.',
    art: <Scorecard />,
  },
];

/** How to play the daily puzzle. */
export default function DailyHowTo({ open, onClose }) {
  return <Slideshow open={open} onClose={onClose} slides={SLIDES} label="How to play the daily puzzle" />;
}

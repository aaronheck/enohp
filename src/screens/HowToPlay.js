import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Screen } from '../ui/components';
import './screens.css';

// TODO: make this an interactive practice round (a pre-recorded clip to guess,
// real mic but nothing saved). For now it explains the loop.
export default function HowToPlay() {
  return (
    <Screen left={<Link to="/">yelnats</Link>} right="how to play">
      <h1 className="title title-sm turn-title">
        Telephone,
        <br />
        <span className="accent">but backwards.</span>
      </h1>
      <ol className="how">
        <li>
          <div>
            <b>Listen</b>
            <span>Hear the last person's recording, rewound. It almost sounds like English.</span>
          </div>
        </li>
        <li>
          <div>
            <b>Guess</b>
            <span>Type what you think they said.</span>
          </div>
        </li>
        <li>
          <div>
            <b>Say it, then flip it</b>
            <span>
              Say your guess normally. We play it back reversed — that's the sound you need to copy.
            </span>
          </div>
        </li>
        <li>
          <div>
            <b>Pass it on</b>
            <span>Record your best backwards impression and send the link. At the end, see how far the word drifted.</span>
          </div>
        </li>
      </ol>
      <div className="spacer" />
      <Button to="/friends">Got it</Button>
    </Screen>
  );
}

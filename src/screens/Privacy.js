import React from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../ui/components';
import './screens.css';

/** /privacy: plain-English "what we record". Keep it true when the app changes. */
export default function Privacy() {
  return (
    <Screen left={<Link to="/">← Play</Link>} className="privacy">
      <h1 className="title title-sm">Privacy</h1>
      <p className="lede" style={{ marginTop: 8 }}>
        Short version: no accounts, no ads, no trackers. Your voice stays on your phone unless you choose to send it.
      </p>

      <h2>Your microphone</h2>
      <ul>
        <li>We only record while you’re mimicking: from tapping <b>Mimic it</b> until you tap stop.</li>
        <li>
          If you’ve already allowed the mic, we open it a moment early, once you’ve heard the puzzle, so recording starts
          instantly. Nothing is recorded until you tap. Your phone may show its mic light while it’s open. We close it
          when you finish the puzzle or leave the page.
        </li>
      </ul>

      <h2>Your recordings</h2>
      <ul>
        <li>
          <b>Daily puzzle and practice:</b> your mimics are saved only on this device (so you can replay them) and are
          never uploaded. We keep the last 7 puzzles’ worth.
        </li>
        <li>
          <b>Brag videos and images</b> are made on your phone. They only go anywhere if you share them.
        </li>
        <li>
          <b>Play with friends:</b> this one does upload your recording, to our server on Amazon Web Services, so the next
          friend in the chain can hear it. Anyone with the chain’s link can listen.
        </li>
      </ul>

      <h2>What we count</h2>
      <ul>
        <li>
          Anonymous game stats, so we can make the game better: visits, plays, tries, guesses (including wrong ones),
          shares, and errors. Each device gets a random ID stored in your browser, so we can count players and see if
          people come back.
        </li>
        <li>Your browser and device type, time zone and language. Not your name, email, contacts or exact location.</li>
        <li>No cookies, no advertising, no third-party analytics. Our stats don’t store your IP address.</li>
        <li>
          The font comes from Google Fonts, so Google sees a request from your browser when the page loads, like on
          most websites.
        </li>
      </ul>

      <h2>Deleting it</h2>
      <ul>
        <li>
          Everything we keep on your phone (progress, streak, mimics, the random ID) disappears if you clear this site’s
          data in your browser settings.
        </li>
        <li>The anonymous stats can’t be tied back to you, so there’s nothing to look up.</li>
      </ul>
      <p className="muted" style={{ margin: '24px 0' }}>
        Last updated November 2026.
      </p>
    </Screen>
  );
}

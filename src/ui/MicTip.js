import React, { useState } from 'react';
import { Slideshow } from './HowToPlaySheet';
import { markMicTipSeen } from '../lib/micTip';
import { track } from '../lib/analytics';
import './MicTip.css';

const SITE = 'yelnatsgame.com';

/** Safari's bottom address bar, with the page menu button ringed. */
function AddressBarArt() {
  return (
    <div className="ios-phone">
      <div className="ios-page">
        <div className="ios-page-line w80" />
        <div className="ios-page-line w60" />
        <div className="ios-page-line w70" />
      </div>
      <div className="ios-bar">
        <span className="ios-bar-btn ios-ring" aria-label="Page menu">
          <PageMenuIcon />
        </span>
        <span className="ios-url">{SITE}</span>
        <span className="ios-bar-btn ios-dim">↻</span>
      </div>
    </div>
  );
}

function PageMenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3.5" y="4" width="17" height="16" rx="3.5" />
      <path d="M8 9.5h8M8 13h8M8 16.5h5" />
    </svg>
  );
}

/** The page menu, with Website Settings ringed. */
function MenuArt() {
  const rows = ['Hide Distracting Items', 'Show Reader', 'Translate', 'Website Settings', 'More'];
  return (
    <div className="ios-phone">
      <div className="ios-menu">
        {rows.map((r) => (
          <div key={r} className={'ios-menu-row' + (r === 'Website Settings' ? ' ios-ring' : '')}>
            <span>{r === 'More' ? '•••  More' : r}</span>
            {r === 'Website Settings' && <span className="ios-gear">⚙︎</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The site's settings, with Microphone set to Allow. */
function AllowArt() {
  return (
    <div className="ios-phone">
      <div className="ios-sheet">
        <div className="ios-sheet-title">{SITE}</div>
        <div className="ios-group">
          <div className="ios-row">
            <span>Camera</span>
            <span className="ios-val">Ask ›</span>
          </div>
          <div className="ios-row ios-ring">
            <span>Microphone</span>
            <span className="ios-val ios-allow">Allow ›</span>
          </div>
          <div className="ios-row">
            <span>Location</span>
            <span className="ios-val">Ask ›</span>
          </div>
        </div>
        <div className="ios-choices">
          <span>Ask</span>
          <span>Deny</span>
          <span className="ios-choice-on">Allow ✓</span>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    title: 'Tap the page menu',
    body: 'In Safari, tap the button at the left end of the address bar. (If the bar is hidden, scroll up a little.)',
    art: <AddressBarArt />,
  },
  {
    title: 'Website Settings',
    body: (
      <>
        Tap <b>Website Settings</b>. Don’t see it? Tap <b>More</b> first, and it’s in there.
      </>
    ),
    art: <MenuArt />,
  },
  {
    title: 'Microphone: Allow',
    body: (
      <>
        Tap <b>Microphone</b> and pick <b>Allow</b>. Only Yelnats gets it, and no more popups.
      </>
    ),
    art: <AllowArt />,
  },
];

const FINISH = { primary: { label: 'Done', how: 'done' } };

/**
 * Card on the results screen: "Tired of tapping Allow?" Opens the 3-step walkthrough.
 * Shows once; any choice (walkthrough finished, ✕, "already did it") puts it away for good.
 */
export default function MicTip({ onGone }) {
  const [open, setOpen] = useState(false);

  const gone = (how, log) => {
    if (log) track('howto_close', { game: 'mic', how });
    markMicTipSeen(how);
    onGone && onGone();
  };

  return (
    <div className="mic-tip">
      <button className="mic-tip-close" onClick={() => gone('card_x', true)} aria-label="Hide">
        ✕
      </button>
      <p className="mic-tip-title">🎙 Tired of tapping “Allow” for the mic?</p>
      <p className="mic-tip-body">Set Safari to always allow it on Yelnats. Takes 10 seconds.</p>
      <div className="mic-tip-actions">
        <button
          className="btn btn-primary mic-tip-go"
          onClick={() => {
            track('howto_open', { game: 'mic', source: 'card' });
            setOpen(true);
          }}
        >
          Show me how
        </button>
        <button className="btn-text mic-tip-already" onClick={() => gone('already', true)}>
          Already done
        </button>
      </div>
      <Slideshow
        open={open}
        label="Always allow the microphone in Safari"
        slides={SLIDES}
        finish={FINISH}
        onClose={(how, slide) => {
          track('howto_close', { game: 'mic', how, slide });
          setOpen(false);
          if (how === 'done') gone('done');
        }}
      />
    </div>
  );
}

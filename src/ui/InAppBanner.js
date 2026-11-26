import React, { useEffect, useState } from 'react';
import { deviceContext, track } from '../lib/analytics';
import './InAppBanner.css';

const APP_NAMES = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', snapchat: 'Snapchat', linkedin: 'LinkedIn', x: 'X', google_app: 'the Google app',
};
const KEY = 'yelnats.inappDismissed';

/** Where the "open in browser" option lives in each app. */
function steps(app, os) {
  const browser = os === 'ios' ? 'Safari' : 'your browser';
  if (app === 'instagram') return os === 'ios' ? ['Tap ••• at the top right', 'Choose “Open in external browser”'] : ['Tap ⋮ at the top right', 'Choose “Open in Chrome”'];
  if (app === 'facebook') return ['Tap ••• at the top right', `Choose “Open in ${os === 'ios' ? 'external browser' : 'Chrome'}”`];
  if (app === 'tiktok') return ['Tap ••• at the top right', 'Choose “Open in browser”'];
  if (app === 'snapchat') return ['Tap ⋮ or ••• at the top', `Choose “Open in ${browser}”`];
  return ['Tap the menu (••• or ⋮)', `Choose “Open in ${browser}”`];
}

/**
 * Links opened inside Instagram, TikTok etc. play in the app's own browser, where the
 * microphone is often blocked. Tell those players how to open Yelnats in a real browser.
 */
export default function InAppBanner() {
  const [ctx] = useState(() => deviceContext());
  const app = ctx.in_app ? ctx.browser : null;
  const [hidden, setHidden] = useState(() => {
    try {
      return !!sessionStorage.getItem(KEY);
    } catch (e) {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (app && !hidden) track('inapp_banner', { action: 'shown', app, os: ctx.os });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!app || hidden) return null;
  const url = window.location.href;
  const name = APP_NAMES[app] || 'this app';
  const browser = ctx.os === 'ios' ? 'Safari' : ctx.os === 'android' ? 'Chrome' : 'your browser';

  // Try to jump straight out: iOS 17+ understands x-safari-https://; Android opens an
  // intent in the default browser. If it doesn't work, the steps are right there.
  const openOut = () => {
    track('inapp_banner', { action: 'open', app, os: ctx.os });
    const rest = url.replace(/^https?:\/\//, '');
    window.location.href = ctx.os === 'ios' ? `x-safari-https://${rest}` : `intent://${rest}#Intent;scheme=https;end`;
  };
  const copy = async () => {
    track('inapp_banner', { action: 'copy', app, os: ctx.os });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (e) {
      window.prompt('Copy this link:', url); // eslint-disable-line no-alert
    }
  };
  const close = () => {
    track('inapp_banner', { action: 'dismiss', app, os: ctx.os });
    try {
      sessionStorage.setItem(KEY, '1');
    } catch (e) {
      // ignore
    }
    setHidden(true);
  };

  return (
    <div className="inapp" role="region" aria-label={`Open in ${browser}`}>
      <button className="inapp-close" onClick={close} aria-label="Hide">
        ✕
      </button>
      <p className="inapp-title">🎙 Open in {browser} to play</p>
      <p className="inapp-body">The mic often doesn’t work inside {name}.</p>
      <ol className="inapp-steps">
        {steps(app, ctx.os).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="inapp-actions">
        {(ctx.os === 'ios' || ctx.os === 'android') && (
          <button className="btn btn-primary inapp-go" onClick={openOut}>
            Open in {browser}
          </button>
        )}
        <button className="btn-text inapp-copy" onClick={copy}>
          {copied ? 'Link copied ✓' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

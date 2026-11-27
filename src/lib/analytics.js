// In-house analytics: small batches of events to POST /events on our own backend
// (logged in CloudWatch). No cookies, no third parties. Each device gets a random
// anonymous ID so we can count unique and returning players.
import { API_BASE } from '../api/client';

const DEVICE_KEY = 'yelnats.device';
const FLUSH_MS = 4000;
let queue = [];
let timer = null;
let device = null;
let session = null;

function randomId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

function ids() {
  if (!device) {
    try {
      device = localStorage.getItem(DEVICE_KEY);
      if (!device) {
        device = randomId();
        localStorage.setItem(DEVICE_KEY, device);
      }
    } catch (e) {
      device = device || randomId();
    }
  }
  if (!session) session = randomId();
  return { device, session };
}

function isDevDevice() {
  try {
    // Check the URL too: the first page view fires before ?dev=1 is saved.
    if (new URLSearchParams(window.location.search).get('dev') === '1') return true;
    return localStorage.getItem('yelnats.dev') === '1';
  } catch (e) {
    return false;
  }
}

// Tests and local dev talk to the mock API, so their events never reach the real logs.
const enabled = () => typeof window !== 'undefined' && process.env.NODE_ENV !== 'test' && process.env.REACT_APP_ADMIN !== '1';

/** Sends whatever is queued. Uses sendBeacon when the page is going away. */
export function flush(leaving = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const payload = JSON.stringify({ ...ids(), events: queue.splice(0, 50) });
  const url = API_BASE + '/events';
  // text/plain keeps this a "simple" request (no CORS preflight) and works with sendBeacon.
  const blob = new Blob([payload], { type: 'text/plain' });
  try {
    if (leaving && navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;
    fetch(url, { method: 'POST', body: blob, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  } catch (e) {
    // analytics must never break the game
  }
  if (queue.length) flush(leaving);
}

/**
 * Coarse, non-identifying context for page views: browser, OS, in-app browsers
 * (Instagram, TikTok…), home-screen app, time zone and language. The time zone is
 * the only location we keep, and it's what the device already says, no permission.
 */
export function deviceContext(ua = navigator.userAgent, touch = navigator.maxTouchPoints || 0) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  const os = ios
    ? 'ios'
    : /Android/.test(ua)
    ? 'android'
    : /CrOS/.test(ua)
    ? 'chromeos'
    : /Windows/.test(ua)
    ? 'windows'
    : /Macintosh/.test(ua)
    ? 'mac'
    : /Linux/.test(ua)
    ? 'linux'
    : 'other';
  const inApp = /Instagram/.test(ua)
    ? 'instagram'
    : /FBAN|FBAV|FB_IAB/.test(ua)
    ? 'facebook'
    : /musical_ly|BytedanceWebview|TikTok/i.test(ua)
    ? 'tiktok'
    : /Snapchat/.test(ua)
    ? 'snapchat'
    : /LinkedInApp/.test(ua)
    ? 'linkedin'
    : /\bTwitter|TwitterAndroid/.test(ua)
    ? 'x'
    : /GSA\//.test(ua)
    ? 'google_app'
    : null;
  const browser =
    inApp ||
    (/CriOS/.test(ua)
      ? 'chrome'
      : /FxiOS|Firefox\//.test(ua)
      ? 'firefox'
      : /EdgiOS|Edg\//.test(ua)
      ? 'edge'
      : /SamsungBrowser/.test(ua)
      ? 'samsung'
      : /OPR\/|OPiOS/.test(ua)
      ? 'opera'
      : ios
      ? 'safari'
      : /Chrome\//.test(ua)
      ? 'chrome'
      : /Safari\//.test(ua)
      ? 'safari'
      : 'other');
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (e) {
    // old browser
  }
  let standalone = false;
  try {
    standalone = !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  } catch (e) {
    // ignore
  }
  return {
    browser,
    os,
    in_app: !!inApp,
    mobile: ios || /Android|Mobile/.test(ua),
    standalone,
    tz,
    lang: (navigator.language || '').slice(0, 10),
  };
}

/** Records an event, e.g. track('guess', { puzzle: 3, correct: false, try: 2, text: 'pea and butter' }). */
export function track(name, props = {}) {
  if (!enabled()) return;
  queue.push({
    name,
    ts: Date.now(),
    props: {
      ...props,
      ...(name === 'page_view' ? deviceContext() : {}),
      host: window.location.host,
      ...(isDevDevice() ? { dev: true } : {}),
    },
  });
  if (!timer) timer = setTimeout(() => flush(false), FLUSH_MS);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
}

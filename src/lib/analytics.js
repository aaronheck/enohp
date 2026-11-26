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
    return localStorage.getItem('yelnats.dev') === '1';
  } catch (e) {
    return false;
  }
}

// Tests and local dev talk to the mock API, so their events never reach the real logs.
const enabled = () => typeof window !== 'undefined' && process.env.NODE_ENV !== 'test';

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

/** Records an event, e.g. track('guess', { puzzle: 3, correct: false, try: 2, text: 'pea and butter' }). */
export function track(name, props = {}) {
  if (!enabled()) return;
  queue.push({
    name,
    ts: Date.now(),
    props: { ...props, host: window.location.host, ...(isDevDevice() ? { dev: true } : {}) },
  });
  if (!timer) timer = setTimeout(() => flush(false), FLUSH_MS);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
}

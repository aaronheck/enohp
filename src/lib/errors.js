// Error reporting: crashes and things that went wrong on players' phones (mic refused,
// audio didn't load, API failed) go to our own analytics as "client_error" events,
// so they show up on the dashboard. Capped per visit so a loop can't flood the logs.
import React from 'react';
import { track } from './analytics';

const MAX_PER_VISIT = 10;
let sent = 0;
const seen = new Set();

/** kind: 'crash' | 'render' | 'promise' | 'mic' | 'audio' | 'api'. */
export function reportError(kind, info = {}) {
  try {
    const msg = String(info.msg || info.message || '').slice(0, 120);
    const key = `${kind}|${msg}|${info.err || ''}`;
    if (seen.has(key) || sent >= MAX_PER_VISIT) return;
    seen.add(key);
    sent++;
    const props = { kind, msg, path: window.location.pathname };
    for (const k of ['err', 'src', 'line', 'col', 'status', 'what', 'where']) if (info[k] != null) props[k] = info[k];
    track('client_error', props);
  } catch (e) {
    // never let error reporting cause errors
  }
}

const fileOf = (url) => String(url || '').split('/').pop().split('?')[0].slice(0, 60);

/** Catch uncaught errors and rejected promises anywhere on the page. */
export function installErrorHandlers() {
  window.addEventListener('error', (e) => {
    const msg = e.message || (e.error && e.error.message) || '';
    // Browser noise, and cross-origin scripts that hide their details.
    if (/ResizeObserver loop|^Script error\.?$/.test(msg)) return;
    reportError('crash', { msg, err: e.error && e.error.name, src: fileOf(e.filename), line: e.lineno, col: e.colno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason || {};
    reportError('promise', { msg: r.message || String(r), err: r.name });
  });
}

/** Shows a friendly screen instead of a blank page if a screen crashes, and reports it. */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { broken: false };
  }

  static getDerivedStateFromError() {
    return { broken: true };
  }

  componentDidCatch(error, info) {
    const where = ((info && info.componentStack) || '').trim().split('\n')[0].trim().slice(0, 80);
    reportError('render', { msg: error && error.message, err: error && error.name, where });
  }

  render() {
    if (!this.state.broken) return this.props.children;
    return (
      <main className="screen">
        <div>
          <h1 className="title title-sm">Oops, that broke.</h1>
          <p className="lede" style={{ marginTop: 12 }}>
            Something went wrong on our end. Reloading usually fixes it. Your progress is saved.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </main>
    );
  }
}

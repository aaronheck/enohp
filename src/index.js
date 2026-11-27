import React from 'react';
import { createRoot } from 'react-dom/client';
import './ui/theme.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary, installErrorHandlers } from './lib/errors';

installErrorHandlers();

// One address only: progress is saved per site, and browsers treat www.yelnatsgame.com
// and yelnatsgame.com as different sites (so switching between them looked like a wipe).
if (window.location.hostname === 'www.yelnatsgame.com') {
  window.location.replace(`https://yelnatsgame.com${window.location.pathname}${window.location.search}${window.location.hash}`);
}

// Ask the browser to keep our saved progress (streaks, mimics) instead of clearing it
// to free up space. Harmless where it isn't supported.
try {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
} catch (e) {
  // ignore
}

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

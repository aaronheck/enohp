// TEMPORARY dev helper: a "Reset puzzle" button only for whoever opens the site
// with ?dev=1 (remembered on that device; ?dev=0 turns it off). Remove before launch.
const FLAG = 'yelnats.dev';

export function isDev() {
  try {
    const q = new URLSearchParams(window.location.search).get('dev');
    if (q === '1') localStorage.setItem(FLAG, '1');
    if (q === '0') localStorage.removeItem(FLAG);
    return localStorage.getItem(FLAG) === '1';
  } catch (e) {
    return false;
  }
}

/** Forget all daily progress and saved mimics on this device, then reload. */
export function resetDaily() {
  try {
    localStorage.removeItem('yelnats.daily');
  } catch (e) {
    // ignore
  }
  const done = () => window.location.replace(window.location.pathname);
  try {
    const req = window.indexedDB.deleteDatabase('yelnats');
    req.onsuccess = req.onerror = req.onblocked = done;
  } catch (e) {
    done();
  }
}

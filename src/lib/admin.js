// Admin (puzzle review) build only: REACT_APP_ADMIN=1, served from the Pi. Saves Aaron's
// plays and recordings to the review database.
export const IS_ADMIN = process.env.REACT_APP_ADMIN === '1';

async function call(path, opts = {}) {
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  return r.json();
}
const post = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const listCandidates = () => call('/api/admin/candidates');
export const saveReview = (n, review) => post('/api/admin/review', { n, ...review });

export function uploadMimic(n, blob) {
  return fetch(`/api/admin/mimic?n=${n}`, { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob }).catch(() => {});
}

export function finishPlay(n, { outcome, tries, mimics, actions }) {
  return post('/api/admin/finish', { n, outcome, tries, mimics, actions }).catch(() => {});
}

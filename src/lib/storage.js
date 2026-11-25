// Small localStorage helpers. Everything here is per-device.

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Private mode or storage full; not worth interrupting the game for.
  }
}

export function getNickname() {
  // Older versions stored the raw string, not JSON.
  let raw = null;
  try {
    raw = localStorage.getItem('nickname');
  } catch (e) {
    return '';
  }
  if (!raw || raw === 'null') return '';
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch (e) {
    return raw;
  }
}

export function setNickname(name) {
  write('nickname', name.trim());
}

const HISTORY_KEY = 'yelnats.games';

/** Games this device has played, newest first: [{ id, guess, turn, at }]. */
export function getPlayedGames() {
  const games = read(HISTORY_KEY, []);
  return Array.isArray(games) ? games : [];
}

export function rememberGame({ id, guess, turn }) {
  const rest = getPlayedGames().filter((g) => g.id !== id);
  write(HISTORY_KEY, [{ id, guess, turn, at: Date.now() }, ...rest].slice(0, 50));
}

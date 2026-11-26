// Daily puzzle: per-device progress, golf scoring and the share card.
const KEY = 'yelnats.daily';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return d && typeof d === 'object' && d.puzzles ? d : { puzzles: {}, voice: null };
  } catch (e) {
    return { puzzles: {}, voice: null };
  }
}

function save(d) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {
    // storage full / private mode: progress just won't persist
  }
}

const blank = () => ({ mimics: 0, guesses: [], solved: false, phrase: null, voice: null });

export function getPuzzleState(n) {
  return { ...blank(), ...(load().puzzles[n] || {}) };
}

export function updatePuzzleState(n, patch) {
  const d = load();
  d.puzzles[n] = { ...blank(), ...(d.puzzles[n] || {}), ...patch };
  save(d);
  return d.puzzles[n];
}

export function getVoice() {
  return load().voice;
}

export function setVoice(voice) {
  const d = load();
  d.voice = voice;
  save(d);
}

/** Days in a row solved, counting back from today (or yesterday if today isn't solved yet). */
export function streak(today) {
  const { puzzles } = load();
  let n = puzzles[today] && puzzles[today].solved ? today : today - 1;
  let count = 0;
  while (n >= 1 && puzzles[n] && puzzles[n].solved) {
    count++;
    n--;
  }
  return count;
}

export const PAR = 2;

/** Golf result for a number of backwards mimics. */
export function golf(mimics) {
  if (mimics <= 0) return { name: 'Mind reader', emoji: '🤯' };
  if (mimics === 1) return { name: 'Birdie', emoji: '🐦' };
  if (mimics === 2) return { name: 'Par', emoji: '⛳' };
  if (mimics === 3) return { name: 'Bogey', emoji: '🌧️' };
  if (mimics === 4) return { name: 'Double bogey', emoji: '🌧️' };
  return { name: `+${mimics - PAR}`, emoji: '🏌️' };
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Spoiler-free share text, e.g. "Yelnats Daily #12 / 🐦 Birdie · 1 mimic / 🎙 Kevin · ❌❌✅". */
export function shareText(number, state, url) {
  const g = golf(state.mimics);
  const misses = Math.min(state.guesses.length, 10);
  const marks = '❌'.repeat(misses) + (state.guesses.length > 10 ? '…' : '') + '✅';
  return [
    `Yelnats Daily #${number}`,
    `${g.emoji} ${g.name} · ${plural(state.mimics, 'mimic')}`,
    `🎙 ${state.voice || 'Kevin'} · ${marks}`,
    url,
  ].join('\n');
}

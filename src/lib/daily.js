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

// guesses = wrong guesses; actions = what happened in order ('mimic' | 'miss' | 'hit').
const blank = () => ({ mimics: 0, guesses: [], actions: [], solved: false, failed: false, phrase: null, voice: null });

export function getPuzzleState(n) {
  return { ...blank(), ...(load().puzzles[n] || {}) };
}

export function updatePuzzleState(n, patch) {
  const d = load();
  d.puzzles[n] = { ...blank(), ...(d.puzzles[n] || {}), ...patch };
  save(d);
  return d.puzzles[n];
}

/** Has this device played any daily puzzle before (guessed or mimicked)? */
export function hasPlayedDaily() {
  return Object.values(load().puzzles).some((p) => p.solved || p.mimics > 0 || (p.guesses && p.guesses.length));
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
export const MAX_STROKES = 5;

/** Strokes so far: every guess (right or wrong), and every mimic after the first (which is free). */
export function strokes(state) {
  return state.guesses.length + (state.solved ? 1 : 0) + Math.max(0, state.mimics - 1);
}

/** What the next mimic would cost (the first one is free). */
export const mimicCost = (state) => (state.mimics >= 1 ? 1 : 0);

/**
 * A mimic is allowed unless it would use up the last stroke: the 5th stroke must be
 * a guess, otherwise you'd spend it on a mimic you can't use.
 * (state.guesses holds wrong guesses only, so strokes() here = strokes used so far.)
 */
export function canMimic(state) {
  return !state.solved && !state.failed && strokes(state) + mimicCost(state) < MAX_STROKES;
}

/** Golf-style result for a finished puzzle (par 2; 1 is the best possible). */
export function result(state) {
  if (state.failed) return { name: 'End of the line', emoji: '🧵' };
  const n = strokes(state);
  if (n <= 1) return state.mimics === 0 ? { name: 'Mind reader', emoji: '🤯' } : { name: 'Hole in one', emoji: '⛳' };
  if (n === 2) return { name: 'Par', emoji: '🏌️' };
  if (n === 3) return { name: 'Bogey', emoji: '🌧️' };
  if (n === 4) return { name: 'Double bogey', emoji: '🌧️' };
  return { name: 'Triple bogey', emoji: '🌧️' };
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : /(s|sh|ch|x)$/.test(word) ? 'es' : 's'}`;

const ACTION_EMOJI = { mimic: '🎙', miss: '❌', hit: '✅' };

/** Spoiler-free share text, e.g. "Yelnats Daily #12 / 🐦 Birdie · 1 stroke / 🎙❌🎙✅". */
export function shareText(number, state, url) {
  const r = result(state);
  const trail = (state.actions || []).map((a) => ACTION_EMOJI[a] || '').join('') || (state.failed ? '❌' : '✅');
  return [`Yelnats Daily #${number}`, `${r.emoji} ${r.name} · ${plural(strokes(state), 'stroke')}`, trail, url].join('\n');
}

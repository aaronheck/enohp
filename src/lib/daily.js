// Daily puzzle: per-device progress, tries and the share card.
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
const blank = () => ({ heard: false, mimics: 0, guesses: [], actions: [], solved: false, failed: false, phrase: null, voice: null });

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

export const MAX_TRIES = 5;

/** Tries used: every guess (right or wrong), and every mimic after the first (which is free). */
export function triesUsed(state) {
  return state.guesses.length + (state.solved ? 1 : 0) + Math.max(0, state.mimics - 1);
}

/** What the next mimic would cost (the first one is free). */
export const mimicCost = (state) => (state.mimics >= 1 ? 1 : 0);

/**
 * A mimic is allowed unless it would use up the last try: the 5th try must be a
 * guess, otherwise you'd spend it on a mimic you can't use.
 */
export function canMimic(state) {
  return !state.solved && !state.failed && triesUsed(state) + mimicCost(state) < MAX_TRIES;
}

/** Solved on the very first guess without mimicking. */
export function isMindReader(state) {
  return state.solved && state.mimics === 0 && state.guesses.length === 0;
}

/** "2/5", or "X/5" when out of tries. */
export function score(state) {
  return `${state.failed ? 'X' : triesUsed(state)}/${MAX_TRIES}`;
}

export function plural(n, word) {
  if (n === 1) return `${n} ${word}`;
  if (/[^aeiou]y$/.test(word)) return `${n} ${word.slice(0, -1)}ies`;
  return `${n} ${word}${/(s|sh|ch|x)$/.test(word) ? 'es' : 's'}`;
}

const ACTION_EMOJI = { mimic: '🎙', miss: '❌', hit: '✅' };

export const ACTION_LABEL = { mimic: 'Mimic', miss: 'Miss', hit: 'Got it' };
export const actionEmoji = (a) => ACTION_EMOJI[a] || '';

/**
 * Spoiler-free share text, e.g.
 *   Yelnats Daily #12 · 2/5
 *   🎙❌✅
 *   🔥 3-day streak
 */
export function shareText(number, state, url, days = 0) {
  const trail = (state.actions || []).map(actionEmoji).join('') || (state.failed ? '❌' : '✅');
  const badge = isMindReader(state) ? ' 🤯 Mind reader' : '';
  const lines = [`Yelnats Daily #${number} · ${score(state)}${badge}`, trail];
  if (days >= 2) lines.push(`🔥 ${days}-day streak`);
  if (url) lines.push(url);
  return lines.join('\n');
}

/** Milliseconds until the next puzzle (midnight, Pacific time). */
export function msUntilNextPuzzle(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(now))
      .map((p) => [p.type, Number(p.value)])
  );
  const elapsed = ((parts.hour % 24) * 3600 + parts.minute * 60 + parts.second) * 1000 + (now % 1000);
  return 86400000 - elapsed;
}

// The how-to opens by itself only until it's been seen once (finished, skipped or closed),
// or the player has done a practice game.
const HOWTO_KEY = 'yelnats.howtoSeen';
export function howtoSeen() {
  try {
    return !!localStorage.getItem(HOWTO_KEY) || !!localStorage.getItem('yelnats.practice');
  } catch (e) {
    return false;
  }
}
export function markHowtoSeen() {
  try {
    localStorage.setItem(HOWTO_KEY, '1');
  } catch (e) {
    // private mode
  }
}

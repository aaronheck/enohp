// Practice games: three easy puzzles with less coaching each time. Audio lives in
// public/practice/<n>-puzzle.mp3 (reversed) and <n>-answer.mp3. Nothing here counts
// towards the daily streak.
export const PRACTICE = [
  { n: 1, phrase: 'cupcake', hint: 'A small sweet treat with frosting on top.', coach: 'full' },
  { n: 2, phrase: 'good dog', hint: 'Two words. Something you’d say to a pet.', coach: 'some' },
  { n: 3, phrase: 'rubber duck', hint: 'Two words. A bath-time toy.', coach: 'none' },
];

export const practiceAudio = (n, kind) => `/practice/${n}-${kind}.mp3`;

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '');
}

function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Same forgiving check as the daily puzzle: case, spaces, punctuation, a small typo. */
export function isCorrect(guess, phrase) {
  const g = normalize(guess);
  const p = normalize(phrase);
  if (!g) return false;
  if (g === p) return true;
  const allowed = p.length >= 14 ? 2 : p.length >= 8 ? 1 : 0;
  return editDistance(g, p) <= allowed;
}

/**
 * Which coaching step the player is on:
 * listen -> mimic -> stop (while recording) -> hear (their flipped mimic) -> guess.
 */
export function coachStep({ heard, recording, mimics, heardMimic }) {
  if (!heard) return 'listen';
  if (recording) return 'stop';
  if (mimics === 0) return 'mimic';
  if (!heardMimic) return 'hear';
  return 'guess';
}

const KEY = 'yelnats.practice';

export function practiceDone() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(d) ? d : [];
  } catch (e) {
    return [];
  }
}

export function markPracticeDone(n) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set([...practiceDone(), n])).sort()));
  } catch (e) {
    // fine
  }
}

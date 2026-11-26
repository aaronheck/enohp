// Practice games: three easy puzzles with less coaching each time. Audio lives in
// public/practice/<n>-puzzle.mp3 (reversed) and <n>-answer.mp3. Nothing here counts
// towards the daily streak.
export const PRACTICE = [
  { n: 1, phrase: 'cupcake', hint: 'A small sweet treat with frosting on top.', coach: 'full' },
  { n: 2, phrase: 'good dog', hint: 'Two words. Something you’d say to a pet.', coach: 'some' },
  { n: 3, phrase: 'rubber duck', hint: 'Two words. A bath-time toy.', coach: 'none' },
];

export const practiceAudio = (n, kind) => `/practice/${n}-${kind}.mp3`;

// Same answer rules as the daily puzzle.
export { isCorrect } from './match';

/**
 * Which coaching step the player is on (one pass only):
 * listen -> mimic -> stop (while recording) -> hear (their flipped mimic) -> done.
 * "hear" stays up until the player does something next (types a guess or mimics
 * again), which sets `coached`.
 */
export function coachStep({ heard, recording, mimics, coached }) {
  if (coached) return null;
  if (!heard) return 'listen';
  if (recording) return 'stop';
  if (mimics === 0) return 'mimic';
  return 'hear';
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

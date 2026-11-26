'use strict';
// Daily puzzle: which phrase is today's, which voices exist, where the audio lives,
// and whether a guess is right. Shared by the Lambda, the mock API and the audio generator.
const { phrases } = require('./daily-phrases.json');

// Puzzle #1 is this date; a new puzzle starts at midnight in this time zone.
const LAUNCH = process.env.DAILY_LAUNCH || '2026-11-26';
const TIME_ZONE = 'America/Los_Angeles';

const VOICES = [
  { id: 'Kevin', label: 'Kevin' },
  { id: 'Joanna', label: 'Joanna' },
  { id: 'Ruth', label: 'Ruth' },
  { id: 'Matthew', label: 'Matthew' },
  { id: 'Stephen', label: 'Stephen' },
];

/** YYYY-MM-DD in the puzzle time zone. */
function localDate(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(ms)
  );
}

const dayIndex = (ymd) => Math.round(Date.parse(`${ymd}T00:00:00Z`) / 86400000);

/** Today's puzzle number (1 on launch day), or 0 before launch. */
function puzzleNumber(ms) {
  return Math.max(0, dayIndex(localDate(ms)) - dayIndex(LAUNCH) + 1);
}

/** The phrase for puzzle n. The list repeats once it runs out. */
function phraseFor(n) {
  return phrases[(n - 1) % phrases.length];
}

// Audio keys deliberately don't contain the phrase.
const puzzleKey = (n, voice) => `daily/${n}/${voice}-puzzle.mp3`;
const answerKey = (n, voice) => `daily/${n}/${voice}-answer.mp3`;

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

/** Right answer? Ignores case, spaces and punctuation, and forgives a small typo. */
function isCorrect(guess, phrase) {
  const g = normalize(guess);
  const p = normalize(phrase);
  if (!g) return false;
  if (g === p) return true;
  const allowed = p.length >= 14 ? 2 : p.length >= 8 ? 1 : 0;
  return editDistance(g, p) <= allowed;
}

module.exports = { VOICES, LAUNCH, TIME_ZONE, localDate, puzzleNumber, phraseFor, puzzleKey, answerKey, isCorrect, phrases };

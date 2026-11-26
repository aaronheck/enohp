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

const { isCorrect } = require('./match');


module.exports = { VOICES, LAUNCH, TIME_ZONE, localDate, puzzleNumber, phraseFor, puzzleKey, answerKey, isCorrect, phrases };

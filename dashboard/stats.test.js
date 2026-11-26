'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarise, isReal } = require('./stats');

const now = Date.parse('2026-11-26T20:00:00Z');
const ev = (name, device, props = {}) => ({ t: 'evt', name, device, session: device, ts: now - 60000, host: 'yelnatsgame.com', ...props });

test('only real production traffic counts', () => {
  assert.equal(isReal({ host: 'yelnatsgame.com' }), true);
  assert.equal(isReal({ host: 'www.yelnatsgame.com' }), true);
  assert.equal(isReal({ host: 'yelnatsgame.com', dev: true }), false);
  assert.equal(isReal({ host: '192.168.4.22:3000' }), false);
});

test('funnel, tries and wrong guesses per puzzle', () => {
  const events = [
    ev('daily_view', 'a', { puzzle: 2 }), ev('daily_listened', 'a', { puzzle: 2 }), ev('mimic', 'a', { puzzle: 2 }),
    ev('guess', 'a', { puzzle: 2, correct: false, text: 'Pea  and Butter' }), ev('guess', 'a', { puzzle: 2, correct: true }),
    ev('daily_solved', 'a', { puzzle: 2, tries: 2, mimics: 1 }),
    ev('daily_view', 'b', { puzzle: 2 }), ev('daily_listened', 'b', { puzzle: 2 }),
    ev('guess', 'b', { puzzle: 2, correct: false, text: 'pea and butter' }), ev('daily_failed', 'b', { puzzle: 2 }),
    ev('daily_view', 'c', { puzzle: 2, forced: true }), // preview: ignored
    ev('daily_view', 'd', { puzzle: 2, dev: true }), // dev: ignored
  ];
  const r = summarise(events, { days: 7, now });
  const p = r.puzzles[0];
  assert.equal(p.puzzle, 2);
  assert.deepEqual([p.viewed, p.listened, p.mimicked, p.guessed, p.solved, p.failed], [2, 2, 1, 2, 1, 1]);
  assert.equal(p.solveRate, 0.5);
  assert.equal(p.tries.find((t) => t.label === '2').count, 1);
  assert.equal(p.tries.find((t) => t.label === 'X').count, 1);
  assert.deepEqual(p.wrongGuesses, [{ text: 'pea and butter', count: 2 }]);
  assert.equal(r.totals.players, 2);
  assert.equal(r.daily.length, 7);
  assert.equal(r.daily[6].players, 2);
});

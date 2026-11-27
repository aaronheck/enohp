'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarise, isReal, parseLogLine } = require('./stats');

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

test('retention: came back next day / within a week, only for days old enough', () => {
  const day = 86400000;
  const at = (dAgo, name, device, props = {}) => ({ ...ev(name, device, props), ts: now - dAgo * day });
  const events = [
    at(13, 'page_view', 'old'), at(2, 'page_view', 'old'), // active on the window's first day: left out
    at(10, 'page_view', 'a'), at(9, 'page_view', 'a'), // back next day
    at(10, 'page_view', 'b'), at(5, 'page_view', 'b'), // back within a week, not next day
    at(10, 'page_view', 'c'), // never back
    at(1, 'page_view', 'd'), // too new for next-day (yesterday)
  ];
  const r = summarise(events, { days: 14, now }).retention;
  assert.equal(r.newPlayers, 4);
  assert.deepEqual(r.d1, { eligible: 3, back: 1 });
  assert.deepEqual(r.d7, { eligible: 3, back: 2 });
});

test('errors: grouped, counted by devices', () => {
  const events = [
    ev('client_error', 'a', { kind: 'mic', err: 'NotAllowedError', msg: 'denied' }),
    ev('client_error', 'b', { kind: 'mic', err: 'NotAllowedError', msg: 'denied' }),
    ev('client_error', 'b', { kind: 'crash', msg: 'x is undefined', src: 'main.js', line: 3 }),
  ];
  const e = summarise(events, { days: 7, now }).errors;
  assert.equal(e.total, 3);
  assert.equal(e.devices, 2);
  assert.equal(e.top[0].kind, 'mic');
  assert.equal(e.top[0].devices, 2);
});

test('log lines: events are found whatever order their fields are in', () => {
  const pre = '2026-11-27T01:02:03.000Z\tabc-123\tINFO\t';
  assert.equal(parseLogLine(pre + '{"t":"evt","name":"page_view","device":"d"}').name, 'page_view');
  assert.equal(parseLogLine(pre + '{"puzzle":3,"host":"yelnatsgame.com","t":"evt","name":"guess","device":"d"}').name, 'guess');
  assert.equal(parseLogLine(pre + '{"msg":"not an event"}'), null);
  assert.equal(parseLogLine('START RequestId: abc'), null);
});

test('home devices are left out, including their plays from before they were tagged', () => {
  const events = [
    ev('page_view', 'me', { ts: now - 3 * 86400000 }), // old, untagged
    ev('page_view', 'me', { home: true }),
    ev('page_view', 'player'),
  ];
  const t = summarise(events, { days: 7, now }).totals;
  assert.equal(t.visitors, 1);
});

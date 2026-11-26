'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { isCorrect } = require('./match');
const { phrases } = require('./daily');

test('matching: forgiving in the ways that are fair', () => {
  const yes = [
    ['Peanut-Butter!', 'peanut butter'],
    ['peanutbuter', 'peanut butter'],
    ['bread & butter', 'bread and butter'],
    ['c u later', 'see you later'],
    ['see ya later', 'see you later'],
    ['sea you later', 'see you later'], // sounds the same
    ['under the see', 'under the sea'],
    ['peace of cake', 'piece of cake'],
    ['thank u very much', 'thank you very much'],
    ['cup of tea', 'a cup of tea'], // articles are hard to hear backwards
    ['early bird', 'the early bird'],
    ['rock n roll', 'rock and roll'],
    ['rock & roll', 'rock and roll'],
    ['jump 4 joy', 'jump for joy'],
    ['jump four joy', 'jump for joy'],
    ['back 2 school', 'back to school'],
    ['time 4 bed', 'time for bed'],
    ['happy bday', 'happy birthday'],
    ['onceuponatime', 'once upon a time'],
    ['knight', 'night'],
  ];
  for (const [g, p] of yes) assert.ok(isCorrect(g, p), `${g} should match ${p}`);
  const no = [
    ['peanut brittle', 'peanut butter'],
    ['hot dot', 'hot dog'], // short phrases stay exact
    ['', 'hot dog'],
    ['the', 'the end'],
    ['good night', 'good morning'],
    ['see you soon', 'see you later'],
    ['cat', 'cat nap'],
  ];
  for (const [g, p] of no) assert.ok(!isCorrect(g, p), `${g} should NOT match ${p}`);
});

test('matching: every phrase matches itself and not its neighbours', () => {
  for (let i = 0; i < phrases.length; i++) {
    assert.ok(isCorrect(phrases[i], phrases[i]), phrases[i]);
    const other = phrases[(i + 1) % phrases.length];
    assert.ok(!isCorrect(other, phrases[i]), `${other} vs ${phrases[i]}`);
  }
});

test('matching: the browser copy (src/lib/match.js) is in sync', () => {
  const body = (f) => fs.readFileSync(f, 'utf8').split('// ---- shared body: start ----')[1].split('// ---- shared body: end ----')[0];
  assert.equal(body(path.join(__dirname, '../src/lib/match.js')), body(path.join(__dirname, 'match.js')), 'run: node scripts/sync-match.js');
});

'use strict';
// Run with: npm test (in lambda/)  — uses Node's built-in test runner, no AWS needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, ABANDONED_AFTER_MS } = require('./app');
const daily = require('./daily');

function fakeWorld() {
  const games = new Map();
  const files = new Set();
  let clock = Date.parse('2026-11-28T20:00:00Z'); // puzzle #3 (launch 2026-11-26, Pacific time)
  let n = 0;
  const deps = {
    now: () => clock,
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    getGame: async (id) => (games.has(id) ? structuredClone(games.get(id)) : null),
    putGame: async (game, { expectedTurns }) => {
      const cur = games.get(game.id);
      if (expectedTurns == null && cur) return false;
      if (expectedTurns != null) {
        const count = cur && Array.isArray(cur.turns) ? cur.turns.length : 0;
        if (!cur || count !== expectedTurns) return false;
      }
      games.set(game.id, structuredClone(game));
      return true;
    },
    recordingExists: async (key) => files.has(key),
    signGet: async (key) => `https://s3/get/${key}`,
    signPut: async (key) => `https://s3/put/${key}`,
  };
  return {
    games,
    files,
    tick: (ms) => (clock += ms),
    handler: createHandler(deps),
  };
}

const call = async (w, method, path, { body, query } = {}) => {
  const res = await w.handler({
    httpMethod: method,
    path,
    body: body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body),
    queryStringParameters: query || null,
  });
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null, headers: res.headers };
};

async function newGame(w, body) {
  const r = await call(w, 'POST', '/game', { body });
  assert.equal(r.status, 200);
  return r.body.id;
}

async function play(w, id, token, guess = 'pickle jar', nickname = 'Aaron', upload = true) {
  const r = await call(w, 'POST', '/recording', { body: { id, consistencyToken: token, guess, nickname } });
  if (r.status === 200 && upload) w.files.add(`${r.body.key}.wav`);
  return r;
}

test('create, play two turns, read back with tokens and signed links', async () => {
  const w = fakeWorld();
  const id = await newGame(w, { turns: 5, allowReRecords: true });
  assert.deepEqual(w.games.get(id).settings, { turns: 5 });

  const t1 = await play(w, id, '');
  assert.equal(t1.status, 200);
  assert.match(t1.body.url, /^https:\/\/s3\/put\/.+\.wav$/);

  const t2 = await play(w, id, t1.body.key, 'tickle car', 'Maya');
  assert.equal(t2.status, 200);

  const g = await call(w, 'GET', '/game', { query: { id } });
  assert.equal(g.status, 200);
  assert.deepEqual(
    g.body.game.turns.map((t) => [t.guess, t.nickname, t.consistencyToken]),
    [
      ['pickle jar', 'Aaron', t1.body.key],
      ['tickle car', 'Maya', t2.body.key],
    ]
  );
  assert.equal(g.body.game.turns[0].signedGet, `https://s3/get/${t1.body.key}.wav`);
  assert.equal(g.headers['Access-Control-Allow-Origin'], '*');
});

test('a stale token is rejected with the message the frontend recognises', async () => {
  const w = fakeWorld();
  const id = await newGame(w);
  const t1 = await play(w, id, '');
  await play(w, id, t1.body.key);
  const late = await play(w, id, t1.body.key, 'nickel bar');
  assert.equal(late.status, 400);
  assert.match(late.body.error, /turn key/i);
});

test('two simultaneous turns: only one wins (no silent overwrite)', async () => {
  const w = fakeWorld();
  const id = await newGame(w);
  const t1 = await play(w, id, '');
  const [a, b] = await Promise.all([play(w, id, t1.body.key, 'tickle car'), play(w, id, t1.body.key, 'nickel bar')]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [200, 400]);
  assert.equal(w.games.get(id).turns.length, 2);
});

test('missing or malformed game ids are a 404 with a JSON body', async () => {
  const w = fakeWorld();
  for (const query of [{ id: '00000000-0000-4000-8000-000000000999' }, { id: 'nope' }, null]) {
    const r = await call(w, 'GET', '/game', { query });
    assert.equal(r.status, 404);
    assert.equal(r.body.error, 'Game not found');
  }
});

test('bad JSON is a 400, not a crash', async () => {
  const w = fakeWorld();
  const r = await call(w, 'POST', '/recording', { body: '{not json' });
  assert.equal(r.status, 400);
});

test('guess is required; text is trimmed and capped; default nickname', async () => {
  const w = fakeWorld();
  const id = await newGame(w);
  assert.equal((await play(w, id, '', '   ')).status, 400);
  const r = await call(w, 'POST', '/recording', {
    body: { id, consistencyToken: '', guess: `  ${'a'.repeat(200)}\n`, nickname: '' },
  });
  assert.equal(r.status, 200);
  const turn = w.games.get(id).turns[0];
  assert.equal(turn.guess.length, 60);
  assert.equal(turn.nickname, 'Someone');
});

test('a turn whose upload never arrived is dropped after a while, so the chain continues', async () => {
  const w = fakeWorld();
  const id = await newGame(w);
  const t1 = await play(w, id, '');
  const orphan = await play(w, id, t1.body.key, 'tickle car', 'Maya', false); // upload failed
  assert.equal(orphan.status, 200);

  // While the upload could still be in flight, the turn stays.
  let g = await call(w, 'GET', '/game', { query: { id } });
  assert.equal(g.body.game.turns.length, 2);

  w.tick(ABANDONED_AFTER_MS + 1);
  g = await call(w, 'GET', '/game', { query: { id } });
  assert.equal(g.body.game.turns.length, 1);

  // The next player builds on turn 1, and the orphan is removed for good.
  const t2 = await play(w, id, t1.body.key, 'nickel bar', 'Jo');
  assert.equal(t2.status, 200);
  assert.deepEqual(
    w.games.get(id).turns.map((t) => t.guess),
    ['pickle jar', 'nickel bar']
  );
  assert.equal(w.games.get(id).turns[0].uploaded, true);
});

test('legacy games (no createdAt/uploaded flags) keep their turns when files exist', async () => {
  const w = fakeWorld();
  const id = '11111111-1111-4111-8111-111111111111';
  w.games.set(id, { id, turns: [{ guess: 'old', nickname: 'aaron', recording: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.wav' }] });
  w.files.add('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.wav');
  const g = await call(w, 'GET', '/game', { query: { id } });
  assert.equal(g.body.game.turns.length, 1);
  const next = await play(w, id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(next.status, 200);
});

test('legacy game created with only an id can take its first turn', async () => {
  const w = fakeWorld();
  const id = '22222222-2222-4222-8222-222222222222';
  w.games.set(id, { id });
  assert.equal((await play(w, id, '')).status, 200);
});

test('recording links are only signed for recording-shaped keys', async () => {
  const w = fakeWorld();
  assert.equal((await call(w, 'GET', '/recording', { query: { id: '../secret.txt' } })).status, 404);
  const ok = await call(w, 'GET', '/recording', { query: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.wav' } });
  assert.equal(ok.status, 200);
});

test('unknown paths and methods', async () => {
  const w = fakeWorld();
  assert.equal((await call(w, 'GET', '/nope')).status, 404);
  assert.equal((await call(w, 'DELETE', '/game')).status, 405);
  assert.equal((await call(w, 'OPTIONS', '/game')).status, 204);
});

test('an optional 0-100 score is stored with the turn and returned', async () => {
  const w = fakeWorld();
  const id = await newGame(w);
  const r = await call(w, 'POST', '/recording', {
    body: { id, consistencyToken: '', guess: 'pickle jar', nickname: 'Aaron', score: 81.6, scoreVersion: 'soundmatch-v1' },
  });
  assert.equal(r.status, 200);
  w.files.add(`${r.body.key}.wav`);
  const g = await call(w, 'GET', '/game', { query: { id } });
  assert.equal(g.body.game.turns[0].score, 82);
  assert.equal(g.body.game.turns[0].scoreVersion, 'soundmatch-v1');
});

test('missing or invalid scores are ignored, never blocking the turn', async () => {
  const w = fakeWorld();
  const id = await newGame(w);
  let token = '';
  for (const score of [undefined, 'high', 150, -3, NaN, null]) {
    const r = await call(w, 'POST', '/recording', { body: { id, consistencyToken: token, guess: 'x', score } });
    assert.equal(r.status, 200);
    w.files.add(`${r.body.key}.wav`);
    token = r.body.key;
  }
  const g = await call(w, 'GET', '/game', { query: { id } });
  assert.equal(g.body.game.turns.length, 6);
  assert.ok(g.body.game.turns.every((t) => !('score' in t)));
});

test('daily: puzzle number follows Pacific midnight from launch', () => {
  assert.equal(daily.puzzleNumber(Date.parse('2026-11-25T20:00:00Z')), 0);
  assert.equal(daily.puzzleNumber(Date.parse('2026-11-26T08:30:00Z')), 1); // 00:30 Pacific
  assert.equal(daily.puzzleNumber(Date.parse('2026-11-27T07:59:00Z')), 1); // 23:59 Pacific
  assert.equal(daily.puzzleNumber(Date.parse('2026-11-27T08:01:00Z')), 2);
  assert.equal(daily.phraseFor(61), daily.phraseFor(1)); // list repeats
});

test('daily: answers are forgiving about case, spacing, punctuation and small typos', () => {
  assert.ok(daily.isCorrect('Peanut-Butter!', 'peanut butter'));
  assert.ok(daily.isCorrect('peanutbuter', 'peanut butter'));
  assert.ok(daily.isCorrect('bread & butter', 'bread and butter'));
  assert.ok(!daily.isCorrect('peanut brittle', 'peanut butter'));
  assert.ok(!daily.isCorrect('hot dot', 'hot dog')); // short phrases need to be exact
  assert.ok(!daily.isCorrect('', 'hot dog'));
});

test('daily: today\'s puzzle returns signed audio for every voice, never the phrase', async () => {
  const w = fakeWorld();
  for (const v of daily.VOICES) w.files.add(daily.puzzleKey(3, v.id));
  const r = await call(w, 'GET', '/daily');
  assert.equal(r.status, 200);
  assert.equal(r.body.number, 3);
  assert.equal(r.body.date, '2026-11-28');
  assert.deepEqual(Object.keys(r.body.audio).sort(), daily.VOICES.map((v) => v.id).sort());
  assert.ok(!JSON.stringify(r.body).includes(daily.phraseFor(3)));
  assert.ok(!JSON.stringify(r.body).includes('answer'));
});

test('daily: missing audio is a 503, not a broken puzzle', async () => {
  const w = fakeWorld();
  assert.equal((await call(w, 'GET', '/daily')).status, 503);
});

test('daily: guessing', async () => {
  const w = fakeWorld();
  const wrong = await call(w, 'POST', '/daily/guess', { body: { number: 3, guess: 'nope' } });
  assert.deepEqual(wrong.body, { correct: false });
  const right = await call(w, 'POST', '/daily/guess', { body: { number: 3, guess: daily.phraseFor(3).toUpperCase() } });
  assert.equal(right.body.correct, true);
  assert.equal(right.body.phrase, daily.phraseFor(3));
  assert.match(right.body.answers.Kevin, /daily\/3\/Kevin-answer\.mp3$/);
  // Past puzzles are fine; future ones and junk are not.
  assert.equal((await call(w, 'POST', '/daily/guess', { body: { number: 1, guess: 'x' } })).status, 200);
  assert.equal((await call(w, 'POST', '/daily/guess', { body: { number: 4, guess: 'x' } })).status, 400);
  assert.equal((await call(w, 'POST', '/daily/guess', { body: { number: 'abc', guess: 'x' } })).status, 400);
  assert.equal((await call(w, 'POST', '/daily/guess', { body: { number: 3, guess: '  ' } })).status, 400);
});

test('daily: reveal gives the answer for today or earlier only', async () => {
  const w = fakeWorld();
  const r = await call(w, 'POST', '/daily/reveal', { body: { number: 3 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.phrase, daily.phraseFor(3));
  assert.match(r.body.answers.Kevin, /daily\/3\/Kevin-answer\.mp3$/);
  assert.equal((await call(w, 'POST', '/daily/reveal', { body: { number: 4 } })).status, 400);
});

'use strict';
// Yelnats backend: request handling, independent of AWS clients so it can be tested
// with fakes (see app.test.js). index.js wires in the real DynamoDB/S3 clients.
//
// API (unchanged from the original Lambda, so old and new frontends both work):
//   POST /game                      -> { id }
//   GET  /game?id=                  -> { game: { id, turns: [{ guess, nickname, recording,
//                                        signedGet, consistencyToken, score?, scoreVersion? }] } }
//   POST /recording { id, consistencyToken, guess, nickname, score?, scoreVersion? }
//                                   -> { url (presigned PUT for audio/wav), key }
//   GET  /recording?id=<key>.wav    -> { url }
//   GET  /daily                     -> { number, date, voices, audio: { <voice>: url } }  (puzzle audio)
//   POST /daily/guess { number, guess } -> { correct } (+ phrase, answers: { <voice>: url } when right)
//   POST /daily/reveal { number }   -> { phrase, answers }  (after running out of tries)
//   POST /events { events: [{ name, props, ts }], device, session } -> 204  (analytics)

const crypto = require('crypto');
const daily = require('./daily');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SIGNED_URL_SECONDS = 5 * 60;
// A turn whose recording never arrived is treated as abandoned after this long,
// so the chain can continue from the turn before it.
const ABANDONED_AFTER_MS = 10 * 60 * 1000;
const MAX_GUESS = 60;
const MAX_NICKNAME = 24;
const MAX_TURNS = 50;
const MAX_BODY = 8 * 1024;

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.wav$/i;

// Analytics: which events we accept, and limits so junk can't flood the logs.
const EVENT_NAMES = new Set([
  'page_view', 'daily_view', 'daily_listened', 'howto_open', 'howto_close', 'mimic', 'guess',
  'daily_solved', 'daily_failed', 'share', 'play_with_friends', 'chain_started', 'turn_opened', 'turn_sent', 'pregame_play',
]);
const MAX_EVENTS = 50;
const MAX_PROPS = 15;
const MAX_STRING = 120;
const ID_LIKE = /^[a-z0-9-]{8,40}$/i;

function cleanProps(props) {
  const out = {};
  if (!props || typeof props !== 'object' || Array.isArray(props)) return out;
  for (const [k, v] of Object.entries(props).slice(0, MAX_PROPS)) {
    if (!/^[a-z_][a-z0-9_]{0,30}$/i.test(k)) continue;
    if (typeof v === 'string') out[k] = v.replace(/[\u0000-\u001f]/g, ' ').slice(0, MAX_STRING);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

const respond = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });
const fail = (statusCode, error) => respond(statusCode, { error });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseBody(event) {
  const raw = event.body == null ? '' : String(event.body);
  if (raw.length > MAX_BODY) throw new HttpError(413, 'Request too large');
  if (!raw.trim()) return {};
  const text = event.isBase64Encoded ? Buffer.from(raw, 'base64').toString('utf8') : raw;
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    throw new HttpError(400, 'Invalid JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid JSON');
  return body;
}

function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  // Collapse whitespace and strip control characters.
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * deps: {
 *   getGame(id) -> game | null
 *   putGame(game, { expectedTurns }) -> true, or false if the turn count changed (lost a race)
 *   recordingExists(key) -> boolean
 *   signGet(key, seconds) -> url
 *   signPut(key, contentType, seconds) -> url
 *   now() -> ms, newId() -> uuid
 * }
 */
function createHandler(deps) {
  const now = deps.now || (() => Date.now());
  const newId = deps.newId || (() => crypto.randomUUID());

  // The turns that count. The last turn is dropped if its recording never arrived
  // and it's been long enough that the upload clearly failed.
  async function liveTurns(game) {
    const turns = Array.isArray(game.turns) ? game.turns : [];
    if (!turns.length) return turns;
    const last = turns[turns.length - 1];
    if (last.uploaded) return turns;
    const recent = typeof last.createdAt === 'number' && now() - last.createdAt < ABANDONED_AFTER_MS;
    if (recent) return turns;
    if (await deps.recordingExists(last.recording)) return turns;
    return turns.slice(0, -1);
  }

  async function createGame(event) {
    const body = parseBody(event);
    const game = { id: newId(), createdAt: now(), turns: [] };
    // The old create screen sent a turn count; keep it for when games can end.
    const requested = Number(body.turns);
    if (Number.isInteger(requested) && requested >= 2 && requested <= MAX_TURNS) {
      game.settings = { turns: requested };
    }
    const ok = await deps.putGame(game, { expectedTurns: null });
    if (!ok) throw new HttpError(500, 'Could not create game');
    return respond(200, { id: game.id });
  }

  async function readGame(event) {
    const id = (event.queryStringParameters || {}).id;
    if (!id || !ID_RE.test(id)) return fail(404, 'Game not found');
    const game = await deps.getGame(id);
    if (!game) return fail(404, 'Game not found');
    const turns = await liveTurns(game);
    const out = await Promise.all(
      turns.map(async (t) => ({
        guess: t.guess,
        nickname: t.nickname,
        ...(typeof t.score === 'number' ? { score: t.score, scoreVersion: t.scoreVersion } : {}),
        recording: t.recording,
        signedGet: await deps.signGet(t.recording, SIGNED_URL_SECONDS),
        consistencyToken: String(t.recording || '').replace(/\.wav$/, ''),
      }))
    );
    const result = { id: game.id, turns: out };
    if (game.settings) result.settings = game.settings;
    return respond(200, { game: result });
  }

  async function startTurn(event) {
    const body = parseBody(event);
    if (typeof body.id !== 'string' || !ID_RE.test(body.id)) return fail(404, 'Game not found');
    const guess = cleanText(body.guess, MAX_GUESS);
    if (!guess) return fail(400, 'Missing guess.');
    const nickname = cleanText(body.nickname, MAX_NICKNAME) || 'Someone';
    // Optional sound-match score from the player's browser (0-100). Bad values are
    // ignored rather than rejected so a scoring glitch never blocks a turn.
    const scored = Number.isFinite(body.score) && body.score >= 0 && body.score <= 100;
    const scoreFields = scored
      ? { score: Math.round(body.score), scoreVersion: cleanText(body.scoreVersion, 24) || 'unknown' }
      : {};

    const game = await deps.getGame(body.id);
    if (!game) return fail(404, 'Game not found');
    const storedCount = Array.isArray(game.turns) ? game.turns.length : 0;
    const turns = await liveTurns(game);
    if (turns.length >= MAX_TURNS) return fail(400, 'Game is full.');

    const last = turns[turns.length - 1];
    if (last && last.recording !== `${body.consistencyToken}.wav`) {
      // Someone already played after the turn this player heard.
      return fail(400, 'Turn key is not right.');
    }

    // Mark the turn we're building on as delivered (its recording was heard).
    const kept = turns.map((t, i) => (i === turns.length - 1 && !t.uploaded ? { ...t, uploaded: true } : t));
    const key = `${newId()}.wav`;
    const updated = {
      ...game,
      turns: [...kept, { guess, nickname, ...scoreFields, recording: key, createdAt: now(), uploaded: false }],
    };
    // Only save if nobody else changed the game since we read it.
    const saved = await deps.putGame(updated, { expectedTurns: storedCount });
    if (!saved) return fail(400, 'Turn key is not right.');

    const url = await deps.signPut(key, 'audio/wav', SIGNED_URL_SECONDS);
    return respond(200, { url, key: key.replace(/\.wav$/, '') });
  }

  async function readRecording(event) {
    const key = (event.queryStringParameters || {}).id;
    if (!key || !KEY_RE.test(key)) return fail(404, 'Recording not found');
    return respond(200, { url: await deps.signGet(key, SIGNED_URL_SECONDS) });
  }

  // TEMPORARY (pre-launch testing): with DAILY_ALLOW_OVERRIDE=1, ?n= picks any puzzle
  // and guesses/reveals aren't limited to today. Turn off before launch.
  const overrideAllowed = () => (deps.env || process.env).DAILY_ALLOW_OVERRIDE === '1';
  const latestAllowed = () => (overrideAllowed() ? Infinity : daily.puzzleNumber(now()));

  const VOICE = daily.VOICES[0];
  const knownAudio = new Set();

  async function readDaily(event) {
    const asked = Number((event.queryStringParameters || {}).n);
    const n = overrideAllowed() && Number.isInteger(asked) && asked >= 1 ? asked : daily.puzzleNumber(now());
    if (n < 1) return fail(404, 'No puzzle yet');
    // Audio is generated ahead of time; make sure today's is there. Remembered per
    // container, so only the first request for a puzzle pays for the S3 check.
    const key = daily.puzzleKey(n, VOICE.id);
    if (!knownAudio.has(key)) {
      if (!(await deps.recordingExists(key))) return fail(503, "Today's puzzle isn't ready yet");
      knownAudio.add(key);
    }
    // One voice per puzzle (the site only plays Kevin), so only one link to sign.
    const audio = { [VOICE.id]: await deps.signGet(key, SIGNED_URL_SECONDS * 6) };
    return respond(200, { number: n, date: daily.localDate(now()), voices: [VOICE], audio });
  }

  async function guessDaily(event) {
    const body = parseBody(event);
    const n = Number(body.number);
    if (!Number.isInteger(n) || n < 1 || n > latestAllowed()) return fail(400, 'No such puzzle');
    const guess = cleanText(body.guess, MAX_GUESS);
    if (!guess) return fail(400, 'Missing guess.');
    const phrase = daily.phraseFor(n);
    if (!daily.isCorrect(guess, phrase)) return respond(200, { correct: false });
    const answers = {};
    answers[VOICE.id] = await deps.signGet(daily.answerKey(n, VOICE.id), SIGNED_URL_SECONDS * 6);
    return respond(200, { correct: true, phrase, answers });
  }

  async function revealDaily(event) {
    const body = parseBody(event);
    const n = Number(body.number);
    if (!Number.isInteger(n) || n < 1 || n > latestAllowed()) return fail(400, 'No such puzzle');
    const answers = {};
    answers[VOICE.id] = await deps.signGet(daily.answerKey(n, VOICE.id), SIGNED_URL_SECONDS * 6);
    return respond(200, { phrase: daily.phraseFor(n), answers });
  }

  // One log line per event: {"t":"evt",...} so CloudWatch Logs Insights can query them.
  async function recordEvents(event) {
    let body;
    try {
      body = JSON.parse(event.body || '{}'); // sent as text/plain by sendBeacon
    } catch (e) {
      return fail(400, 'Invalid JSON');
    }
    const device = ID_LIKE.test(body.device || '') ? body.device : 'unknown';
    const session = ID_LIKE.test(body.session || '') ? body.session : 'unknown';
    const list = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
    const log = deps.logEvent || ((line) => console.log(line));
    for (const e of list) {
      if (!e || !EVENT_NAMES.has(e.name)) continue;
      const ts = Number.isFinite(e.ts) && Math.abs(e.ts - now()) < 86400000 ? e.ts : now();
      log(JSON.stringify({ t: 'evt', name: e.name, ts, device, session, ...cleanProps(e.props) }));
    }
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  return async function handler(event) {
    const method = event.httpMethod;
    const path = event.path;
    try {
      if (method === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
      if (path === '/game' && method === 'POST') return await createGame(event);
      if (path === '/game' && method === 'GET') return await readGame(event);
      if (path === '/recording' && method === 'POST') return await startTurn(event);
      if (path === '/recording' && method === 'GET') return await readRecording(event);
      if (path === '/daily' && method === 'GET') return await readDaily(event);
      if (path === '/daily/guess' && method === 'POST') return await guessDaily(event);
      if (path === '/daily/reveal' && method === 'POST') return await revealDaily(event);
      if (path === '/events' && method === 'POST') return await recordEvents(event);
      if (['/game', '/recording', '/daily', '/daily/guess', '/daily/reveal', '/events'].includes(path)) return fail(405, 'Unsupported method');
      return fail(404, 'Unsupported path!');
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      console.error('Unhandled error', { method, path, error: e && e.message });
      return fail(500, 'Something went wrong');
    }
  };
}

module.exports = { createHandler, ABANDONED_AFTER_MS, MAX_TURNS };

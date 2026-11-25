// In-memory stand-in for the Lambda backend, for local development and previews.
// Usage: npm run mock-api   (then `npm run start:mock` in another terminal)
// Games and recordings live in memory and vanish when this stops.
const http = require('http');
const crypto = require('crypto');

const PREFIX = '/mock-api';
// Caps so a publicly reachable preview can't eat the Pi's memory.
const MAX_GAMES = 300;
const MAX_TURNS_PER_GAME = 40;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_JSON_BYTES = 8 * 1024;

const games = new Map();
const files = new Map();
const pendingUploads = new Set();

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function evictOldestGame() {
  const [oldestId, game] = games.entries().next().value;
  game.turns.forEach((t) => files.delete(t.recording));
  games.delete(oldestId);
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Handles a request whose path starts with /mock-api. */
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.slice(PREFIX.length);
  try {
    if (path === '/game' && req.method === 'POST') {
      await readBody(req, MAX_JSON_BYTES);
      if (games.size >= MAX_GAMES) evictOldestGame();
      const id = crypto.randomUUID();
      games.set(id, { id, turns: [] });
      return send(res, 200, { id });
    }
    if (path === '/game' && req.method === 'GET') {
      const game = games.get(url.searchParams.get('id'));
      if (!game) return send(res, 404, 'Game not found', 'text/plain');
      const turns = game.turns.map((t) => ({
        ...t,
        signedGet: `${PREFIX}/files/${t.recording}`,
        consistencyToken: t.recording.replace('.wav', ''),
      }));
      return send(res, 200, { game: { ...game, turns } });
    }
    if (path === '/recording' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req, MAX_JSON_BYTES)).toString() || '{}');
      const game = games.get(body.id);
      if (!game) return send(res, 404, 'Game not found', 'text/plain');
      if (game.turns.length >= MAX_TURNS_PER_GAME) return send(res, 400, 'Game is full', 'text/plain');
      const last = game.turns[game.turns.length - 1];
      if (last && last.recording !== body.consistencyToken + '.wav') {
        return send(res, 400, 'Turn key is not right.', 'text/plain');
      }
      const key = crypto.randomUUID();
      const scored = Number.isFinite(body.score) && body.score >= 0 && body.score <= 100;
      game.turns.push({
        guess: str(body.guess, 60),
        nickname: str(body.nickname, 24),
        ...(scored ? { score: Math.round(body.score), scoreVersion: str(body.scoreVersion, 24) || 'unknown' } : {}),
        recording: key + '.wav',
      });
      pendingUploads.add(key + '.wav');
      return send(res, 200, { url: `${PREFIX}/files/${key}.wav`, key });
    }
    const m = path.match(/^\/files\/([\w-]+\.wav)$/);
    if (m && req.method === 'PUT' && pendingUploads.has(m[1])) {
      files.set(m[1], await readBody(req, MAX_UPLOAD_BYTES));
      pendingUploads.delete(m[1]);
      return send(res, 200, '');
    }
    if (m && req.method === 'GET' && files.has(m[1])) {
      return send(res, 200, files.get(m[1]), 'application/octet-stream');
    }
    return send(res, 404, 'Unsupported path!', 'text/plain');
  } catch (e) {
    if (!res.headersSent) send(res, 400, 'Bad request', 'text/plain');
  }
}

module.exports = { handle, PREFIX };

if (require.main === module) {
  const port = Number(process.env.MOCK_API_PORT || 8098);
  http
    .createServer((req, res) =>
      req.url.startsWith(PREFIX) ? handle(req, res) : send(res, 404, 'Not found', 'text/plain')
    )
    .listen(port, '127.0.0.1', () => console.log(`mock api on http://127.0.0.1:${port}${PREFIX}`));
}

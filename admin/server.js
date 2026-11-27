'use strict';
// Puzzle review (admin) for Aaron: play candidate puzzles in the real game UI, then
// keep/ditch them and rate difficulty. Everything (plays, guesses, recordings,
// verdicts) goes in a SQLite database on the Pi. Home network / VPN only.
//   node admin/server.js   ->  https://192.168.4.22:8444  (https://10.8.0.1:8444 over VPN)
// The page is an admin build of the site (npm run build:admin -> admin/build).
const https = require('https');
const fs = require('fs');
const path = require('path');
const { open, DATA } = require('./db');
const { isCorrect } = require('../lambda/match');

const PORT = Number(process.env.ADMIN_PORT || 8444);
const SITE = path.join(__dirname, 'build');
const AUDIO = path.join(DATA, 'audio');
const MAX_MIMIC = 4 * 1024 * 1024;
const db = open();

const allowed = (ip) => /^(::ffff:)?(127\.|10\.8\.0\.|192\.168\.(4|5|6|7)\.)/.test(ip) || ip === '::1';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req, max = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(Object.assign(new Error('Too big'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const json = async (req) => JSON.parse((await readBody(req)).toString() || '{}');

const candidate = (id) => db.prepare('SELECT * FROM candidates WHERE id = ?').get(Number(id));

/** The play in progress for a candidate (one is started when the puzzle is opened). */
function currentPlay(id, create = true) {
  const open = db.prepare('SELECT * FROM plays WHERE candidate_id = ? AND finished_at IS NULL ORDER BY id DESC LIMIT 1').get(id);
  if (open || !create) return open;
  const r = db.prepare('INSERT INTO plays (candidate_id) VALUES (?)').run(id);
  return db.prepare('SELECT * FROM plays WHERE id = ?').get(r.lastInsertRowid);
}

const audioUrls = (id, kind) => ({ Kevin: `/api/audio/${id}/${kind}.mp3` });

/** Has this candidate been played to the end at least once? (Only then is its phrase shown.) */
const finishedOnce = (id) => !!db.prepare("SELECT 1 FROM plays WHERE candidate_id = ? AND outcome IS NOT NULL LIMIT 1").get(id);

async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;

  // ---- the game's own endpoints, so the normal puzzle screen just works ----
  if (p === '/api/daily' && m === 'GET') {
    const c = candidate(url.searchParams.get('n'));
    if (!c) return send(res, 404, { error: 'No such candidate' });
    currentPlay(c.id);
    const d = today();
    return send(res, 200, { number: c.id, date: d, today: c.id, todayDate: d, archive: false, voices: [{ id: 'Kevin', label: 'Kevin' }], audio: audioUrls(c.id, 'puzzle') });
  }
  if (p === '/api/daily/guess' && m === 'POST') {
    const body = await json(req);
    const c = candidate(body.number);
    if (!c) return send(res, 400, { error: 'No such candidate' });
    const guess = String(body.guess || '').slice(0, 80).trim();
    if (!guess) return send(res, 400, { error: 'Missing guess.' });
    const play = currentPlay(c.id);
    const correct = isCorrect(guess, c.phrase);
    db.prepare('INSERT INTO guesses (play_id, candidate_id, text, correct) VALUES (?, ?, ?, ?)').run(play.id, c.id, guess, correct ? 1 : 0);
    return send(res, 200, correct ? { correct: true, phrase: c.phrase, answers: audioUrls(c.id, 'answer') } : { correct: false });
  }
  if (p === '/api/daily/reveal' && m === 'POST') {
    const c = candidate((await json(req)).number);
    if (!c) return send(res, 400, { error: 'No such candidate' });
    return send(res, 200, { phrase: c.phrase, answers: audioUrls(c.id, 'answer') });
  }
  const am = p.match(/^\/api\/audio\/(\d+)\/(puzzle|answer)\.mp3$/);
  if (am && m === 'GET') {
    const file = path.join(AUDIO, am[1], `${am[2]}.mp3`);
    if (!fs.existsSync(file)) return send(res, 404, { error: 'No audio' });
    return send(res, 200, fs.readFileSync(file), 'audio/mpeg');
  }
  if (p === '/api/events' && m === 'POST') {
    await readBody(req, 256 * 1024);
    res.writeHead(204);
    return res.end();
  }

  // ---- review ----
  if (p === '/api/admin/candidates' && m === 'GET') {
    const rows = db.prepare('SELECT * FROM candidates ORDER BY id').all();
    const list = rows.map((c) => {
      const last = db.prepare('SELECT * FROM plays WHERE candidate_id = ? AND outcome IS NOT NULL ORDER BY id DESC LIMIT 1').get(c.id);
      const plays = db.prepare('SELECT COUNT(*) n FROM plays WHERE candidate_id = ? AND outcome IS NOT NULL').get(c.id).n;
      const recordings = db.prepare('SELECT COUNT(*) n FROM mimics WHERE candidate_id = ?').get(c.id).n;
      return {
        id: c.id,
        phrase: last ? c.phrase : null, // hidden until played to the end
        played: plays,
        last: last ? { outcome: last.outcome, tries: last.tries, mimics: last.mimics } : null,
        verdict: c.verdict,
        difficulty: c.difficulty,
        notes: c.notes,
        recordings,
      };
    });
    return send(res, 200, list);
  }
  if (p === '/api/admin/mimic' && m === 'POST') {
    const c = candidate(url.searchParams.get('n'));
    if (!c) return send(res, 400, { error: 'No such candidate' });
    const buf = await readBody(req, MAX_MIMIC);
    const play = currentPlay(c.id);
    const type = String(req.headers['content-type'] || '');
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
    const dir = path.join(AUDIO, String(c.id), 'mimics');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${play.id}-${Date.now()}.${ext}`);
    fs.writeFileSync(file, buf);
    db.prepare('INSERT INTO mimics (play_id, candidate_id, file, bytes) VALUES (?, ?, ?, ?)').run(play.id, c.id, path.relative(DATA, file), buf.length);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/admin/mimics' && m === 'GET') {
    // Recordings from this candidate's most recent play that has any.
    const id = Number(url.searchParams.get('n'));
    const last = db.prepare('SELECT play_id FROM mimics WHERE candidate_id = ? ORDER BY id DESC LIMIT 1').get(id);
    if (!last) return send(res, 200, []);
    const rows = db.prepare('SELECT id FROM mimics WHERE play_id = ? ORDER BY id').all(last.play_id);
    return send(res, 200, rows.map((r) => ({ url: `/api/admin/mimic-file/${r.id}` })));
  }
  const mf = p.match(/^\/api\/admin\/mimic-file\/(\d+)$/);
  if (mf && m === 'GET') {
    const row = db.prepare('SELECT file FROM mimics WHERE id = ?').get(Number(mf[1]));
    if (!row) return send(res, 404, { error: 'No such recording' });
    const file = path.join(DATA, row.file);
    const type = file.endsWith('.mp4') ? 'audio/mp4' : file.endsWith('.ogg') ? 'audio/ogg' : 'audio/webm';
    return send(res, 200, fs.readFileSync(file), type);
  }
  if (p === '/api/admin/finish' && m === 'POST') {
    const b = await json(req);
    const c = candidate(b.n);
    if (!c) return send(res, 400, { error: 'No such candidate' });
    const play = currentPlay(c.id);
    db.prepare("UPDATE plays SET finished_at = datetime('now'), outcome = ?, tries = ?, mimics = ?, actions = ? WHERE id = ?").run(
      b.outcome === 'failed' ? 'failed' : 'solved',
      Number(b.tries) || 0,
      Number(b.mimics) || 0,
      JSON.stringify(b.actions || []),
      play.id
    );
    return send(res, 200, { ok: true });
  }
  if (p === '/api/admin/review' && m === 'POST') {
    const b = await json(req);
    const c = candidate(b.n);
    if (!c) return send(res, 400, { error: 'No such candidate' });
    if (!finishedOnce(c.id)) return send(res, 400, { error: 'Play it first' });
    const verdict = ['keep', 'ditch'].includes(b.verdict) ? b.verdict : null;
    const difficulty = Number.isInteger(b.difficulty) && b.difficulty >= 1 && b.difficulty <= 5 ? b.difficulty : null;
    db.prepare("UPDATE candidates SET verdict = ?, difficulty = ?, notes = ?, reviewed_at = datetime('now') WHERE id = ?").run(
      verdict,
      difficulty,
      String(b.notes || '').slice(0, 500) || null,
      c.id
    );
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'Not found' });
}

const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };

function serveSite(req, res, url) {
  let file = path.join(SITE, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(SITE, 'index.html');
  if (!fs.existsSync(file)) return send(res, 503, 'Admin build missing: run npm run build:admin', 'text/plain');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

https
  .createServer({ key: fs.readFileSync(path.join(DATA, 'key.pem')), cert: fs.readFileSync(path.join(DATA, 'cert.pem')) }, async (req, res) => {
    if (!allowed(req.socket.remoteAddress)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const url = new URL(req.url, 'https://x');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return serveSite(req, res, url);
    } catch (e) {
      return send(res, e.status || 500, { error: String(e.message).slice(0, 200) });
    }
  })
  .listen(PORT, '0.0.0.0', () => console.log(`yelnats puzzle review on https://192.168.4.22:${PORT}`));

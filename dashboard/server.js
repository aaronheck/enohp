'use strict';
// Yelnats analytics dashboard: a tiny server on the Pi that queries the analytics
// events in CloudWatch Logs (AWS CLI, profile "enohp") and serves a one-page dashboard.
// Home network and VPN only.
//   node dashboard/server.js   ->  http://192.168.4.22:8090
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { summarise, parseLogLine } = require('./stats');

const PORT = Number(process.env.DASH_PORT || 8090);
const AWS = process.env.AWS_CLI || path.join(process.env.HOME, '.local/bin/aws');
const GROUP = '/aws/lambda/enohp';
const CACHE_MS = 5 * 60 * 1000; // refresh at most every 5 minutes
const cache = new Map();

const allowed = (ip) => /^(::ffff:)?(127\.|10\.8\.0\.|192\.168\.(4|5|6|7)\.)/.test(ip) || ip === '::1';

function aws(args) {
  return new Promise((resolve, reject) =>
    execFile(AWS, [...args, '--region', 'us-east-1', '--output', 'json'], { env: { ...process.env, AWS_PROFILE: process.env.AWS_PROFILE || 'enohp' }, maxBuffer: 64 * 1024 * 1024 }, (err, out, errOut) =>
      err ? reject(new Error(errOut || err.message)) : resolve(JSON.parse(out))
    )
  );
}

/** All analytics events in the window (Logs Insights caps a query at 10,000 rows). */
async function fetchEvents(days) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86400;
  const query = 'fields @message | filter @message like /"t":"evt"/ | sort @timestamp asc | limit 10000';
  const { queryId } = await aws(['logs', 'start-query', '--log-group-name', GROUP, '--start-time', String(start), '--end-time', String(end), '--query-string', query]);
  for (let i = 0; i < 60; i++) {
    const r = await aws(['logs', 'get-query-results', '--query-id', queryId]);
    if (r.status === 'Complete') {
      const events = [];
      for (const row of r.results) {
        const msg = (row.find((c) => c.field === '@message') || {}).value || '';
        const e = parseLogLine(msg);
        if (e) events.push(e);
      }
      return { events, truncated: r.results.length >= 10000 };
    }
    if (r.status === 'Failed' || r.status === 'Cancelled') throw new Error('Query ' + r.status);
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error('Query timed out');
}

// Numbers are kept ready in memory and refreshed in the background, so the page loads
// instantly: each refresh shells out to the AWS CLI a few times (~3 s each on the Pi).
// Querying costs a tiny fraction of a cent.
async function load(days) {
  // DASH_FAKE=1: made-up data for checking the layout.
  const { events, truncated } = process.env.DASH_FAKE ? { events: require('./fake').fakeEvents(days), truncated: false } : await fetchEvents(days);
  return { ...summarise(events, { days }), truncated };
}

function refresh(days) {
  const entry = cache.get(days) || {};
  if (entry.pending) return entry.pending;
  entry.pending = load(days)
    .then((data) => {
      cache.set(days, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      const e = cache.get(days);
      if (e) delete e.pending;
    });
  cache.set(days, entry);
  return entry.pending;
}

/** Fresh enough: return it. Stale: return it now and refresh behind the scenes. None yet: wait. */
async function stats(days, { fresh = false } = {}) {
  const hit = cache.get(days);
  if (fresh || !hit || !hit.data) return refresh(days);
  if (Date.now() - hit.at > CACHE_MS) refresh(days).catch(() => {});
  return { ...hit.data, staleSeconds: Math.round((Date.now() - hit.at) / 1000) };
}

// Keep the default view (7 days) warm.
const warm = () => refresh(7).catch((e) => console.error('warm-up failed:', e.message));
warm();
setInterval(warm, CACHE_MS);

http
  .createServer(async (req, res) => {
    if (!allowed(req.socket.remoteAddress)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/api/stats') {
        const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
        const data = await stats(days, { fresh: !!url.searchParams.get('fresh') });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify(data));
      }
      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
      }
      res.writeHead(404);
      res.end('Not found');
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message.slice(0, 300) }));
    }
  })
  .listen(PORT, '0.0.0.0', () => console.log(`yelnats dashboard on http://192.168.4.22:${PORT}`));

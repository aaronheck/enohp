#!/usr/bin/env node
// Makes link previews for each puzzle: public/og/<n>.png (1200x630 card with that
// puzzle's waveform, no answer) and public/p/<n>.html (preview tags for iMessage,
// WhatsApp, Instagram etc., then straight into the game). Share links point at /p/<n>.
//   node scripts/make-previews.js [first] [last]      (default 1..60)
// Needs the puzzle audio in .daily-audio/ (scripts/generate-daily.js); puzzles without
// audio get a generic waveform.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright-core');

const ROOT = path.join(__dirname, '..');
const AUDIO = process.env.DAILY_AUDIO_DIR || path.join(ROOT, '.daily-audio');
const first = Number(process.argv[2]) || 1;
const last = Number(process.argv[3]) || 60;
const SITE = 'https://yelnatsgame.com';
// Puzzle #1's date (Pacific); must match the backend's DAILY_LAUNCH.
const LAUNCH = process.env.DAILY_LAUNCH || '2026-11-25';
const dateOf = (n, opts) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(new Date(Date.parse(`${LAUNCH}T12:00:00Z`) + (n - 1) * 86400000));
const longDate = (n) => dateOf(n, { weekday: 'long', month: 'short', day: 'numeric' });
const shortDate = (n) => dateOf(n, { weekday: 'short', month: 'short', day: 'numeric' });

const page = (n) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Yelnats Daily #${n} · ${shortDate(n)}: can you decode it?</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Say it backwards. Hear it forwards. A new backwards puzzle every day." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Yelnats" />
<meta property="og:title" content="Yelnats Daily #${n} · ${longDate(n)} 🔊" />
<meta property="og:description" content="Say it backwards. Hear it forwards. A new backwards puzzle every day." />
<meta property="og:url" content="${SITE}/p/${n}" />
<meta property="og:image" content="${SITE}/og/${n}.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${SITE}/og/${n}.png" />
<meta name="theme-color" content="#0f3a2d" />
<link rel="canonical" href="${SITE}/p/${n}" />
<meta http-equiv="refresh" content="0; url=/puzzle/${n}?from=link" />
<script>location.replace('/puzzle/${n}?from=link');</script>
<style>body{margin:0;background:#0f3a2d;color:#fff4dc;font:700 20px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}</style>
</head>
<body><a href="/puzzle/${n}" style="color:#ffd84d">Open Yelnats Daily #${n} →</a></body>
</html>
`;

const card = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=block" rel="stylesheet">
<style>html,body{margin:0}canvas{display:block}</style></head>
<body><canvas id="c" width="1200" height="630"></canvas>
<script>
window.draw = async (n, b64, date) => {
  await document.fonts.load('800 100px "Bricolage Grotesque"');
  await document.fonts.load('600 40px "Bricolage Grotesque"');
  let peaks;
  if (b64) {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
    const buf = await ctx.decodeAudioData(bytes);
    const d = buf.getChannelData(0), count = 46, size = Math.floor(d.length / count);
    peaks = [];
    for (let i = 0; i < count; i++) { let s = 0; for (let j = i * size; j < (i + 1) * size; j++) s += d[j] * d[j]; peaks.push(Math.sqrt(s / size)); }
    const m = Math.max(...peaks); peaks = peaks.map((p) => p / m);
  } else {
    peaks = Array.from({ length: 46 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.7 + n)) * Math.sin(Math.PI * i / 45));
  }
  const g = document.getElementById('c').getContext('2d');
  const F = '"Bricolage Grotesque", system-ui, sans-serif';
  g.fillStyle = '#0f3a2d'; g.fillRect(0, 0, 1200, 630);
  g.fillStyle = '#ffd84d'; g.font = '800 34px ' + F; g.fillText(date.toUpperCase(), 72, 112);
  g.fillStyle = '#fff4dc'; g.font = '800 150px ' + F; g.fillText('#' + n, 64, 262); const w = g.measureText('#' + n).width; g.fillStyle = 'rgba(255,244,220,0.62)'; g.font = '800 40px ' + F; g.fillText('YELNATS DAILY', 64 + w + 28, 250);
  g.fillStyle = '#fff4dc'; g.font = '800 64px ' + F; g.fillText('Can you decode it?', 72, 352);
  g.fillStyle = 'rgba(255,244,220,0.62)'; g.font = '600 34px ' + F; g.fillText('Say it backwards. Hear it forwards. 🔊', 72, 410);
  // waveform card
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = '#15493a'; rr(64, 450, 1072, 130, 32); g.fill();
  const left = 110, span = 980, bw = span / peaks.length, mid = 515;
  peaks.forEach((p, i) => { const h = Math.max(8, p * 100); g.fillStyle = i < peaks.length * 0.45 ? '#ffd84d' : 'rgba(255,244,220,0.4)'; rr(left + i * bw + bw * 0.2, mid - h / 2, bw * 0.6, h, Math.min(5, bw * 0.3)); g.fill(); });
  g.fillStyle = '#ffd84d'; rr(800, 70, 336, 84, 42); g.fill();
  g.fillStyle = '#0a2a20'; g.font = '800 34px ' + F; g.textAlign = 'center'; g.fillText('yelnatsgame.com', 968, 124); g.textAlign = 'left';
  return document.getElementById('c').toDataURL('image/png');
};
</script></body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(card, { waitUntil: 'networkidle' });
  for (let n = first; n <= last; n++) {
    const mp3 = path.join(AUDIO, 'daily', String(n), 'Kevin-puzzle.mp3');
    const b64 = fs.existsSync(mp3) ? fs.readFileSync(mp3).toString('base64') : null;
    const url = await p.evaluate(([num, data, date]) => window.draw(num, data, date), [n, b64, longDate(n)]);
    fs.writeFileSync(path.join(ROOT, 'public/og', `${n}.png`), Buffer.from(url.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(ROOT, 'public/p', `${n}.html`), page(n));
    process.stdout.write(`${n}${b64 ? '' : '(generic)'} `);
  }
  await browser.close();
  console.log('\ndone');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

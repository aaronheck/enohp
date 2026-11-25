// Serves a production build (built with REACT_APP_API_BASE=/mock-api) together
// with the in-memory mock backend, for sharing a preview without touching AWS.
// Usage: npm run preview   (builds first; listens on 127.0.0.1:PREVIEW_PORT, default 8097)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle, PREFIX } = require('./mock-api');

const PORT = Number(process.env.PREVIEW_PORT || 8097);
const ROOT = path.resolve(process.env.PREVIEW_ROOT || path.join(__dirname, '..', 'build'));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

function serveFile(res, file) {
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  const immutable = file.includes(`${path.sep}static${path.sep}`);
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    if (req.url.startsWith(PREFIX)) return handle(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.resolve(ROOT, '.' + urlPath);
    if (file.startsWith(ROOT + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      return serveFile(res, file);
    }
    serveFile(res, path.join(ROOT, 'index.html')); // client-side routes
  })
  .listen(PORT, '127.0.0.1', () => console.log(`preview on http://127.0.0.1:${PORT}`));
